import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type WalletRow = {
  id: string;
  user_id: string;
  balance: number;
};

export async function ensureWallet(userId: string): Promise<WalletRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("ensure_wallet", { p_user_id: userId });
  if (error || !data) {
    const { data: existing } = await supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle();
    if (existing) {
      return {
        id: existing.id as string,
        user_id: existing.user_id as string,
        balance: Number(existing.balance ?? 0),
      };
    }
    const { data: created } = await supabase
      .from("wallets")
      .insert({ user_id: userId, balance: 0 })
      .select("*")
      .maybeSingle();
    if (!created) return null;
    return {
      id: created.id as string,
      user_id: created.user_id as string,
      balance: Number(created.balance ?? 0),
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    balance: Number(row.balance ?? 0),
  };
}

export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await ensureWallet(userId);
  return wallet?.balance ?? 0;
}
