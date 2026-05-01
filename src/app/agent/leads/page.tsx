import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { AgentLeadForm } from "@/components/agent-lead-form";
import { AgentLeadStatusForm } from "@/components/agent-lead-status-form";
import { Card } from "@/components/ui/card";
import { getAgentLeads } from "@/lib/agent-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { portalServices } from "@/lib/portal-data";
import { generateWhatsAppLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export default async function AgentLeadsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/agent");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const leads = await getAgentLeads(user.id);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Agent Leads</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-5xl">My Leads</h1>
          <p className="mt-3 max-w-2xl text-slate-600">Add new leads and update only the leads connected to your agent account.</p>
        </div>

        <Card className="rounded-2xl p-4 md:p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Add New Lead</h2>
          <AgentLeadForm services={portalServices.map((service) => service.title)} />
        </Card>

        <Card className="rounded-2xl p-4 md:p-6">
          <h2 className="text-lg font-bold text-slate-950">Lead List</h2>
          <div className="mt-4 grid gap-3">
            {leads.length ? (
              leads.map((lead) => (
                <div key={lead.id} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_160px_120px_160px] md:items-center">
                  <div>
                    <p className="font-bold text-slate-950">{lead.customer_name || lead.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{lead.service} | {lead.mobile}</p>
                    <p className="mt-1 text-xs text-slate-500">{lead.city || "City not added"} | {formatDate(lead.created_at)}</p>
                    {lead.notes || lead.message ? <p className="mt-2 text-sm text-slate-600">{lead.notes || lead.message}</p> : null}
                  </div>
                  <AgentLeadStatusForm leadId={lead.id} status={lead.status} />
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-center text-xs font-bold capitalize text-blue-700">
                    {lead.status.replace(/_/g, " ")}
                  </span>
                  <a
                    href={generateWhatsAppLink(lead.mobile, `Hello, this is DigiConnect Dukan regarding ${lead.service}.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No leads added yet.</p>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
