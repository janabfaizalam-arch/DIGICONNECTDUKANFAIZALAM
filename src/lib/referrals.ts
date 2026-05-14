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
