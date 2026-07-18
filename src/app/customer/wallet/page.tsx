import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getWalletBalance } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export default async function CustomerWalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await getCurrentUserRole(user);
  if (role !== "customer") redirect("/unauthorized");

  const balance = await getWalletBalance(user.id);
  const supabase = getSupabaseAdmin();
  const { data: txs } = supabase
    ? await supabase
        .from("wallet_transactions")
        .select("id, type, amount, description, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Wallet</h1>
      <p className="mt-4 text-3xl font-semibold">₹{balance.toFixed(2)}</p>
      <ul className="mt-10 divide-y divide-[var(--border)]">
        {(txs ?? []).map((tx) => (
          <li key={tx.id as string} className="flex justify-between gap-4 py-3 text-sm">
            <div>
              <p className="font-medium">{String(tx.type)}</p>
              <p className="text-[var(--muted)]">{String(tx.description)}</p>
            </div>
            <p className={Number(tx.amount) < 0 ? "text-red-700" : "text-teal-800"}>
              {Number(tx.amount) > 0 ? "+" : ""}
              {Number(tx.amount).toFixed(2)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
