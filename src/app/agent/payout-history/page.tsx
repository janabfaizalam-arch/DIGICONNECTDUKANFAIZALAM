import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getAgentCommissions } from "@/lib/agent-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";

export const dynamic = "force-dynamic";

export default async function AgentPayoutHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login/agent");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const payouts = (await getAgentCommissions(user.id, 500)).filter((commission) => commission.status === "paid");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Payouts</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">Payout History</h1>
        </div>
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
