import Link from "next/link";
import { redirect } from "next/navigation";

import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { getAgentAssignedApplications } from "@/lib/agent-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getCustomerMobile, getCustomerName } from "@/lib/crm";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export default async function AgentAssignedWorkPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login/agent");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const applications = await getAgentAssignedApplications(user.id);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Agent Work</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-5xl">Assigned Work</h1>
          <p className="mt-3 max-w-2xl text-slate-600">Applications assigned to you by admin for processing.</p>
        </div>

        <Card className="rounded-2xl p-4 md:p-6">
          <div className="grid gap-3">
            {applications.length ? applications.map((application) => (
              <Link key={application.id} href={`/agent/applications/${application.id}`} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_150px_150px_150px] md:items-center">
                <div>
                  <p className="font-bold text-slate-950">{getCustomerName(application)}</p>
                  <p className="mt-1 text-sm text-slate-600">{application.service_name} | {getCustomerMobile(application) || "No mobile"}</p>
                  <p className="mt-1 text-sm text-slate-600">{application.customer_message || "No customer message yet."}</p>
                </div>
                <p className="text-sm font-medium text-slate-600">{formatDate(application.created_at)}</p>
                <StatusBadge status={application.status} />
                <PaymentBadge status={application.payment_status ?? application.payments?.[0]?.status ?? "pending"} />
              </Link>
            )) : <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No work assigned yet.</p>}
          </div>
        </Card>
      </div>
    </main>
  );
}
