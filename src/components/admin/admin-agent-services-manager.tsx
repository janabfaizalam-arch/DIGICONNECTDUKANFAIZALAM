"use client";

import { useMemo, useState, useTransition } from "react";
import { Edit3, Plus, Search, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { payoutForAgentService, type AgentService, type AgentServiceSource } from "@/lib/agent-services";
import type { PortalUser } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

type Draft = {
  id?: string;
  service_id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  customer_fee: string;
  agent_payout: string;
  payout_type: "fixed" | "percentage";
  payout_percentage: string;
  required_documents: string;
  processing_time: string;
  instructions: string;
  is_active: boolean;
  is_featured: boolean;
  visibility_type: "all" | "selected_agents" | "selected_groups";
  sort_order: string;
  assigned_agent_ids: string[];
};

const emptyDraft: Draft = {
  service_id: "",
  slug: "",
  title: "",
  description: "",
  category: "",
  customer_fee: "0",
  agent_payout: "0",
  payout_type: "fixed",
  payout_percentage: "0",
  required_documents: "",
  processing_time: "",
  instructions: "",
  is_active: true,
  is_featured: false,
  visibility_type: "all",
  sort_order: "0",
  assigned_agent_ids: [],
};

function draftFromService(service: AgentService): Draft {
  return {
    id: service.id,
    service_id: service.service_id ?? "",
    slug: service.slug,
    title: service.title,
    description: service.description ?? "",
    category: service.category ?? "",
    customer_fee: String(service.customer_fee ?? 0),
    agent_payout: String(service.agent_payout ?? 0),
    payout_type: service.payout_type,
    payout_percentage: String(service.payout_percentage ?? 0),
    required_documents: service.required_documents ?? "",
    processing_time: service.processing_time ?? "",
    instructions: service.instructions ?? "",
    is_active: service.is_active,
    is_featured: service.is_featured,
    visibility_type: service.visibility_type,
    sort_order: String(service.sort_order ?? 0),
    assigned_agent_ids: service.assigned_agent_ids ?? [],
  };
}

function payloadFromDraft(draft: Draft) {
  return {
    service_id: draft.service_id || null,
    slug: draft.slug,
    title: draft.title,
    description: draft.description,
    category: draft.category,
    customer_fee: Number(draft.customer_fee || 0),
    agent_payout: Number(draft.agent_payout || 0),
    payout_type: draft.payout_type,
    payout_percentage: Number(draft.payout_percentage || 0),
    required_documents: draft.required_documents,
    processing_time: draft.processing_time,
    instructions: draft.instructions,
    is_active: draft.is_active,
    is_featured: draft.is_featured,
    visibility_type: draft.visibility_type,
    sort_order: Number(draft.sort_order || 0),
    assigned_agent_ids: draft.assigned_agent_ids,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

export function AdminAgentServicesManager({
  services,
  sourceServices,
  agents,
}: {
  services: AgentService[];
  sourceServices: AgentServiceSource[];
  agents: PortalUser[];
}) {
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(services);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const categories = useMemo(() => [...new Set(items.map((item) => item.category).filter(Boolean))] as string[], [items]);
  const payoutPreview = draft
    ? payoutForAgentService({
        customer_fee: Number(draft.customer_fee || 0),
        agent_payout: Number(draft.agent_payout || 0),
        payout_type: draft.payout_type,
        payout_percentage: Number(draft.payout_percentage || 0),
      })
    : 0;

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !query || `${item.title} ${item.slug} ${item.category ?? ""}`.toLowerCase().includes(query);
      const matchesCategory = category === "all" || item.category === category;
      const matchesActive = activeFilter === "all" || (activeFilter === "active" ? item.is_active : !item.is_active);
      return matchesSearch && matchesCategory && matchesActive;
    });
  }, [activeFilter, category, items, search]);

  function applySourceService(sourceId: string) {
    const source = sourceServices.find((item) => item.id === sourceId);
    if (!source) return;

    setDraft((current) => ({
      ...(current ?? emptyDraft),
      service_id: source.id,
      slug: source.slug,
      title: source.name,
      description: source.description ?? "",
      customer_fee: String(source.amount ?? 0),
      agent_payout: String(source.commission_amount ?? 0),
      payout_type: source.commission_rate ? "percentage" : "fixed",
      payout_percentage: String(source.commission_rate ?? 0),
      required_documents: Array.isArray(source.required_documents) ? source.required_documents.join("\n") : "",
      is_active: Boolean(source.active ?? true),
    }));
  }

  function saveDraft() {
    if (!draft) return;
    const endpoint = draft.id ? `/api/admin/agent-services/${draft.id}` : "/api/admin/agent-services";
    const method = draft.id ? "PATCH" : "POST";

    startTransition(async () => {
      try {
        const response = await fetch(endpoint, {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payloadFromDraft(draft)),
        });
        const result = (await response.json()) as { message?: string; serviceId?: string };
        if (!response.ok) throw new Error(result.message ?? "Agent service could not be saved.");
        success(result.message ?? "Agent service saved.");
        const refreshed = await fetch("/api/admin/agent-services", { cache: "no-store" }).then((res) => res.json()) as { services: AgentService[] };
        setItems(refreshed.services ?? []);
        setDraft(null);
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Agent service could not be saved.");
      }
    });
  }

  function quickToggle(service: AgentService) {
    const next = draftFromService({ ...service, is_active: !service.is_active });
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/agent-services/${service.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payloadFromDraft(next)),
        });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(result.message ?? "Status could not be changed.");
        setItems((current) => current.map((item) => (item.id === service.id ? { ...item, is_active: !item.is_active } : item)));
        success(!service.is_active ? "Service enabled for agents." : "Service disabled for agents.");
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Status could not be changed.");
      }
    });
  }

  function disableService(service: AgentService) {
    if (!window.confirm(`Disable ${service.title} for agents?`)) return;
    startTransition(async () => {
      const response = await fetch(`/api/admin/agent-services/${service.id}`, { method: "DELETE" });
      if (response.ok) {
        setItems((current) => current.map((item) => (item.id === service.id ? { ...item, is_active: false } : item)));
        success("Agent service disabled.");
      } else {
        toastError("Agent service could not be disabled.");
      }
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_26rem]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search agent services..." className="h-11 pl-11" />
          </label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" onClick={() => setDraft(emptyDraft)} className="h-11 gap-2">
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>

        {!visibleItems.length ? <div className="mt-4"><AdminEmptyState title="No agent services found" description="Create one or adjust your filters." /></div> : null}

        <div className="mt-4 grid gap-3">
          {visibleItems.map((service) => (
            <article key={service.id} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold text-slate-950">{service.title}</p>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", service.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                      {service.is_active ? "Active" : "Inactive"}
                    </span>
                    {service.is_featured ? <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">Featured</span> : null}
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-500">{service.slug}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{service.description || "No description added."}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Fee {formatMoney(service.customer_fee)}</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Payout {formatMoney(payoutForAgentService(service))}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{service.visibility_type.replace(/_/g, " ")}</span>
                    {service.category ? <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-700">{service.category}</span> : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => quickToggle(service)} disabled={isPending} className="gap-2">
                    {service.is_active ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4" />}
                    {service.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDraft(draftFromService(service))} className="gap-2">
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button type="button" variant="outline" onClick={() => disableService(service)} className="gap-2 text-red-600">
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        {draft ? (
          <div className="grid gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-orange-600">{draft.id ? "Edit Service" : "Create Service"}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">Agent service setup</p>
            </div>

            <Select value={draft.service_id || "manual"} onValueChange={(value) => value !== "manual" && applySourceService(value)}>
              <SelectTrigger><SelectValue placeholder="Start from service catalog" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual service</SelectItem>
                {sourceServices.map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value, slug: draft.slug || slugify(event.target.value) })} placeholder="Agent display title" />
            <Input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: slugify(event.target.value) })} placeholder="service-slug" />
            <Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Description shown to agents" />
            <Textarea value={draft.instructions} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} placeholder="Agent instructions" />
            <Textarea value={draft.required_documents} onChange={(event) => setDraft({ ...draft, required_documents: event.target.value })} placeholder="Required documents text" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Category" />
              <Input value={draft.processing_time} onChange={(event) => setDraft({ ...draft, processing_time: event.target.value })} placeholder="Processing time" />
              <Input value={draft.customer_fee} onChange={(event) => setDraft({ ...draft, customer_fee: event.target.value })} inputMode="decimal" placeholder="Customer fee" />
              <Input value={draft.agent_payout} onChange={(event) => setDraft({ ...draft, agent_payout: event.target.value })} inputMode="decimal" placeholder="Agent payout" />
              <Select value={draft.payout_type} onValueChange={(value: "fixed" | "percentage") => setDraft({ ...draft, payout_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
              <Input value={draft.payout_percentage} onChange={(event) => setDraft({ ...draft, payout_percentage: event.target.value })} inputMode="decimal" placeholder="Payout %" disabled={draft.payout_type !== "percentage"} />
              <Input value={draft.sort_order} onChange={(event) => setDraft({ ...draft, sort_order: event.target.value })} inputMode="numeric" placeholder="Sort order" />
              <Select value={draft.visibility_type} onValueChange={(value: Draft["visibility_type"]) => setDraft({ ...draft, visibility_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  <SelectItem value="selected_agents">Selected agents only</SelectItem>
                  <SelectItem value="selected_groups">Selected groups</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {draft.visibility_type === "selected_agents" ? (
              <div className="rounded-2xl border border-slate-100 p-3">
                <p className="text-sm font-bold text-slate-950">Assigned agents</p>
                <div className="mt-3 grid max-h-52 gap-2 overflow-y-auto pr-1">
                  {agents.map((agent) => (
                    <label key={agent.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.assigned_agent_ids.includes(agent.id)}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...draft.assigned_agent_ids, agent.id]
                            : draft.assigned_agent_ids.filter((id) => id !== agent.id);
                          setDraft({ ...draft, assigned_agent_ids: next });
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-slate-800">{agent.full_name || agent.email}</span>
                        <span className="block truncate text-xs text-slate-500">{agent.mobile || agent.email}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {draft.visibility_type === "selected_groups" ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Agent groups are not configured in this workspace yet. This visibility type is saved for future group support and will not expose the service unless group logic is added.
              </div>
            ) : null}

            <div className="grid gap-2 rounded-2xl bg-blue-50 p-4 text-sm">
              <p className="font-bold text-slate-950">Payout preview</p>
              <p className="text-2xl font-bold text-blue-700">{formatMoney(payoutPreview)}</p>
              <p className="text-slate-600">Customer fee: {formatMoney(Number(draft.customer_fee || 0))}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm font-bold">
                <input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} />
                Active
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm font-bold">
                <input type="checkbox" checked={draft.is_featured} onChange={(event) => setDraft({ ...draft, is_featured: event.target.checked })} />
                Featured
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="button" onClick={saveDraft} disabled={isPending || !draft.title} className="flex-1">
                {isPending ? "Saving..." : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDraft(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="font-bold text-slate-950">Select a service to edit</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Create or update agent-only service settings without changing public customer services.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
