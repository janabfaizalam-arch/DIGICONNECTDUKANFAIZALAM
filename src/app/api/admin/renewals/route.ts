import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { createRenewal, listRenewals } from "@/lib/renewals/renewals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");

const createSchema = z.object({
  applicationId: z.string().uuid(),
  renewalDate: isoDate,
  referenceNumber: z.string().trim().max(80).optional().nullable(),
  reminderDays: z.array(z.number().int().min(0).max(365)).min(1).max(10).optional(),
  notes: z.string().trim().max(300).optional().nullable(),
  customerMobile: z.string().trim().max(20).optional().nullable(),
});

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  return user && isAdminRole(role) ? user : null;
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ message: "Admin access required." }, { status: 403 });

  const url = new URL(request.url);
  const applicationId = url.searchParams.get("applicationId") || undefined;
  const status = url.searchParams.get("status");
  const result = await listRenewals({
    applicationId,
    status: status === "active" || status === "renewed" || status === "cancelled" ? status : "all",
  });
  if (!result.ok) {
    return NextResponse.json({ message: result.error, upgradeRequired: result.upgradeRequired }, { status: 503 });
  }
  return NextResponse.json({ renewals: result.renewals });
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ message: "Admin access required." }, { status: 403 });

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid renewal." }, { status: 400 });
  }

  const result = await createRenewal({ ...parsed.data, createdBy: user.id });
  if (!result.ok) return NextResponse.json({ message: result.error }, { status: result.status });

  revalidatePath("/admin/renewals");
  revalidatePath(`/admin/applications/${parsed.data.applicationId}`);
  return NextResponse.json({ message: "Renewal reminder saved.", renewal: result.renewal }, { status: 201 });
}
