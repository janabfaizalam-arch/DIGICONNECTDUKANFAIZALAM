"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Star, Trash2 } from "lucide-react";

import { STATUS_TONE_CLASS } from "@/lib/admin/status-tone";
import { formatPrice } from "@/lib/digital-plans/money";
import type { DigitalPlan } from "@/lib/digital-plans/types";
import { cn } from "@/lib/utils";

/**
 * The plans list: order, enable/disable, recommended. Each change is saved
 * at once and the public pages refresh from the database.
 */
export function PlansManager({ plans: initial }: { plans: DigitalPlan[] }) {
  const router = useRouter();
  const [plans, setPlans] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function call(url: string, init: RequestInit, success: string) {
    setBusy(true);
    setMessage(null);
    const response = await fetch(url, { headers: { "content-type": "application/json" }, ...init }).catch(() => null);
    const body = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    if (!response?.ok) {
      setMessage({ tone: "danger", text: body?.error ?? "That did not save. Please try again." });
      return false;
    }
    setMessage({ tone: "success", text: success });
    router.refresh();
    return true;
  }

  async function move(index: number, delta: -1 | 1) {
    const next = [...plans];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPlans(next);
    await call("/api/admin/digital-plans/reorder", { method: "POST", body: JSON.stringify({ table: "plans", ids: next.map((plan) => plan.id) }) }, "Order saved.");
  }

  async function toggleActive(plan: DigitalPlan) {
    const ok = await call(`/api/admin/digital-plans/${plan.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !plan.isActive }) }, plan.isActive ? `${plan.name} hidden from the website.` : `${plan.name} is live.`);
    if (ok) setPlans((list) => list.map((item) => (item.id === plan.id ? { ...item, isActive: !item.isActive } : item)));
  }

  async function recommend(plan: DigitalPlan) {
    const ok = await call(`/api/admin/digital-plans/${plan.id}`, { method: "PATCH", body: JSON.stringify({ isRecommended: !plan.isRecommended }) }, plan.isRecommended ? "No plan is recommended now." : `${plan.name} is now recommended.`);
    if (ok) setPlans((list) => list.map((item) => ({ ...item, isRecommended: item.id === plan.id ? !plan.isRecommended : false })));
  }

  async function remove(plan: DigitalPlan) {
    if (!window.confirm(`Delete ${plan.name}? Past enquiries keep their own copy of its prices. To take it off the website without deleting, use Hide instead.`)) return;
    const ok = await call(`/api/admin/digital-plans/${plan.id}`, { method: "DELETE" }, `${plan.name} deleted.`);
    if (ok) setPlans((list) => list.filter((item) => item.id !== plan.id));
  }

  return (
    <div className="space-y-3">
      {message ? (
        <p role={message.tone === "danger" ? "alert" : "status"} className={cn("rounded-xl px-4 py-2.5 text-sm font-semibold", STATUS_TONE_CLASS[message.tone])}>
          {message.text}
        </p>
      ) : null}
      <ol className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {plans.map((plan, index) => (
          <li key={plan.id} className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label={`Move ${plan.name} up`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={busy || index === plans.length - 1} aria-label={`Move ${plan.name} down`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-slate-900">{plan.name}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", STATUS_TONE_CLASS[plan.isActive ? "success" : "neutral"])}>{plan.isActive ? "Live" : "Hidden"}</span>
                {plan.isRecommended ? <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", STATUS_TONE_CLASS.warning)}>Recommended</span> : null}
                {plan.featuredOnHomepage ? <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", STATUS_TONE_CLASS.info)}>On homepage</span> : null}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {formatPrice(plan.monthlyPricePaise, plan.priceIsStarting)}/month · {formatPrice(plan.setupFeePaise, plan.priceIsStarting)} setup · {plan.features.length} features ·{" "}
                {plan.commitmentMonths ? `${plan.commitmentMonths}-month minimum` : "no minimum"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => recommend(plan)} disabled={busy} aria-pressed={plan.isRecommended} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                <Star className={cn("h-3.5 w-3.5", plan.isRecommended && "fill-amber-400 text-amber-500")} aria-hidden="true" />
                {plan.isRecommended ? "Recommended" : "Recommend"}
              </button>
              <button type="button" onClick={() => toggleActive(plan)} disabled={busy} className="inline-flex h-9 items-center rounded-full px-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                {plan.isActive ? "Hide" : "Make live"}
              </button>
              <Link href={`/admin/digital-plans/${plan.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-900 px-3 text-xs font-bold text-white">
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
              </Link>
              <a href={`/packages/${plan.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${plan.name} on the website`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <button type="button" onClick={() => remove(plan)} disabled={busy} aria-label={`Delete ${plan.name}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
