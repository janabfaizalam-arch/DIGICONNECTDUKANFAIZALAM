import { redirect } from "next/navigation";

import { LeadOperationsWorkspace } from "@/components/admin/lead-operations-workspace";
import { getCurrentUser, getCurrentUserRole, isActiveAgent } from "@/lib/auth";
import { listCanonicalLeads } from "@/lib/crm/leads";

export const dynamic = "force-dynamic";

export default async function PartnerLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    source?: string;
    service?: string;
    createdFrom?: string;
    createdTo?: string;
    followUp?: string;
    overdue?: string;
    page?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const role = await getCurrentUserRole(user);
  const params = await searchParams;
  const followUp =
    params.followUp === "today" || params.followUp === "upcoming" || params.followUp === "overdue"
      ? params.followUp
      : params.overdue === "1"
        ? "overdue"
        : "all";

  const result = await listCanonicalLeads({
    actorId: user.id,
    actorRole: role ?? "agency_partner",
    q: params.q,
    stage: params.stage ?? "all",
    source: params.source ?? "all",
    service: params.service ?? "all",
    createdFrom: params.createdFrom,
    createdTo: params.createdTo,
    assignee: "all",
    followUpQueue: followUp,
    page: Number(params.page ?? 1),
    pageSize: 25,
  });

  if (!result.ok) redirect("/ap");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">Digi Partner</p>
          <h1 className="text-2xl font-bold">Your leads</h1>
          <p className="text-sm text-slate-600">Scoped to your ownership only. No cross-partner data.</p>
        </div>
        <LeadOperationsWorkspace
          mode="partner"
          initialLeads={result.leads}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          kpis={result.kpis}
          query={{
            q: params.q ?? "",
            stage: params.stage ?? "all",
            source: params.source ?? "all",
            service: params.service ?? "all",
            createdFrom: params.createdFrom ?? "",
            createdTo: params.createdTo ?? "",
            assignee: "all",
            followUp,
          }}
        />
      </div>
    </main>
  );
}
