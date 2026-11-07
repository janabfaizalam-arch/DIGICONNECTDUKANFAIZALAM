"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";

import { STATUS_TONE_CLASS } from "@/lib/admin/status-tone";
import { formatAddonPrice, paiseToRupeesInput, rupeesToPaise } from "@/lib/digital-plans/money";
import { FEATURE_GROUPS, type DigitalAddon, type DigitalPlan, type FeatureGroup, type PlanFeature } from "@/lib/digital-plans/types";
import { cn } from "@/lib/utils";

type Draft = Omit<DigitalPlan, "id" | "sortOrder" | "monthlyPricePaise" | "setupFeePaise"> & { monthly: string; setup: string };

const EMPTY: Draft = {
  slug: "",
  name: "",
  tagline: "",
  description: "",
  bestFor: "",
  monthly: "",
  setup: "",
  priceIsStarting: false,
  commitmentMonths: 12,
  isRecommended: false,
  isActive: false,
  featuredOnHomepage: false,
  features: [],
  limits: [],
  exclusions: [],
  maintenance: "",
  terms: "",
  faqs: [],
  addonSlugs: [],
};

const input = "mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const label = "block text-sm font-semibold text-slate-800";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function RowTools({ index, length, onMove, onRemove, name }: { index: number; length: number; onMove: (delta: number) => void; onRemove: () => void; name: string }) {
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${name} up`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={() => onMove(1)} disabled={index === length - 1} aria-label={`Move ${name} down`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={onRemove} aria-label={`Remove ${name}`} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function PlanEditor({ plan, addons }: { plan: DigitalPlan | null; addons: DigitalAddon[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(
    plan ? { ...plan, monthly: paiseToRupeesInput(plan.monthlyPricePaise), setup: paiseToRupeesInput(plan.setupFeePaise) } : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setFeature = (index: number, patch: Partial<PlanFeature>) =>
    set("features", draft.features.map((feature, i) => (i === index ? { ...feature, ...patch } : feature)));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const monthlyPricePaise = rupeesToPaise(draft.monthly);
    const setupFeePaise = rupeesToPaise(draft.setup);
    if (monthlyPricePaise === null || setupFeePaise === null) {
      setMessage({ tone: "danger", text: "Enter the monthly price and setup fee in rupees, e.g. 3999 or 3999.50." });
      return;
    }
    const { monthly: _monthly, setup: _setup, ...rest } = draft;
    void _monthly;
    void _setup;
    const body = {
      ...rest,
      monthlyPricePaise,
      setupFeePaise,
      features: draft.features.map((feature) => ({ ...feature, value: feature.value?.trim() ? feature.value.trim() : null })),
    };
    setSaving(true);
    setMessage(null);
    const response = await fetch(plan ? `/api/admin/digital-plans/${plan.id}` : "/api/admin/digital-plans", {
      method: plan ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = (await response?.json().catch(() => ({}))) as { error?: string; id?: string } | undefined;
    setSaving(false);
    if (!response?.ok) {
      setMessage({ tone: "danger", text: data?.error ?? "The plan did not save. Please try again." });
      return;
    }
    setMessage({ tone: "success", text: "Saved. The website now shows these details." });
    if (!plan && data?.id) router.push(`/admin/digital-plans/${data.id}`);
    else router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-5" aria-busy={saving}>
      <Section title="Basics">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={label}>
            Plan name
            <input className={input} value={draft.name} onChange={(e) => set("name", e.target.value)} required maxLength={60} />
          </label>
          <label className={label}>
            URL slug <span className="font-normal text-slate-500">(/packages/…)</span>
            <input className={input} value={draft.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} />
          </label>
          <label className={cn(label, "md:col-span-2")}>
            Tagline
            <input className={input} value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={200} />
          </label>
          <label className={cn(label, "md:col-span-2")}>
            Description
            <textarea className={input} rows={3} value={draft.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
          </label>
          <label className={cn(label, "md:col-span-2")}>
            Best for
            <input className={input} value={draft.bestFor} onChange={(e) => set("bestFor", e.target.value)} maxLength={300} />
          </label>
        </div>
      </Section>

      <Section title="Pricing" hint="Changing a price applies to new enquiries only. Existing enquiries and quotations keep the figures they were made with, and every change is kept in the price history.">
        <div className="grid gap-4 md:grid-cols-4">
          <label className={label}>
            Monthly price (₹)
            <input className={input} inputMode="decimal" value={draft.monthly} onChange={(e) => set("monthly", e.target.value)} required />
          </label>
          <label className={label}>
            One-time setup (₹)
            <input className={input} inputMode="decimal" value={draft.setup} onChange={(e) => set("setup", e.target.value)} required />
          </label>
          <label className={label}>
            Minimum commitment (months)
            <input className={input} type="number" min={0} max={60} value={draft.commitmentMonths} onChange={(e) => set("commitmentMonths", Number(e.target.value))} />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-slate-800">
            <input type="checkbox" checked={draft.priceIsStarting} onChange={(e) => set("priceIsStarting", e.target.checked)} className="h-4 w-4" />
            Show as &ldquo;onwards&rdquo;
          </label>
        </div>
      </Section>

      <Section title="Visibility">
        <div className="flex flex-wrap gap-6">
          {(
            [
              ["isActive", "Live on the website"],
              ["isRecommended", "Recommended plan (only one at a time)"],
              ["featuredOnHomepage", "Show on the homepage"],
            ] as const
          ).map(([key, text]) => (
            <label key={key} className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input type="checkbox" checked={draft[key]} onChange={(e) => set(key, e.target.checked)} className="h-4 w-4" />
              {text}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Features" hint="The feature key lines the same capability up across plans in the comparison table — use the same key on every plan that has it. 'Table value' is the short text in the table cell; leave it empty for a tick.">
        <div className="grid gap-3">
          {draft.features.map((feature, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[9rem_1fr_1fr_8rem_9rem_auto_auto] md:items-end">
              <label className="text-xs font-semibold text-slate-600">
                Key
                <input className={input} value={feature.key} onChange={(e) => setFeature(index, { key: e.target.value.toLowerCase() })} required pattern="[a-z0-9_]+" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Text on card / detail page
                <input className={input} value={feature.label} onChange={(e) => setFeature(index, { label: e.target.value })} required />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Comparison row label
                <input className={input} value={feature.compareLabel} onChange={(e) => setFeature(index, { compareLabel: e.target.value })} required />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Table value
                <input className={input} value={feature.value ?? ""} onChange={(e) => setFeature(index, { value: e.target.value })} maxLength={40} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Group
                <select className={input} value={feature.group} onChange={(e) => setFeature(index, { group: e.target.value as FeatureGroup })}>
                  {FEATURE_GROUPS.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 pb-2 text-xs font-semibold text-slate-600">
                <input type="checkbox" checked={feature.highlight} onChange={(e) => setFeature(index, { highlight: e.target.checked })} className="h-4 w-4" />
                On card
              </label>
              <RowTools index={index} length={draft.features.length} name={feature.label || "feature"} onMove={(delta) => set("features", move(draft.features, index, delta))} onRemove={() => set("features", draft.features.filter((_, i) => i !== index))} />
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("features", [...draft.features, { key: "", label: "", compareLabel: "", value: null, group: "website", highlight: false }])}
            className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full px-4 text-sm font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Add feature
          </button>
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Plan limits" hint="What the plan covers, and up to how much.">
          <div className="grid gap-2">
            {draft.limits.map((limit, index) => (
              <div key={index} className="grid gap-2 md:grid-cols-[1fr_1.5fr_auto] md:items-end">
                <input aria-label="Limit name" className={input} value={limit.label} placeholder="e.g. Pages" onChange={(e) => set("limits", draft.limits.map((l, i) => (i === index ? { ...l, label: e.target.value } : l)))} required />
                <input aria-label="Limit value" className={input} value={limit.value} placeholder="e.g. Up to 10" onChange={(e) => set("limits", draft.limits.map((l, i) => (i === index ? { ...l, value: e.target.value } : l)))} required />
                <RowTools index={index} length={draft.limits.length} name={limit.label || "limit"} onMove={(delta) => set("limits", move(draft.limits, index, delta))} onRemove={() => set("limits", draft.limits.filter((_, i) => i !== index))} />
              </div>
            ))}
            <button type="button" onClick={() => set("limits", [...draft.limits, { label: "", value: "" }])} className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full px-4 text-sm font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add limit
            </button>
          </div>
        </Section>

        <Section title="Not included" hint="Listed on the plan page so the customer knows what is not covered.">
          <div className="grid gap-2">
            {draft.exclusions.map((item, index) => (
              <div key={index} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
                <input aria-label="Exclusion" className={input} value={item} onChange={(e) => set("exclusions", draft.exclusions.map((x, i) => (i === index ? e.target.value : x)))} required />
                <RowTools index={index} length={draft.exclusions.length} name={item || "item"} onMove={(delta) => set("exclusions", move(draft.exclusions, index, delta))} onRemove={() => set("exclusions", draft.exclusions.filter((_, i) => i !== index))} />
              </div>
            ))}
            <button type="button" onClick={() => set("exclusions", [...draft.exclusions, ""])} className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full px-4 text-sm font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add item
            </button>
          </div>
        </Section>
      </div>

      <Section title="Maintenance and subscription terms">
        <div className="grid gap-4">
          <label className={label}>
            Maintenance details
            <textarea className={input} rows={3} value={draft.maintenance} onChange={(e) => set("maintenance", e.target.value)} maxLength={1500} />
          </label>
          <label className={label}>
            Subscription terms (renewal, cancellation, refunds)
            <textarea className={input} rows={5} value={draft.terms} onChange={(e) => set("terms", e.target.value)} maxLength={4000} />
          </label>
        </div>
      </Section>

      <Section title="FAQ">
        <div className="grid gap-3">
          {draft.faqs.map((faq, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_auto]">
              <div className="grid gap-2">
                <input aria-label="Question" className={input} value={faq.question} placeholder="Question" onChange={(e) => set("faqs", draft.faqs.map((f, i) => (i === index ? { ...f, question: e.target.value } : f)))} required />
                <textarea aria-label="Answer" className={input} rows={2} value={faq.answer} placeholder="Answer" onChange={(e) => set("faqs", draft.faqs.map((f, i) => (i === index ? { ...f, answer: e.target.value } : f)))} required />
              </div>
              <RowTools index={index} length={draft.faqs.length} name={faq.question || "question"} onMove={(delta) => set("faqs", move(draft.faqs, index, delta))} onRemove={() => set("faqs", draft.faqs.filter((_, i) => i !== index))} />
            </div>
          ))}
          <button type="button" onClick={() => set("faqs", [...draft.faqs, { question: "", answer: "" }])} className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full px-4 text-sm font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add question
          </button>
        </div>
      </Section>

      <Section title="Suggested add-ons" hint="Shown on this plan's page and offered in its enquiry form.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {addons.map((addon) => (
            <label key={addon.slug} className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={draft.addonSlugs.includes(addon.slug)}
                onChange={(e) => set("addonSlugs", e.target.checked ? [...draft.addonSlugs, addon.slug] : draft.addonSlugs.filter((slug) => slug !== addon.slug))}
              />
              <span>
                <span className="block font-semibold text-slate-900">
                  {addon.name}
                  {!addon.isActive ? " (hidden)" : ""}
                </span>
                <span className="text-xs text-slate-500">{formatAddonPrice(addon.pricePaise, addon.unit, addon.priceIsStarting)}</span>
              </span>
            </label>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-bold text-white disabled:opacity-70">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {plan ? "Save changes" : "Create plan"}
        </button>
        {message ? (
          <p role={message.tone === "danger" ? "alert" : "status"} className={cn("rounded-xl px-3 py-2 text-sm font-semibold", STATUS_TONE_CLASS[message.tone])}>
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
