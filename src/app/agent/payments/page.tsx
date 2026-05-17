import { redirect } from "next/navigation";

import { PaymentBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { getAgentApplications, getAgentLeads } from "@/lib/agent-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { formatCurrency, paymentStatuses, type PaymentStatus } from "@/lib/portal-data";

export const dynamic = "force-dynamic";

function asPaymentStatus(value: unknown): PaymentStatus {
  return paymentStatuses.includes(value as PaymentStatus) ? (value as PaymentStatus) : "pending";
}

export default async function AgentPaymentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login/agent");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const [leads, applications] = await Promise.all([
    getAgentLeads(user.id, 500),
    getAgentApplications(user.id, 500),
  ]);

  const rows = [
    ...leads.map((lead) => ({
      id: `lead-${lead.id}`,
      title: lead.customer_name || lead.name,
      service: lead.service,
      amount: Number(lead.payment_amount ?? 0),
      status: asPaymentStatus(lead.payment_status),
      reference: lead.payment_reference || "-",
    })),
    ...applications.map((application) => ({
      id: `app-${application.id}`,
      title: application.service_name,
      service: "Application",
      amount: Number(application.amount ?? 0),
      status: asPaymentStatus(application.payment_status || application.payments?.[0]?.status),
      reference: application.razorpay_payment_id || "-",
    })),
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Payments</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">Payment Status</h1>
        </div>
        <div className="grid gap-3">
          {rows.length ? rows.map((row) => (
            <Card key={row.id} className="rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-950">{row.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{row.service}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">{row.reference}</p>
                </div>
                <PaymentBadge status={row.status} />
              </div>
              <p className="mt-3 text-lg font-bold text-slate-950">{formatCurrency(row.amount)}</p>
            </Card>
          )) : <Card className="rounded-2xl p-6 text-sm text-slate-600">No payment records yet.</Card>}
        </div>
      </div>
    </main>
  );
}
