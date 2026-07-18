import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { createAndSendOtp } from "@/lib/auth/otp-store";
import { normalizeIndianPhone } from "@/lib/auth/phone";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  customerUserId: z.string().uuid().optional(),
  phone: z.string().optional(),
});

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(await getCurrentUserRole(admin))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = schema.parse(await request.json());
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  let phoneLocal = "";
  if (body.phone) {
    const phone = normalizeIndianPhone(body.phone);
    if (!phone.ok) return NextResponse.json({ error: phone.error }, { status: 400 });
    phoneLocal = phone.local;
  } else if (body.customerUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("mobile")
      .eq("id", body.customerUserId)
      .maybeSingle();
    phoneLocal = String(profile?.mobile ?? "");
  }

  const phone = normalizeIndianPhone(phoneLocal);
  if (!phone.ok) {
    return NextResponse.json({ error: "Customer phone missing" }, { status: 400 });
  }

  const result = await createAndSendOtp({
    phoneE164: phone.e164,
    phoneLocal: phone.local,
    purpose: "forgot_pin",
    ip: getClientIp(request),
    userAgent: getUserAgent(request),
    metadata: { triggeredByAdmin: admin.id },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
