"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import { useToast } from "@/components/providers/toast-provider";
import { LEAD_PIPELINE_STAGES, LEAD_SOURCES } from "@/lib/crm/leads-core";
import { formatFollowUpForDisplay } from "@/lib/crm/lead-workflow-core";

export type LeadWorkspaceRow = {
  id: string;
  name: string;
  mobile: string;
  mobileNormalized: string;
  service: string | null;
  leadSource: string;
  pipelineStage: string;
  assignedTo: string | null;
  nextFollowUpAt: string | null;
  overdue: boolean;
  lostReason: string | null;
  convertedApplicationId: string | null;
  createdAt: string | null;
};

type Props = {
  initialLeads: LeadWorkspaceRow[];
  total: number;
  page: number;
  pageSize: number;
  kpis: { overdue: number; unassigned: number; today: number; upcoming: number };
  query: {
    q: string;
    stage: string;
    source: string;
    service: string;
    createdFrom: string;
    createdTo: string;
    assignee: string;
    followUp: string;
  };
  mode?: "admin" | "partner";
};

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}`;
}

export function LeadOperationsWorkspace({
  initialLeads,
  total,
  page,
  pageSize,
  kpis,
  query,
  mode = "admin",
}: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<LeadWorkspaceRow | null>(null);
  const [stage, setStage] = useState("new");
  const [lostReason, setLostReason] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [note, setNote] = useState("");
  const [matchedCustomerId, setMatchedCustomerId] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Array<{ id: string; name: string; mobile: string; matchType: string }>>([]);
  const [history, setHistory] = useState<{
    activities: Array<Record<string, unknown>>;
    stages: Array<Record<string, unknown>>;
    assignments: Array<Record<string, unknown>>;
    followUps: Array<Record<string, unknown>>;
  } | null>(null);
  const [assignees, setAssignees] = useState<Array<{ id: string; label: string }>>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filters = useMemo(() => query, [query]);
  const basePath = mode === "partner" ? "/ap/leads" : "/admin/leads";

  function pushFilters(next: Partial<typeof filters> & { page?: number }) {
    const params = new URLSearchParams();
    const merged = { ...filters, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.stage && merged.stage !== "all") params.set("stage", merged.stage);
    if (merged.source && merged.source !== "all") params.set("source", merged.source);
    if (merged.service && merged.service !== "all") params.set("service", merged.service);
    if (merged.createdFrom) params.set("createdFrom", merged.createdFrom);
    if (merged.createdTo) params.set("createdTo", merged.createdTo);
    if (merged.assignee && merged.assignee !== "all") params.set("assignee", merged.assignee);
    if (merged.followUp && merged.followUp !== "all") params.set("followUp", merged.followUp);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    startTransition(() => router.push(`${basePath}?${params.toString()}`));
  }

  function openLead(lead: LeadWorkspaceRow) {
    setSelected(lead);
    setStage(lead.pipelineStage || "new");
    setLostReason(lead.lostReason || "");
    setFollowUp(lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 16) : "");
    setNote("");
    setMatchedCustomerId(null);
    setFormError("");
    setDuplicates([]);
    setHistory(null);
    setAssigneeId(lead.assignedTo || "");
    startTransition(async () => {
      try {
        const [dupRes, histRes, assignRes] = await Promise.all([
          fetch(
            `/api/admin/crm/leads/canonical/duplicates?mobile=${encodeURIComponent(lead.mobileNormalized || lead.mobile)}&service=${encodeURIComponent(lead.service || "")}`,
          ),
          fetch(`/api/admin/crm/leads/canonical/${lead.id}/history`),
          mode === "admin" ? fetch("/api/admin/crm/leads/canonical/assignees") : Promise.resolve(null),
        ]);
        if (dupRes.ok) {
          const data = await dupRes.json();
          setDuplicates((data.duplicates ?? []).filter((row: { id: string }) => row.id !== lead.id));
        }
        if (histRes.ok) {
          setHistory(await histRes.json());
        }
        if (assignRes && assignRes.ok) {
          const data = await assignRes.json();
          setAssignees(data.assignees ?? []);
        }
      } catch {
        // Advisory
      }
    });
  }

  function saveStage() {
    if (!selected || isPending) return;
    setFormError("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/crm/leads/canonical/${selected.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "transition",
            toStage: stage,
            lostReason: stage === "lost" ? lostReason : null,
            nextFollowUpAt: followUp ? new Date(followUp).toISOString() : null,
            note,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Stage update failed.");

        if (followUp) {
          await fetch("/api/admin/crm/leads/canonical/follow-ups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "schedule",
              leadId: selected.id,
              scheduledAt: new Date(followUp).toISOString(),
              note,
              idempotencyKey: newKey(),
            }),
          });
        }

        success("Lead updated.");
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Update failed.";
        setFormError(message);
        toastError(message);
      }
    });
  }

  function reassign() {
    if (!selected || mode !== "admin" || isPending) return;
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/crm/leads/canonical/${selected.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reassign",
            assigneeUserId: assigneeId || null,
            reason: reassignReason || "admin_reassignment",
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Reassignment failed.");
        success("Lead reassigned.");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Reassignment failed.");
      }
    });
  }

  function convertLead(linkCustomerId?: string | null) {
    if (!selected || isPending) return;
    if (!window.confirm("Convert this lead to a customer application?")) return;
    setFormError("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/crm/leads/canonical/${selected.id}/convert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotencyKey: newKey(),
            serviceSlug: selected.service,
            existingCustomerId: linkCustomerId || matchedCustomerId || null,
            createCustomerIfMissing: !(linkCustomerId || matchedCustomerId),
          }),
        });
        const data = await response.json();
        if (response.status === 409 && data.matchedCustomerId) {
          setMatchedCustomerId(String(data.matchedCustomerId));
          setFormError("Existing customer found. Confirm link to continue.");
          return;
        }
        if (!response.ok) throw new Error(data.error || "Conversion failed.");
        success(data.deduped ? "Already converted." : "Lead converted.");
        setSelected(null);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Conversion failed.";
        setFormError(message);
        toastError(message);
      }
    });
  }

  function createLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/crm/leads/canonical/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fd.get("name"),
            mobile: fd.get("mobile"),
            service: fd.get("service"),
            source: fd.get("source") || "manual",
            address: fd.get("address"),
            city: fd.get("city"),
            notes: fd.get("notes"),
            campaignAttribution: fd.get("campaign"),
            nextFollowUpAt: fd.get("followUp") ? new Date(String(fd.get("followUp"))).toISOString() : null,
            assigneeUserId: fd.get("assignee") || null,
            idempotencyKey: newKey(),
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not create lead.");
        success(data.deduped ? "Existing lead reused." : "Lead created.");
        setShowCreate(false);
        router.push(`${basePath}?q=${encodeURIComponent(String(data.leadId))}`);
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Create failed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
        </div>
        <button type="button" className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-left" onClick={() => pushFilters({ followUp: "overdue", page: 1 })}>
          <p className="text-xs font-bold uppercase text-orange-700">Overdue</p>
          <p className="mt-1 text-2xl font-bold text-orange-900">{kpis.overdue}</p>
        </button>
        <button type="button" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left" onClick={() => pushFilters({ followUp: "today", page: 1 })}>
          <p className="text-xs font-bold uppercase text-amber-700">Today</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{kpis.today}</p>
        </button>
        <button type="button" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left" onClick={() => pushFilters({ followUp: "upcoming", page: 1 })}>
          <p className="text-xs font-bold uppercase text-emerald-700">Upcoming</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{kpis.upcoming}</p>
        </button>
        {mode === "admin" ? (
          <button type="button" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left" onClick={() => pushFilters({ assignee: "unassigned", followUp: "all", page: 1 })}>
            <p className="text-xs font-bold uppercase text-blue-700">Unassigned</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{kpis.unassigned}</p>
          </button>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase text-slate-500">Scoped to you</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">No cross-partner data</p>
          </div>
        )}
      </section>

      {mode === "admin" ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white">
            New lead
          </button>
          <Link href="/admin/customers/walk-in" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-800">
            Walk-in application
          </Link>
          <button type="button" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-bold" onClick={() => pushFilters({ q: "", stage: "all", source: "all", service: "all", createdFrom: "", createdTo: "", assignee: "all", followUp: "all", page: 1 })}>
            Reset filters
          </button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          className="grid gap-3 lg:grid-cols-4 xl:grid-cols-8"
          onSubmit={(event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);
            pushFilters({
              q: String(fd.get("q") || ""),
              stage: String(fd.get("stage") || "all"),
              source: String(fd.get("source") || "all"),
              service: String(fd.get("service") || "all"),
              createdFrom: String(fd.get("createdFrom") || ""),
              createdTo: String(fd.get("createdTo") || ""),
              assignee: String(fd.get("assignee") || "all"),
              followUp: String(fd.get("followUp") || "all"),
              page: 1,
            });
          }}
        >
          <label className="relative col-span-2 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input name="q" defaultValue={filters.q} placeholder="Name, mobile, service, lead id/ref" className="h-10 pl-10" />
          </label>
          <select name="stage" defaultValue={filters.stage} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
            <option value="all">All stages</option>
            {LEAD_PIPELINE_STAGES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select name="source" defaultValue={filters.source} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
            <option value="all">All sources</option>
            {LEAD_SOURCES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <Input name="service" defaultValue={filters.service === "all" ? "" : filters.service} placeholder="Service" className="h-10" />
          <Input name="createdFrom" type="date" defaultValue={filters.createdFrom} className="h-10" />
          <Input name="createdTo" type="date" defaultValue={filters.createdTo} className="h-10" />
          {mode === "admin" ? (
            <select name="assignee" defaultValue={filters.assignee} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
              <option value="all">All owners</option>
              <option value="unassigned">Unassigned</option>
              <option value="me">Assigned to me</option>
            </select>
          ) : (
            <input type="hidden" name="assignee" value="all" />
          )}
          <select name="followUp" defaultValue={filters.followUp} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
            <option value="all">All follow-ups</option>
            <option value="overdue">Overdue</option>
            <option value="today">Today (IST)</option>
            <option value="upcoming">Upcoming</option>
          </select>
          <FormSubmitButton type="submit" loading={isPending} loadingText="Filtering..." className="h-10">
            Apply
          </FormSubmitButton>
        </form>
      </section>

      {!initialLeads.length ? (
        <AdminEmptyState title="No leads found" description="Try another filter or create a new lead." />
      ) : null}

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Mobile</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">Stage</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Follow-up (IST)</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {initialLeads.map((lead) => (
              <tr key={lead.id}>
                <td className="px-3 py-2 font-semibold text-slate-900">{lead.name}</td>
                <td className="px-3 py-2 font-mono text-slate-700">{lead.mobile}</td>
                <td className="px-3 py-2 text-slate-700">{lead.service || "—"}</td>
                <td className="px-3 py-2">{lead.pipelineStage}</td>
                <td className="px-3 py-2">{lead.leadSource}</td>
                <td className={`px-3 py-2 ${lead.overdue ? "font-bold text-orange-700" : "text-slate-600"}`}>
                  {formatFollowUpForDisplay(lead.nextFollowUpAt) || "—"}
                </td>
                <td className="px-3 py-2">
                  <button type="button" className="font-bold text-[var(--primary)] underline" onClick={() => openLead(lead)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {initialLeads.map((lead) => (
          <button key={lead.id} type="button" onClick={() => openLead(lead)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
            <p className="font-bold text-slate-900">{lead.name}</p>
            <p className="mt-1 font-mono text-sm text-slate-700">{lead.mobile}</p>
            <p className="mt-2 text-sm text-slate-600">
              {lead.pipelineStage} · {lead.leadSource}
              {lead.overdue ? " · Overdue" : ""}
            </p>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-600">Page {page} / {totalPages}</p>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1 || isPending} className="rounded-xl border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40" onClick={() => pushFilters({ page: page - 1 })}>
            Previous
          </button>
          <button type="button" disabled={page >= totalPages || isPending} className="rounded-xl border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40" onClick={() => pushFilters({ page: page + 1 })}>
            Next
          </button>
        </div>
      </div>

      {showCreate && mode === "admin" ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <form onSubmit={createLead} className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">New lead</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-sm font-bold text-slate-500">Close</button>
            </div>
            <Input name="name" required placeholder="Name" className="h-10" />
            <Input name="mobile" required placeholder="Mobile" className="h-10" />
            <Input name="service" placeholder="Service interest" className="h-10" />
            <select name="source" defaultValue="manual" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm">
              {LEAD_SOURCES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <Input name="city" placeholder="City" className="h-10" />
            <Input name="address" placeholder="Address (optional)" className="h-10" />
            <Input name="campaign" placeholder="Campaign / referral" className="h-10" />
            <Input name="followUp" type="datetime-local" className="h-10" />
            <Input name="notes" placeholder="Notes" className="h-10" />
            <FormSubmitButton type="submit" loading={isPending} className="w-full">Create lead</FormSubmitButton>
          </form>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-[var(--primary)]">Lead detail</p>
                <h3 className="text-xl font-bold text-slate-900">{selected.name}</h3>
                <p className="font-mono text-sm text-slate-700">{selected.mobile}</p>
                <p className="mt-1 text-xs text-slate-500">Ref: {selected.id}</p>
              </div>
              <button type="button" className="text-sm font-bold text-slate-500" onClick={() => setSelected(null)}>Close</button>
            </div>

            {duplicates.length ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-bold text-slate-900">Possible duplicates (advisory)</p>
                <ul className="mt-2 space-y-1">
                  {duplicates.slice(0, 5).map((row) => (
                    <li key={row.id}>{row.name} · {row.mobile} · {row.matchType}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-bold">Stage</span>
                <select value={stage} onChange={(e) => setStage(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3">
                  {LEAD_PIPELINE_STAGES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              {stage === "lost" ? (
                <label className="grid gap-1 text-sm">
                  <span className="font-bold">Lost reason</span>
                  <Input value={lostReason} onChange={(e) => setLostReason(e.target.value)} required />
                </label>
              ) : null}
              <label className="grid gap-1 text-sm">
                <span className="font-bold">Next follow-up (Asia/Kolkata display)</span>
                <Input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-bold">Note</span>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            </div>

            {mode === "admin" ? (
              <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-bold">Reassign</p>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
                  <option value="">Unassigned</option>
                  {assignees.map((row) => (
                    <option key={row.id} value={row.id}>{row.label}</option>
                  ))}
                </select>
                <Input value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} placeholder="Reason" className="h-10" />
                <FormSubmitButton type="button" loading={isPending} onClick={reassign}>Save assignee</FormSubmitButton>
              </div>
            ) : null}

            {history ? (
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="font-bold">Activity</p>
                  <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto text-slate-600">
                    {(history.activities ?? []).slice(0, 8).map((row) => (
                      <li key={String(row.id)}>
                        {formatFollowUpForDisplay(String(row.created_at ?? "")) || "—"} · {String(row.activity_type)} · {String(row.body ?? "")}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-bold">Assignments</p>
                  <ul className="mt-1 max-h-24 space-y-1 overflow-y-auto text-slate-600">
                    {(history.assignments ?? []).slice(0, 5).map((row) => (
                      <li key={String(row.id)}>
                        {formatFollowUpForDisplay(String(row.created_at ?? "")) || "—"} · {String(row.assignment_reason ?? "")}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-bold">Follow-ups</p>
                  <ul className="mt-1 max-h-24 space-y-1 overflow-y-auto text-slate-600">
                    {(history.followUps ?? []).slice(0, 5).map((row) => (
                      <li key={String(row.id)} className="flex items-center justify-between gap-2">
                        <span>
                          {formatFollowUpForDisplay(String(row.scheduled_at ?? "")) || "—"} · {String(row.status)}
                        </span>
                        {row.status === "scheduled" ? (
                          <button
                            type="button"
                            className="text-xs font-bold text-[var(--primary)]"
                            onClick={() => {
                              startTransition(async () => {
                                await fetch("/api/admin/crm/leads/canonical/follow-ups", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "complete", followUpId: row.id }),
                                });
                                openLead(selected);
                                router.refresh();
                              });
                            }}
                          >
                            Complete
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {formError ? <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-800">{formError}</p> : null}

            {matchedCustomerId ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-bold text-amber-950">Existing customer match</p>
                <FormSubmitButton type="button" className="mt-2" loading={isPending} onClick={() => convertLead(matchedCustomerId)}>
                  Link customer & convert
                </FormSubmitButton>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <FormSubmitButton type="button" loading={isPending} onClick={saveStage}>Save stage / follow-up</FormSubmitButton>
              {!selected.convertedApplicationId ? (
                <FormSubmitButton type="button" loading={isPending} onClick={() => convertLead(null)}>Convert</FormSubmitButton>
              ) : null}
              {selected.convertedApplicationId && mode === "admin" ? (
                <Link href={`/admin/applications/${selected.convertedApplicationId}`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-bold">
                  View application
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
