import { generateOtp, generateSecureToken, hashOtp, hashToken, verifyOtpHash } from "@/lib/auth/pin";
import type { OtpPurpose } from "@/lib/auth/whatsapp-otp";
import { sendCustomerWhatsappOtp } from "@/lib/auth/whatsapp-otp";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_PER_PHONE_HOUR = 5;
const MAX_PER_IP_HOUR = 10;

function metadataDeliveryStatus(row: { metadata?: unknown } | null | undefined): string | null {
  const meta = row?.metadata;
  if (!meta || typeof meta !== "object") return null;
  const status = (meta as Record<string, unknown>).delivery_status;
  return typeof status === "string" ? status : null;
}

export async function createAndSendOtp(input: {
  phoneE164: string;
  phoneLocal: string;
  purpose: OtpPurpose;
  ip: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: true; requestId?: string; campaignName?: string } | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("[otp] supabase_admin_missing", { purpose: input.purpose });
    return { ok: false, error: "Service unavailable", status: 503 };
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Count only non-failed deliveries so provider outages do not burn the hourly quota.
  const [{ data: phoneRows }, { data: ipRows }] = await Promise.all([
    supabase
      .from("auth_otp_requests")
      .select("id, metadata")
      .eq("phone", input.phoneLocal)
      .eq("purpose", input.purpose)
      .gte("created_at", hourAgo),
    supabase
      .from("auth_otp_requests")
      .select("id, metadata")
      .eq("ip_address", input.ip)
      .gte("created_at", hourAgo),
  ]);

  const phoneCount = (phoneRows ?? []).filter((row) => metadataDeliveryStatus(row) !== "failed").length;
  const ipCount = (ipRows ?? []).filter((row) => metadataDeliveryStatus(row) !== "failed").length;

  if (phoneCount >= MAX_PER_PHONE_HOUR) {
    console.warn("[otp] rate_limit_phone", { purpose: input.purpose, phoneCount });
    return { ok: false, error: "Too many OTP requests. Please try again later.", status: 429 };
  }
  if (ipCount >= MAX_PER_IP_HOUR) {
    console.warn("[otp] rate_limit_ip", { purpose: input.purpose, ipCount });
    return { ok: false, error: "Too many OTP requests from this network.", status: 429 };
  }

  const { data: latest } = await supabase
    .from("auth_otp_requests")
    .select("created_at, metadata")
    .eq("phone", input.phoneLocal)
    .eq("purpose", input.purpose)
    .is("invalidated_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.created_at && metadataDeliveryStatus(latest) !== "failed") {
    const elapsed = Date.now() - new Date(latest.created_at).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return { ok: false, error: `Resend OTP in ${wait}s.`, status: 429 };
    }
  }

  await supabase
    .from("auth_otp_requests")
    .update({ invalidated_at: new Date().toISOString() })
    .eq("phone", input.phoneLocal)
    .eq("purpose", input.purpose)
    .is("invalidated_at", null)
    .is("verified_at", null);

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from("auth_otp_requests")
    .insert({
      phone: input.phoneLocal,
      purpose: input.purpose,
      otp_hash: otpHash,
      expires_at: expiresAt,
      ip_address: input.ip,
      user_agent: input.userAgent,
      metadata: { ...(input.metadata ?? {}), delivery_status: "pending" },
    })
    .select("id")
    .maybeSingle();

  if (insertError || !inserted?.id) {
    console.error("[otp] insert_failed", {
      purpose: input.purpose,
      error: insertError?.message,
      code: insertError?.code,
      details: insertError?.details,
    });
    return { ok: false, error: "Unable to create OTP", status: 500 };
  }

  console.info("[otp] generated_and_stored", {
    purpose: input.purpose,
    otpRequestId: inserted.id,
    expiresAt,
  });

  const sendResult = await sendCustomerWhatsappOtp(input.phoneE164, otp, input.purpose);
  if (!sendResult.success) {
    await supabase
      .from("auth_otp_requests")
      .update({
        invalidated_at: new Date().toISOString(),
        metadata: {
          ...(input.metadata ?? {}),
          delivery_status: "failed",
          provider: sendResult.provider,
          campaign: sendResult.campaignName ?? null,
          provider_code: sendResult.code ?? null,
          provider_request_id: sendResult.requestId ?? null,
          provider_http_status: sendResult.httpStatus ?? null,
          provider_detail: sendResult.providerDetail ?? null,
        },
      })
      .eq("id", inserted.id);

    console.error("[otp] provider_send_failed", {
      purpose: input.purpose,
      otpRequestId: inserted.id,
      provider: sendResult.provider,
      campaign: sendResult.campaignName,
      code: sendResult.code,
      requestId: sendResult.requestId,
      httpStatus: sendResult.httpStatus,
      providerDetail: sendResult.providerDetail,
    });

    return {
      ok: false,
      error: "Unable to send OTP. Please try again in a few minutes.",
      status: 502,
    };
  }

  await supabase
    .from("auth_otp_requests")
    .update({
      metadata: {
        ...(input.metadata ?? {}),
        delivery_status: "sent",
        provider: sendResult.provider ?? "aisensy",
        campaign: sendResult.campaignName ?? null,
        provider_request_id: sendResult.requestId ?? null,
      },
    })
    .eq("id", inserted.id);

  console.info("[otp] provider_send_accepted", {
    purpose: input.purpose,
    otpRequestId: inserted.id,
    provider: sendResult.provider,
    campaign: sendResult.campaignName,
    requestId: sendResult.requestId,
  });

  return { ok: true, requestId: sendResult.requestId, campaignName: sendResult.campaignName };
}

export async function verifyOtpRequest(input: {
  phoneLocal: string;
  purpose: OtpPurpose;
  otp: string;
}): Promise<
  | { ok: true; requestId: string; verificationToken: string; metadata: Record<string, unknown> }
  | { ok: false; error: string; status: number }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("[otp] verify_supabase_admin_missing", { purpose: input.purpose });
    return { ok: false, error: "Service unavailable", status: 503 };
  }

  const { data: row, error: lookupError } = await supabase
    .from("auth_otp_requests")
    .select("*")
    .eq("phone", input.phoneLocal)
    .eq("purpose", input.purpose)
    .is("invalidated_at", null)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[otp] verify_lookup_failed", {
      purpose: input.purpose,
      error: lookupError.message,
      code: lookupError.code,
    });
    return { ok: false, error: "Unable to verify OTP", status: 500 };
  }

  if (!row) {
    console.warn("[otp] verify_no_active_request", { purpose: input.purpose });
    return { ok: false, error: "OTP invalid ya expire ho gaya.", status: 400 };
  }

  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    await supabase.from("auth_otp_requests").update({ invalidated_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: false, error: "OTP expire ho gaya. Naya OTP maangein.", status: 400 };
  }

  if (Number(row.attempts ?? 0) >= MAX_ATTEMPTS) {
    await supabase.from("auth_otp_requests").update({ invalidated_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: false, error: "Zyada galat attempts. Naya OTP maangein.", status: 429 };
  }

  const valid = verifyOtpHash(input.otp, String(row.otp_hash));
  if (!valid) {
    await supabase
      .from("auth_otp_requests")
      .update({ attempts: Number(row.attempts ?? 0) + 1 })
      .eq("id", row.id);
    console.warn("[otp] verify_mismatch", {
      purpose: input.purpose,
      otpRequestId: row.id,
      attempts: Number(row.attempts ?? 0) + 1,
    });
    return { ok: false, error: "Galat OTP. Dobara try karein.", status: 400 };
  }

  const verificationToken = generateSecureToken();
  const tokenHash = hashToken(verificationToken);
  const now = new Date().toISOString();

  await supabase
    .from("auth_otp_requests")
    .update({
      verified_at: now,
      invalidated_at: now,
      verification_token_hash: tokenHash,
    })
    .eq("id", row.id);

  console.info("[otp] verify_success", {
    purpose: input.purpose,
    otpRequestId: row.id,
  });

  return {
    ok: true,
    requestId: String(row.id),
    verificationToken,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

export async function consumeVerificationToken(input: {
  phoneLocal: string;
  purpose: OtpPurpose;
  verificationToken: string;
}): Promise<{ ok: true; metadata: Record<string, unknown> } | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: "Service unavailable", status: 503 };
  }

  const tokenHash = hashToken(input.verificationToken);
  const { data: row } = await supabase
    .from("auth_otp_requests")
    .select("*")
    .eq("phone", input.phoneLocal)
    .eq("purpose", input.purpose)
    .eq("verification_token_hash", tokenHash)
    .not("verified_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Session expire. OTP dobara verify karein.", status: 400 };
  }

  // one-time use
  await supabase
    .from("auth_otp_requests")
    .update({ verification_token_hash: null })
    .eq("id", row.id);

  return { ok: true, metadata: (row.metadata as Record<string, unknown>) ?? {} };
}
