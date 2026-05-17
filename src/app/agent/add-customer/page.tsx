import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

import { AgentAddCustomerForm } from "@/components/agent/agent-add-customer-form";
import { Card } from "@/components/ui/card";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AgentAddCustomerPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login/agent");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Agent Workflow</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">Add Customer Lead</h1>
          <p className="mt-2 text-sm text-slate-600">Documents, payment proof, and customer details will be linked to your agent ID.</p>
        </div>
        <Card className="rounded-2xl p-4 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <UserPlus className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-950">Customer Details</h2>
          </div>
          <AgentAddCustomerForm />
        </Card>
      </div>
    </main>
  );
}
