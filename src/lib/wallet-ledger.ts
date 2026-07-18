import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureWallet } from "@/lib/wallet";

export async function creditSignupBonus(userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  await ensureWallet(userId);
  const { data, error } = await supabase.rpc("credit_signup_bonus", { p_user_id: userId });
  if (error) {
    console.error("[wallet] signup bonus failed", error.message);
    return null;
  }
  return data;
}

export async function postWalletTransaction(input: {
  userId: string;
  type: string;
  amount: number;
  idempotencyKey: string;
  description?: string;
  applicationId?: string | null;
  paymentId?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("post_wallet_transaction", {
    p_user_id: input.userId,
    p_type: input.type,
    p_amount: input.amount,
    p_idempotency_key: input.idempotencyKey,
    p_description: input.description ?? "",
    p_application_id: input.applicationId ?? null,
    p_payment_id: input.paymentId ?? null,
  });

  if (error) {
    console.error("[wallet] post failed", error.message);
    return null;
  }
  return data;
}
