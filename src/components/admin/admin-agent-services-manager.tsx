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

  // new V2 fields
  government_fee_type: "included" | "extra" | "not_applicable";
  government_fee_amount: string;
  processing_fee: string;
  eligibility: string;
  faq: Array<{ question: string; answer: string }>;
  terms: string;
  important_notes: string;
  popular: boolean;
  thumbnail: string;
  banner: string;
  supported_states: string[];
  supported_districts: string[];
  supported_pincodes: string[];
  variants: Array<{
    id: string;
    name: string;
    price: number;
    score: number;
    processing_time: string;
    government_fee?: string;
    required_documents?: Array<{
      id: string;
      name: string;
      type: "Text" | "Image" | "PDF";
      required: boolean;
    }>;
    restrictions?: {
      type: "india" | "states" | "districts" | "cities" | "pincodes";
      states?: string[];
      districts?: string[];
      cities?: string[];
      pincodes?: string[];
    };
  }>;
  required_documents_list: Array<{
    id: string;
    name: string;
    type: "Text" | "Image" | "PDF";
    required: boolean;
  }>;
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

  // new V2 fields
  government_fee_type: "not_applicable",
  government_fee_amount: "0",
  processing_fee: "0",
  eligibility: "",
  faq: [],
  terms: "",
  important_notes: "",
  popular: false,
  thumbnail: "",
  banner: "",
  supported_states: [],
  supported_districts: [],
  supported_pincodes: [],
  variants: [],
  required_documents_list: [],
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

    // new V2 fields
    government_fee_type: service.government_fee_type ?? "not_applicable",
    government_fee_amount: String(service.government_fee_amount ?? 0),
    processing_fee: String(service.processing_fee ?? 0),
    eligibility: service.eligibility ?? "",
    faq: service.faq ?? [],
    terms: service.terms ?? "",
    important_notes: service.important_notes ?? "",
    popular: service.popular ?? false,
    thumbnail: service.thumbnail ?? "",
    banner: service.banner ?? "",
    supported_states: service.supported_states ?? [],
    supported_districts: service.supported_districts ?? [],
    supported_pincodes: service.supported_pincodes ?? [],
    variants: service.variants ?? [],
    required_documents_list: service.required_documents_list ?? [],
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

    // new V2 fields
    government_fee_type: draft.government_fee_type,
    government_fee_amount: Number(draft.government_fee_amount || 0),
    processing_fee: Number(draft.processing_fee || 0),
    eligibility: draft.eligibility || null,
    faq: draft.faq,
    terms: draft.terms || null,
    important_notes: draft.important_notes || null,
    popular: draft.popular,
    thumbnail: draft.thumbnail || null,
    banner: draft.banner || null,
    supported_states: draft.supported_states,
    supported_districts: draft.supported_districts,
    supported_pincodes: draft.supported_pincodes,
    variants: draft.variants,
    required_documents_list: draft.required_documents_list,
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
  const [activeTab, setActiveTab] = useState("basic");

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
      required_documents_list: Array.isArray(source.required_documents)
        ? source.required_documents.map((doc, idx) => ({
            id: `doc-${idx + 1}`,
            name: doc,
            type: "Image",
            required: true,
          }))
        : [],
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
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Score {formatMoney(payoutForAgentService(service))}</span>
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

            <div className="flex border-b border-slate-100 overflow-x-auto pb-1 gap-2 scrollbar-none">
              {["basic", "fees", "content", "documents", "restrictions", "variants"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors capitalize whitespace-nowrap",
                    activeTab === tab
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {tab === "fees" ? "Fees & Score" : tab}
                </button>
              ))}
            </div>

            {activeTab === "basic" && (
              <div className="grid gap-3">
                <Select value={draft.service_id || "manual"} onValueChange={(value) => value !== "manual" && applySourceService(value)}>
                  <SelectTrigger><SelectValue placeholder="Start from service catalog" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual service</SelectItem>
                    {sourceServices.map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                <label className="block text-xs font-bold text-slate-600">Title</label>
                <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value, slug: draft.slug || slugify(event.target.value) })} placeholder="Agent display title" />
                
                <label className="block text-xs font-bold text-slate-600">Slug</label>
                <Input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: slugify(event.target.value) })} placeholder="service-slug" />
                
                <label className="block text-xs font-bold text-slate-600">Category</label>
                <Input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Category" />
                
                <label className="block text-xs font-bold text-slate-600">Description</label>
                <Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Description shown to agents" />
                
                <label className="block text-xs font-bold text-slate-600">Instructions</label>
                <Textarea value={draft.instructions} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} placeholder="Agent instructions" />
                
                <label className="block text-xs font-bold text-slate-600">Sort Order</label>
                <Input value={draft.sort_order} onChange={(event) => setDraft({ ...draft, sort_order: event.target.value })} inputMode="numeric" placeholder="Sort order" />
                
                <label className="block text-xs font-bold text-slate-600">Visibility</label>
                <Select value={draft.visibility_type} onValueChange={(value: Draft["visibility_type"]) => setDraft({ ...draft, visibility_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All agents</SelectItem>
                    <SelectItem value="selected_agents">Selected agents only</SelectItem>
                    <SelectItem value="selected_groups">Selected groups</SelectItem>
                  </SelectContent>
                </Select>

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
                    Agent groups are not configured in this workspace yet.
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === "fees" && (
              <div className="grid gap-3">
                <label className="block text-xs font-bold text-slate-600">Customer Fee (Rs.)</label>
                <Input value={draft.customer_fee} onChange={(event) => setDraft({ ...draft, customer_fee: event.target.value })} inputMode="decimal" placeholder="Customer fee" />
                
                <label className="block text-xs font-bold text-slate-600">Processing Time</label>
                <Input value={draft.processing_time} onChange={(event) => setDraft({ ...draft, processing_time: event.target.value })} placeholder="Processing time (e.g. 3 Days)" />

                <label className="block text-xs font-bold text-slate-600">Government Fee Type</label>
                <Select value={draft.government_fee_type} onValueChange={(value: Draft["government_fee_type"]) => setDraft({ ...draft, government_fee_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                    <SelectItem value="included">Included in Customer Fee</SelectItem>
                    <SelectItem value="extra">Extra / Paid Separately</SelectItem>
                  </SelectContent>
                </Select>

                {draft.government_fee_type !== "not_applicable" && (
                  <>
                    <label className="block text-xs font-bold text-slate-600">Government Fee Amount (Rs.)</label>
                    <Input value={draft.government_fee_amount} onChange={(event) => setDraft({ ...draft, government_fee_amount: event.target.value })} inputMode="decimal" placeholder="Gov fee amount" />
                  </>
                )}

                <label className="block text-xs font-bold text-slate-600">Processing Fee (Rs.)</label>
                <Input value={draft.processing_fee} onChange={(event) => setDraft({ ...draft, processing_fee: event.target.value })} inputMode="decimal" placeholder="Processing fee" />

                <label className="block text-xs font-bold text-slate-600">Score / Payout Type</label>
                <Select value={draft.payout_type} onValueChange={(value: "fixed" | "percentage") => setDraft({ ...draft, payout_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Score</SelectItem>
                    <SelectItem value="percentage">Percentage Score</SelectItem>
                  </SelectContent>
                </Select>

                {draft.payout_type === "fixed" ? (
                  <>
                    <label className="block text-xs font-bold text-slate-600">Score / Payout Value (Rs.)</label>
                    <Input value={draft.agent_payout} onChange={(event) => setDraft({ ...draft, agent_payout: event.target.value })} inputMode="decimal" placeholder="Agent payout / Score" />
                  </>
                ) : (
                  <>
                    <label className="block text-xs font-bold text-slate-600">Score / Payout Percentage (%)</label>
                    <Input value={draft.payout_percentage} onChange={(event) => setDraft({ ...draft, payout_percentage: event.target.value })} inputMode="decimal" placeholder="Payout %" />
                  </>
                )}

                <div className="grid gap-2 rounded-2xl bg-blue-50 p-4 text-sm mt-2">
                  <p className="font-bold text-slate-950">Partner Score preview</p>
                  <p className="text-2xl font-bold text-blue-700">{formatMoney(payoutPreview)}</p>
                </div>
              </div>
            )}

            {activeTab === "content" && (
              <div className="grid gap-3">
                <label className="block text-xs font-bold text-slate-600">Eligibility Criteria</label>
                <Textarea value={draft.eligibility} onChange={(event) => setDraft({ ...draft, eligibility: event.target.value })} placeholder="Who can apply..." />

                <label className="block text-xs font-bold text-slate-600">Terms & Conditions</label>
                <Textarea value={draft.terms} onChange={(event) => setDraft({ ...draft, terms: event.target.value })} placeholder="Service terms..." />

                <label className="block text-xs font-bold text-slate-600">Important Notes</label>
                <Textarea value={draft.important_notes} onChange={(event) => setDraft({ ...draft, important_notes: event.target.value })} placeholder="Important notes..." />

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold text-slate-600 mb-2">Frequently Asked Questions (FAQs)</p>
                  <div className="grid gap-2 mb-3">
                    {draft.faq.map((f, index) => (
                      <div key={index} className="rounded-xl border border-slate-200 p-2 bg-slate-50 relative">
                        <button
                          type="button"
                          onClick={() => {
                            const updatedFaq = draft.faq.filter((_, i) => i !== index);
                            setDraft({ ...draft, faq: updatedFaq });
                          }}
                          className="absolute right-2 top-2 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <input
                          value={f.question}
                          onChange={(e) => {
                            const updatedFaq = [...draft.faq];
                            updatedFaq[index].question = e.target.value;
                            setDraft({ ...draft, faq: updatedFaq });
                          }}
                          className="w-full text-xs font-semibold bg-transparent border-b border-slate-250 focus:outline-none mb-1 pr-6"
                          placeholder="Question"
                        />
                        <textarea
                          value={f.answer}
                          onChange={(e) => {
                            const updatedFaq = [...draft.faq];
                            updatedFaq[index].answer = e.target.value;
                            setDraft({ ...draft, faq: updatedFaq });
                          }}
                          className="w-full text-xs bg-transparent focus:outline-none resize-none"
                          rows={2}
                          placeholder="Answer"
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full py-1 text-xs"
                    onClick={() => {
                      setDraft({
                        ...draft,
                        faq: [...draft.faq, { question: "", answer: "" }],
                      });
                    }}
                  >
                    + Add FAQ
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "documents" && (
              <div className="grid gap-3">
                <label className="block text-xs font-bold text-slate-600">Documents Text (Fallback)</label>
                <Textarea value={draft.required_documents} onChange={(event) => setDraft({ ...draft, required_documents: event.target.value })} placeholder="Comma-separated or newline text" />

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold text-slate-600 mb-2">Structured Checklist Documents</p>
                  <div className="grid gap-2 mb-3">
                    {draft.required_documents_list.map((doc, index) => (
                      <div key={doc.id || index} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-xl border border-slate-100 p-2 bg-slate-50">
                        <input
                          value={doc.name}
                          onChange={(e) => {
                            const list = [...draft.required_documents_list];
                            list[index].name = e.target.value;
                            setDraft({ ...draft, required_documents_list: list });
                          }}
                          className="text-xs font-semibold bg-transparent focus:outline-none w-full border-b border-transparent focus:border-slate-300"
                          placeholder="Document Name"
                        />
                        <select
                          value={doc.type}
                          onChange={(e) => {
                            const list = [...draft.required_documents_list];
                            list[index].type = e.target.value as "Text" | "Image" | "PDF";
                            setDraft({ ...draft, required_documents_list: list });
                          }}
                          className="text-xs bg-transparent focus:outline-none border border-slate-200 rounded p-1"
                        >
                          <option value="Image">Image</option>
                          <option value="PDF">PDF</option>
                          <option value="Text">Text</option>
                        </select>
                        <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={doc.required}
                            onChange={(e) => {
                              const list = [...draft.required_documents_list];
                              list[index].required = e.target.checked;
                              setDraft({ ...draft, required_documents_list: list });
                            }}
                          />
                          Req
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const list = draft.required_documents_list.filter((_, i) => i !== index);
                            setDraft({ ...draft, required_documents_list: list });
                          }}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full py-1 text-xs"
                    onClick={() => {
                      const newId = `doc-${Date.now()}`;
                      setDraft({
                        ...draft,
                        required_documents_list: [
                          ...draft.required_documents_list,
                          { id: newId, name: "", type: "Image", required: true },
                        ],
                      });
                    }}
                  >
                    + Add Document Requirement
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "restrictions" && (
              <div className="grid gap-3">
                <p className="text-xs text-slate-500 mb-2">Leave arrays blank if there are no area restrictions for this service.</p>
                
                <label className="block text-xs font-bold text-slate-600">Supported States (Comma-separated)</label>
                <Input
                  value={draft.supported_states.join(", ")}
                  onChange={(e) => {
                    const states = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                    setDraft({ ...draft, supported_states: states });
                  }}
                  placeholder="e.g. Uttar Pradesh, Delhi"
                />

                <label className="block text-xs font-bold text-slate-600">Supported Districts (Comma-separated)</label>
                <Input
                  value={draft.supported_districts.join(", ")}
                  onChange={(e) => {
                    const districts = e.target.value.split(",").map(d => d.trim()).filter(Boolean);
                    setDraft({ ...draft, supported_districts: districts });
                  }}
                  placeholder="e.g. Jalaun, Jhansi"
                />

                <label className="block text-xs font-bold text-slate-600">Supported PIN codes (Comma-separated)</label>
                <Input
                  value={draft.supported_pincodes.join(", ")}
                  onChange={(e) => {
                    const pincodes = e.target.value.split(",").map(p => p.trim()).filter(Boolean);
                    setDraft({ ...draft, supported_pincodes: pincodes });
                  }}
                  placeholder="e.g. 285001"
                />
              </div>
            )}

            {activeTab === "variants" && (
              <div className="grid gap-3">
                <div className="grid gap-3">
                  {draft.variants.map((v, index) => (
                    <div key={v.id || index} className="rounded-xl border border-slate-200 p-3 bg-slate-50 relative grid gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = draft.variants.filter((_, i) => i !== index);
                          setDraft({ ...draft, variants: updated });
                        }}
                        className="absolute right-3 top-3 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="pr-6">
                        <label className="block text-[10px] font-bold text-slate-500">Variant Name</label>
                        <input
                          value={v.name}
                          onChange={(e) => {
                            const list = [...draft.variants];
                            list[index].name = e.target.value;
                            setDraft({ ...draft, variants: list });
                          }}
                          className="w-full text-xs font-bold bg-transparent border-b border-slate-305 focus:outline-none py-0.5"
                          placeholder="Variant Name"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">Price (Rs.)</label>
                          <input
                            type="number"
                            value={v.price}
                            onChange={(e) => {
                              const list = [...draft.variants];
                              list[index].price = Number(e.target.value);
                              setDraft({ ...draft, variants: list });
                            }}
                            className="w-full text-xs bg-white border border-slate-200 rounded p-1 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">Score</label>
                          <input
                            type="number"
                            value={v.score}
                            onChange={(e) => {
                              const list = [...draft.variants];
                              list[index].score = Number(e.target.value);
                              setDraft({ ...draft, variants: list });
                            }}
                            className="w-full text-xs bg-white border border-slate-200 rounded p-1 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">Processing Time</label>
                          <input
                            value={v.processing_time}
                            onChange={(e) => {
                              const list = [...draft.variants];
                              list[index].processing_time = e.target.value;
                              setDraft({ ...draft, variants: list });
                            }}
                            className="w-full text-xs bg-white border border-slate-200 rounded p-1 focus:outline-none"
                            placeholder="e.g. 3 Days"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">Gov Fee info</label>
                          <input
                            value={v.government_fee || ""}
                            onChange={(e) => {
                              const list = [...draft.variants];
                              list[index].government_fee = e.target.value;
                              setDraft({ ...draft, variants: list });
                            }}
                            className="w-full text-xs bg-white border border-slate-200 rounded p-1 focus:outline-none"
                            placeholder="e.g. Included"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-2 mt-1">
                        <label className="block text-[10px] font-bold text-slate-500">Restriction Type</label>
                        <select
                          value={v.restrictions?.type || "india"}
                          onChange={(e) => {
                            const list = [...draft.variants];
                            const type = e.target.value as "india" | "states" | "districts" | "cities" | "pincodes";
                            list[index].restrictions = {
                              type,
                              states: v.restrictions?.states || [],
                              districts: v.restrictions?.districts || [],
                              pincodes: v.restrictions?.pincodes || [],
                            };
                            setDraft({ ...draft, variants: list });
                          }}
                          className="w-full text-xs bg-white border border-slate-200 rounded p-1 focus:outline-none"
                        >
                          <option value="india">No Restriction (India)</option>
                          <option value="states">Restrict to States</option>
                          <option value="districts">Restrict to Districts</option>
                          <option value="pincodes">Restrict to PIN codes</option>
                        </select>

                        {v.restrictions?.type && v.restrictions.type !== "india" && (
                          <div className="grid gap-1 mt-1">
                            {v.restrictions.type === "states" && (
                              <input
                                value={(v.restrictions.states || []).join(", ")}
                                onChange={(e) => {
                                  const list = [...draft.variants];
                                  if (list[index].restrictions) {
                                    list[index].restrictions!.states = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                                  }
                                  setDraft({ ...draft, variants: list });
                                }}
                                className="w-full text-[11px] bg-white border border-slate-200 rounded p-1 focus:outline-none"
                                placeholder="States (comma-separated)"
                              />
                            )}
                            {v.restrictions.type === "districts" && (
                              <>
                                <input
                                  value={(v.restrictions.districts || []).join(", ")}
                                  onChange={(e) => {
                                    const list = [...draft.variants];
                                    if (list[index].restrictions) {
                                      list[index].restrictions!.districts = e.target.value.split(",").map(d => d.trim()).filter(Boolean);
                                    }
                                    setDraft({ ...draft, variants: list });
                                  }}
                                  className="w-full text-[11px] bg-white border border-slate-200 rounded p-1 focus:outline-none mb-1"
                                  placeholder="Districts (comma-separated)"
                                />
                                <input
                                  value={(v.restrictions.pincodes || []).join(", ")}
                                  onChange={(e) => {
                                    const list = [...draft.variants];
                                    if (list[index].restrictions) {
                                      list[index].restrictions!.pincodes = e.target.value.split(",").map(p => p.trim()).filter(Boolean);
                                    }
                                    setDraft({ ...draft, variants: list });
                                  }}
                                  className="w-full text-[11px] bg-white border border-slate-200 rounded p-1 focus:outline-none"
                                  placeholder="PIN codes (comma-separated, optional)"
                                />
                              </>
                            )}
                            {v.restrictions.type === "pincodes" && (
                              <>
                                <input
                                  value={(v.restrictions.pincodes || []).join(", ")}
                                  onChange={(e) => {
                                    const list = [...draft.variants];
                                    if (list[index].restrictions) {
                                      list[index].restrictions!.pincodes = e.target.value.split(",").map(p => p.trim()).filter(Boolean);
                                    }
                                    setDraft({ ...draft, variants: list });
                                  }}
                                  className="w-full text-[11px] bg-white border border-slate-200 rounded p-1 focus:outline-none mb-1"
                                  placeholder="PIN codes (comma-separated)"
                                />
                                <input
                                  value={(v.restrictions.districts || []).join(", ")}
                                  onChange={(e) => {
                                    const list = [...draft.variants];
                                    if (list[index].restrictions) {
                                      list[index].restrictions!.districts = e.target.value.split(",").map(d => d.trim()).filter(Boolean);
                                    }
                                    setDraft({ ...draft, variants: list });
                                  }}
                                  className="w-full text-[11px] bg-white border border-slate-200 rounded p-1 focus:outline-none mb-1"
                                  placeholder="Districts (comma-separated, optional)"
                                />
                                <input
                                  value={(v.restrictions.states || []).join(", ")}
                                  onChange={(e) => {
                                    const list = [...draft.variants];
                                    if (list[index].restrictions) {
                                      list[index].restrictions!.states = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                                    }
                                    setDraft({ ...draft, variants: list });
                                  }}
                                  className="w-full text-[11px] bg-white border border-slate-200 rounded p-1 focus:outline-none"
                                  placeholder="States (comma-separated, optional)"
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-200 pt-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Variant Documents</label>
                        <div className="flex flex-wrap gap-2">
                          {draft.required_documents_list.map((doc) => {
                            const hasDoc = v.required_documents?.some((d) => d.name === doc.name);
                            return (
                              <label key={doc.id} className="flex items-center gap-1 text-[10px] font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={hasDoc}
                                  onChange={(e) => {
                                    const list = [...draft.variants];
                                    let docs = v.required_documents ? [...v.required_documents] : [];
                                    if (e.target.checked) {
                                      if (!docs.some((d) => d.name === doc.name)) {
                                        docs.push({ id: doc.id, name: doc.name, type: doc.type, required: doc.required });
                                      }
                                    } else {
                                      docs = docs.filter((d) => d.name !== doc.name);
                                    }
                                    list[index].required_documents = docs;
                                    setDraft({ ...draft, variants: list });
                                  }}
                                />
                                {doc.name || "Unnamed"}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-1 text-xs"
                  onClick={() => {
                    const newId = `variant-${Date.now()}`;
                    setDraft({
                      ...draft,
                      variants: [
                        ...draft.variants,
                        {
                          id: newId,
                          name: "",
                          price: 0,
                          score: 0,
                          processing_time: "",
                          required_documents: [...draft.required_documents_list],
                          restrictions: { type: "india", states: [], districts: [], pincodes: [] },
                        },
                      ],
                    });
                  }}
                >
                  + Add Variant
                </Button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-xs font-bold">
                <input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} />
                Active
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-xs font-bold">
                <input type="checkbox" checked={draft.is_featured} onChange={(event) => setDraft({ ...draft, is_featured: event.target.checked })} />
                Featured
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-xs font-bold">
                <input type="checkbox" checked={draft.popular} onChange={(event) => setDraft({ ...draft, popular: event.target.checked })} />
                Popular
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
