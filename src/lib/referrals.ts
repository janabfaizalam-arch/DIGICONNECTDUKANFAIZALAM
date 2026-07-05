import crypto from "crypto";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

const referralCodePattern = /^[A-Z0-9]{8,10}$/;

function getIpRiskFlags(ip?: string | null, userAgent?: string | null) {
  const flags: string[] = [];

  if (!ip) flags.push("missing_ip");
  if (!userAgent) flags.push("missing_user_agent");

  return flags;
}

export function generateReferralCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(9);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function normalizeReferralCode(code: string) {
  return code.replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase();
}

export async function ensureReferralCodeForUser(userId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const { data, error } = await supabase.rpc("ensure_referral_code_for_user", { p_user_id: userId });

  if (error) {
    throw error;
  }

  return String(data ?? "");
}

export async function validateReferralCode(code: string, currentUserId?: string | null) {
  const supabase = getSupabaseAdmin();
  const normalized = normalizeReferralCode(code);

  if (!normalized) {
    return { ok: false, code: normalized, message: "Referral code is required." };
  }

  if (!referralCodePattern.test(normalized)) {
    return { ok: false, code: normalized, message: "Referral code must be 8 to 10 uppercase letters or numbers." };
  }

  if (!supabase) {
    return { ok: false, code: normalized, message: "Referral validation is unavailable." };
  }

  const { data, error } = await supabase.from("profiles").select("id, referral_code").eq("referral_code", normalized).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    return { ok: false, code: normalized, message: "Referral code was not found. Please check it or clear the field." };
  }

  if (currentUserId && data.id === currentUserId) {
    return { ok: false, code: normalized, message: "You cannot use your own referral code." };
  }

  return { ok: true, code: normalized, referrerUserId: String(data.id), message: "" };
}

export async function calculateReferralRisk({
  referrerUserId,
  referredUserId,
  ip,
  userAgent,
}: {
  referrerUserId: string;
  referredUserId: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { score: 0, flags: getIpRiskFlags(ip, userAgent) };
  }

  const { data, error } = await supabase.rpc("calculate_referral_risk", {
    p_referrer_user_id: referrerUserId,
    p_referred_user_id: referredUserId,
    p_ip: ip ?? null,
    p_user_agent: userAgent ?? null,
  });

  if (error) {
    throw error;
  }

  const result = data as { score?: number; flags?: string[] } | null;

  return {
    score: Number(result?.score ?? 0),
    flags: Array.isArray(result?.flags) ? result.flags : [],
  };
}

export async function attachReferralOnSignup(newUserId: string, referralCode: string, ip?: string | null, userAgent?: string | null) {
  const supabase = getSupabaseAdmin();
  const normalized = normalizeReferralCode(referralCode);

  if (!normalized) {
    return null;
  }

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const validation = await validateReferralCode(normalized, newUserId);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const { data, error } = await supabase.rpc("attach_referral_on_signup", {
    p_referred_user_id: newUserId,
    p_referral_code: normalized,
    p_ip: ip ?? null,
    p_user_agent: userAgent ?? null,
  });

  if (error) {
    throw error;
  }

  return data;
}

const REFERRAL_SIGNING_SECRET = process.env.REFERRAL_SIGNING_SECRET || "default_referral_signing_secret_key";

export function signReferralToken(token: string, clickId: string, timestamp: number): string {
  return crypto
    .createHmac("sha256", REFERRAL_SIGNING_SECRET)
    .update(`${token}:${clickId || ""}:${timestamp}`)
    .digest("hex");
}

export function verifyReferralSignature(token: string, clickId: string, timestamp: number, signature: string): boolean {
  const expected = signReferralToken(token, clickId, timestamp);
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(signature, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function recordAttribution(params: {
  token: string;
  partnerId: string;
  customerId: string;
  deviceId?: string | null;
  source?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const {
    token,
    partnerId,
    customerId,
    deviceId,
    source,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
  } = params;

  // Prevent self-referral
  const { data: ap } = await supabase
    .from("agency_partners")
    .select("id")
    .eq("user_id", customerId)
    .maybeSingle();

  if (ap && ap.id === partnerId) {
    console.warn("[referrals] Blocking self-referral attribution for customer:", customerId);
    return null;
  }

  // Check if attribution already exists for this customer (First Valid Click Wins policy)
  const policy = process.env.REFERRAL_ATTRIBUTION_POLICY || "first_click";
  const { data: existing } = await supabase
    .from("referral_attributions")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (existing) {
    if (policy === "first_click") {
      // Preserve first click, update last click timestamp only
      const { data } = await supabase
        .from("referral_attributions")
        .update({
          last_click_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      return data;
    } else {
      // Overwrite for last click policy
      const { data } = await supabase
        .from("referral_attributions")
        .update({
          referral_token: token,
          partner_id: partnerId,
          device_id: deviceId || existing.device_id,
          last_click_at: new Date().toISOString(),
          source: source || existing.source,
          utm_source: utmSource || existing.utm_source,
          utm_medium: utmMedium || existing.utm_medium,
          utm_campaign: utmCampaign || existing.utm_campaign,
          utm_term: utmTerm || existing.utm_term,
          utm_content: utmContent || existing.utm_content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      return data;
    }
  }

  // Create new attribution record
  const { data, error } = await supabase
    .from("referral_attributions")
    .insert({
      referral_token: token,
      partner_id: partnerId,
      customer_id: customerId,
      device_id: deviceId || null,
      first_click_at: new Date().toISOString(),
      last_click_at: new Date().toISOString(),
      source: source || "web",
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      utm_term: utmTerm || null,
      utm_content: utmContent || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[referrals] Failed to insert referral attribution:", error);
  }

  return data;
}

