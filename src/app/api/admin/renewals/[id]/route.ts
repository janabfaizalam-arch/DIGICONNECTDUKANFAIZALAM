import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { sendRenewalReminderNow, updateRenewal } from "@/lib/renewals/renewals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.enum(["active", "renewed", "cancelled"]).optional(),
  renewalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.").optional(),
  referenceNumber: z.string().trim().max(80).optional().nullable(),
  reminderDays: z.array(z.number().int().min(0).max(365)).min(1).max(10).optional(),
  notes: z.string().trim().max(300).optional().nullable(),
});

async function isAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  return Boolean(user && isAdminRole(role));
}

/** Edit a renewal: mark renewed / cancelled, move the date (starts a new reminder cycle), etc. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  const { id } = await params;

  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid update." }, { status: 400 });
  }

  const result = await updateRenewal(id, parsed.data);
  if (!result.ok) return NextResponse.json({ message: result.error }, { status: result.status });

  revalidatePath("/admin/renewals");
  revalidatePath(`/admin/applications/${result.renewal.application_id}`);
  return NextResponse.json({ message: "Renewal updated.", renewal: result.renewal });
}

/** Send a reminder right now, outside the schedule. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  const { id } = await params;

  const outcome = await sendRenewalReminderNow(id);
  if (!outcome.ok) return NextResponse.json({ message: outcome.error }, { status: outcome.status });

  const { result } = outcome;
  revalidatePath("/admin/renewals");
  if (result.ok) return NextResponse.json({ message: "Renewal reminder sent on WhatsApp.", whatsappOk: true });
  return NextResponse.json(
    { message: result.error, code: result.code, whatsappOk: false, queued: result.queued ?? false },
    { status: result.code === "invalid_mobile" ? 400 : 200 },
  );
}
