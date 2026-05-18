import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getAgentCommissions } from "@/lib/agent-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AgentPayoutHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login/agent");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  const payouts = (await getAgentCommissions(user.id, 500)).filter((commission) => commission.status === "paid");
  const [{ data: payoutRequests }, { data: walletTransactions }] = supabase
    ? await Promise.all([
        supabase
          .from("payout_requests")
          .select("id, amount, status, transaction_id, payout_date, paid_at, requested_at")
          .eq("agent_id", user.id)
          .order("requested_at", { ascending: false })
          .limit(100),
        supabase
          .from("wallet_transactions")
          .select("id, amount, type, transaction_type, direction, note, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Wallet / Payout</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">Wallet & Payout History</h1>
        </div>
        <Card className="rounded-2xl p-4">
          <h2 className="font-bold text-slate-950">Payout Requests</h2>
          <div className="mt-3 grid gap-3">
            {payoutRequests?.length ? payoutRequests.map((request) => (
              <div key={request.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="font-bold text-slate-950">{formatCurrency(Number(request.amount ?? 0))}</p>
                <p className="mt-1 text-sm capitalize text-slate-600">{String(request.status ?? "pending").replace(/_/g, " ")}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">{request.transaction_id || "Transaction ID pending"}</p>
              </div>
            )) : <p className="text-sm text-slate-600">No payout requests yet.</p>}
          </div>
        </Card>
        <Card className="rounded-2xl p-4">
          <h2 className="font-bold text-slate-950">Wallet Ledger</h2>
          <div className="mt-3 grid gap-3">
            {walletTransactions?.length ? walletTransactions.map((transaction) => (
              <div key={transaction.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="font-bold text-slate-950">{formatCurrency(Number(transaction.amount ?? 0))}</p>
                <p className="mt-1 text-sm capitalize text-slate-600">
                  {String(transaction.type ?? transaction.transaction_type ?? transaction.direction ?? "entry").replace(/_/g, " ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">{transaction.note || transaction.created_at}</p>
              </div>
            )) : <p className="text-sm text-slate-600">No wallet ledger entries yet.</p>}
          </div>
        </Card>
        <div className="grid gap-3">
          {payouts.length ? payouts.map((commission) => (
            <Card key={commission.id} className="rounded-2xl p-4">
              <p className="text-xl font-bold text-slate-950">{formatCurrency(commission.amount)}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">{commission.payout_transaction_id || "Transaction ID not added"}</p>
              <p className="mt-1 text-sm text-slate-600">Paid: {commission.payout_date || commission.paid_at || "-"}</p>
              {commission.payout_proof_url ? (
                <a href={commission.payout_proof_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-bold text-blue-700">
                  View payout proof
                </a>
              ) : null}
            </Card>
          )) : <Card className="rounded-2xl p-6 text-sm text-slate-600">No paid payouts yet.</Card>}
        </div>
      </div>
    </main>
  );
}
