import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getAgentCustomers } from "@/lib/agent-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AgentCustomersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login/agent");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const customers = await getAgentCustomers(user.id, 500);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Agent Customers</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">My Customers</h1>
        </div>
        <div className="grid gap-3">
          {customers.length ? customers.map((customer) => (
            <Card key={customer.id} className="rounded-2xl p-4">
              <p className="font-bold text-slate-950">{customer.full_name}</p>
              <p className="mt-1 font-mono text-sm text-slate-600">{customer.mobile}</p>
              <p className="mt-1 text-sm text-slate-500">{customer.address || customer.city || "Address not added"}</p>
              {customer.notes ? <p className="mt-2 text-sm text-slate-600">{customer.notes}</p> : null}
            </Card>
          )) : <Card className="rounded-2xl p-6 text-sm text-slate-600">No customers yet.</Card>}
        </div>
      </div>
    </main>
  );
}
