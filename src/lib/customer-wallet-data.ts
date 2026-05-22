import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CustomerWalletTransaction = {
  id: string;
  type: string;
  direction: "credit" | "debit";
  amount: number;
  status: string;
  note: string | null;
  idempotency_key: string | null;
  application_id: string | null;
  created_at: string;
};

export type CustomerWalletData = {
  balance: number;
  totalEarned: number;
  totalUsed: number;
  transactions: CustomerWalletTransaction[];
};

function numberValue(value: unknown) {
  const nextValue = Number(value ?? 0);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

export async function getCustomerWalletData(userId: string): Promise<CustomerWalletData> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { balance: 0, totalEarned: 0, totalUsed: 0, transactions: [] };
  }

  const [walletResult, transactionsResult] = await Promise.all([
    supabase
      .from("reward_wallets")
      .select("balance, lifetime_earned, lifetime_redeemed")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("wallet_transactions")
      .select("id, type, direction, amount, status, note, idempotency_key, application_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (walletResult.error) {
    console.error("[customer-wallet] Wallet summary failed", { userId, error: walletResult.error });
  }

  if (transactionsResult.error) {
    console.error("[customer-wallet] Transactions failed", { userId, error: transactionsResult.error });
  }

  return {
    balance: numberValue(walletResult.data?.balance),
    totalEarned: numberValue(walletResult.data?.lifetime_earned),
    totalUsed: numberValue(walletResult.data?.lifetime_redeemed),
    transactions: (transactionsResult.data ?? []).map((transaction) => ({
      id: String(transaction.id),
      type: String(transaction.type ?? ""),
      direction: transaction.direction === "debit" ? "debit" : "credit",
      amount: numberValue(transaction.amount),
      status: String(transaction.status ?? "posted"),
      note: transaction.note ? String(transaction.note) : null,
      idempotency_key: transaction.idempotency_key ? String(transaction.idempotency_key) : null,
      application_id: transaction.application_id ? String(transaction.application_id) : null,
      created_at: String(transaction.created_at),
    })),
  };
}
