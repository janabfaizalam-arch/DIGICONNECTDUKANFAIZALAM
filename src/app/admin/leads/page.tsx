import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { LeadOperationsWorkspace } from "@/components/admin/lead-operations-workspace";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { listCanonicalLeads } from "@/lib/crm/leads";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    source?: string;
    service?: string;
    createdFrom?: string;
    createdTo?: string;
    assignee?: string;
    followUp?: string;
    overdue?: string;
    page?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const params = await searchParams;
  const followUp =
    params.followUp === "today" || params.followUp === "upcoming" || params.followUp === "overdue"
      ? params.followUp
      : params.overdue === "1"
        ? "overdue"
        : "all";

  const result = await listCanonicalLeads({
    actorId: user.id,
    actorRole: role,
    q: params.q,
    stage: params.stage ?? "all",
    source: params.source ?? "all",
    service: params.service ?? "all",
    createdFrom: params.createdFrom,
    createdTo: params.createdTo,
    assignee: (params.assignee as "all" | "unassigned" | "me" | string) ?? "all",
    followUpQueue: followUp,
    page: Number(params.page ?? 1),
    pageSize: 25,
  });

  if (!result.ok) redirect("/admin");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Leads"
        title="Lead operations"
        description="Canonical pipeline — create, search, follow-ups, reassign, convert. Server-paginated."
      />
      <LeadOperationsWorkspace
        mode="admin"
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
          assignee: params.assignee ?? "all",
          followUp,
        }}
      />
    </div>
  );
}
