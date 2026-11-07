"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";

import { STATUS_TONE_CLASS } from "@/lib/admin/status-tone";
import { paiseToRupeesInput, rupeesToPaise, UNIT_LABEL } from "@/lib/digital-plans/money";
import { ADDON_UNITS, type AddonUnit, type DigitalAddon } from "@/lib/digital-plans/types";
import { cn } from "@/lib/utils";

type Row = { id: string | null; slug: string; name: string; description: string; price: string; unit: AddonUnit; priceIsStarting: boolean; note: string; isActive: boolean };

const input = "mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const toRow = (addon: DigitalAddon): Row => ({
  id: addon.id,
  slug: addon.slug,
  name: addon.name,
  description: addon.description,
  price: paiseToRupeesInput(addon.pricePaise),
  unit: addon.unit,
  priceIsStarting: addon.priceIsStarting,
  note: addon.note ?? "",
  isActive: addon.isActive,
});

/** Add-on services: each row is its own small form, saved on its own. */
export function AddonsManager({ addons }: { addons: DigitalAddon[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(addons.map(toRow));
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const update = (index: number, patch: Partial<Row>) => setRows((list) => list.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  async function request(url: string, init: RequestInit) {
    const response = await fetch(url, { headers: { "content-type": "application/json" }, ...init }).catch(() => null);
    const body = (await response?.json().catch(() => ({}))) as { error?: string; id?: string } | undefined;
    return { ok: Boolean(response?.ok), body };
  }

  async function save(index: number) {
    const row = rows[index];
    const pricePaise = rupeesToPaise(row.price);
    if (pricePaise === null) {
      setMessage({ tone: "danger", text: `Enter a price in rupees for ${row.name || "the add-on"}.` });
      return;
    }
    setBusy(row.id ?? `new-${index}`);
    const { ok, body } = await request(row.id ? `/api/admin/digital-addons/${row.id}` : "/api/admin/digital-addons", {
      method: row.id ? "PUT" : "POST",
      body: JSON.stringify({ slug: row.slug, name: row.name, description: row.description, pricePaise, unit: row.unit, priceIsStarting: row.priceIsStarting, note: row.note.trim() || null, isActive: row.isActive }),
    });
    setBusy(null);
    if (!ok) {
      setMessage({ tone: "danger", text: body?.error ?? "That add-on did not save." });
      return;
    }
    if (!row.id && body?.id) update(index, { id: body.id });
    setMessage({ tone: "success", text: `${row.name} saved.` });
    router.refresh();
  }

  async function remove(index: number) {
    const row = rows[index];
    if (row.id && !window.confirm(`Delete ${row.name}? It will be removed from every plan it is suggested on.`)) return;
    if (row.id) {
      setBusy(row.id);
      const { ok, body } = await request(`/api/admin/digital-addons/${row.id}`, { method: "DELETE" });
      setBusy(null);
      if (!ok) {
        setMessage({ tone: "danger", text: body?.error ?? "Could not delete." });
        return;
      }
    }
    setRows((list) => list.filter((_, i) => i !== index));
    setMessage({ tone: "success", text: `${row.name || "Add-on"} removed.` });
    router.refresh();
  }

  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    const ids = next.map((row) => row.id).filter((id): id is string => Boolean(id));
    const { ok } = await request("/api/admin/digital-plans/reorder", { method: "POST", body: JSON.stringify({ table: "addons", ids }) });
    setMessage(ok ? { tone: "success", text: "Order saved." } : { tone: "danger", text: "Could not save the order." });
  }

  return (
    <div className="grid gap-4">
      {message ? (
        <p role={message.tone === "danger" ? "alert" : "status"} className={cn("rounded-xl px-4 py-2.5 text-sm font-semibold", STATUS_TONE_CLASS[message.tone])}>
          {message.text}
        </p>
      ) : null}
      {rows.map((row, index) => {
        const key = row.id ?? `new-${index}`;
        return (
          <form
            key={key}
            onSubmit={(event) => {
              event.preventDefault();
              void save(index);
            }}
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6"
            aria-label={row.name || "New add-on"}
          >
            <label className="text-xs font-semibold text-slate-600 md:col-span-2">
              Name
              <input className={input} value={row.name} onChange={(e) => update(index, { name: e.target.value })} required />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Slug
              <input className={input} value={row.slug} onChange={(e) => update(index, { slug: e.target.value.toLowerCase() })} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Price (₹)
              <input className={input} inputMode="decimal" value={row.price} onChange={(e) => update(index, { price: e.target.value })} required />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Charged
              <select className={input} value={row.unit} onChange={(e) => update(index, { unit: e.target.value as AddonUnit })}>
                {ADDON_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {UNIT_LABEL[unit]}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col justify-end gap-1.5 pb-1 text-xs font-semibold text-slate-600">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={row.priceIsStarting} onChange={(e) => update(index, { priceIsStarting: e.target.checked })} className="h-4 w-4" /> &ldquo;onwards&rdquo;
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={row.isActive} onChange={(e) => update(index, { isActive: e.target.checked })} className="h-4 w-4" /> Live
              </label>
            </div>
            <label className="text-xs font-semibold text-slate-600 md:col-span-3">
              Description
              <input className={input} value={row.description} onChange={(e) => update(index, { description: e.target.value })} maxLength={400} />
            </label>
            <label className="text-xs font-semibold text-slate-600 md:col-span-3">
              Note (e.g. &ldquo;Ad budget is separate&rdquo;)
              <input className={input} value={row.note} onChange={(e) => update(index, { note: e.target.value })} maxLength={300} />
            </label>
            <div className="flex flex-wrap items-center gap-2 md:col-span-6">
              <button type="submit" disabled={busy === key} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-blue-600 px-4 text-xs font-bold text-white disabled:opacity-70">
                {busy === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                {row.id ? "Save" : "Create"}
              </button>
              {row.id ? (
                <>
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${row.name} up`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label={`Move ${row.name} down`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </>
              ) : null}
              <button type="button" onClick={() => remove(index)} aria-label={`Delete ${row.name || "new add-on"}`} className="ml-auto rounded-lg p-2 text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        );
      })}
      <button
        type="button"
        onClick={() => setRows((list) => [...list, { id: null, slug: "", name: "", description: "", price: "", unit: "one_time", priceIsStarting: false, note: "", isActive: true }])}
        className="inline-flex h-11 w-fit items-center gap-1.5 rounded-full px-5 text-sm font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> New add-on
      </button>
    </div>
  );
}
