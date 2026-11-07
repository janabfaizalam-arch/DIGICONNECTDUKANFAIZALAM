"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";

import { STATUS_TONE_CLASS } from "@/lib/admin/status-tone";
import { formatPaise, paiseToRupeesInput, quoteTotals, rupeesToPaise, UNIT_LABEL } from "@/lib/digital-plans/money";
import { ADDON_UNITS, ENQUIRY_STATUS_LABEL, type AddonUnit, type DigitalEnquiry, type EnquiryStatus } from "@/lib/digital-plans/types";
import { cn } from "@/lib/utils";

const input = "mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

/** Statuses an admin may set by hand. Approval and decline belong to the customer. */
const ADMIN_STATUSES: EnquiryStatus[] = ["new", "contacted", "won", "lost"];

type Line = { label: string; amount: string; unit: AddonUnit };

function defaultValidUntil() {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  return date.toISOString().slice(0, 10);
}

export function EnquiryActions({
  enquiry,
  suggestedLines,
  quoteUrl,
}: {
  enquiry: DigitalEnquiry;
  suggestedLines: { label: string; amountPaise: number; unit: AddonUnit }[];
  quoteUrl: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<EnquiryStatus>(enquiry.status);
  // A saved quotation or a customer's answer changes the status on the server; follow it.
  useEffect(() => setStatus(enquiry.status), [enquiry.status]);
  const [notes, setNotes] = useState(enquiry.adminNotes ?? "");
  const [monthly, setMonthly] = useState(paiseToRupeesInput(enquiry.quoteMonthlyPaise ?? enquiry.monthlyPricePaise));
  const [setup, setSetup] = useState(paiseToRupeesInput(enquiry.quoteSetupPaise ?? enquiry.setupFeePaise));
  const [lines, setLines] = useState<Line[]>(
    (enquiry.quotedAt ? enquiry.quoteLines : suggestedLines).map((line) => ({ label: line.label, amount: paiseToRupeesInput(line.amountPaise), unit: line.unit })),
  );
  const [gst, setGst] = useState(String(enquiry.quoteGstPercent ?? 18));
  const [commitment, setCommitment] = useState(String(enquiry.quoteCommitmentMonths ?? enquiry.commitmentMonths));
  const [quoteNotes, setQuoteNotes] = useState(enquiry.quoteNotes ?? "");
  const [validUntil, setValidUntil] = useState(enquiry.quoteValidUntil ?? defaultValidUntil());
  const [busy, setBusy] = useState<"status" | "quote" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(quoteUrl);

  const parsed = useMemo(() => {
    const monthlyPaise = rupeesToPaise(monthly);
    const setupPaise = rupeesToPaise(setup);
    const lineValues = lines.map((line) => ({ label: line.label.trim(), amountPaise: rupeesToPaise(line.amount), unit: line.unit }));
    const ok = monthlyPaise !== null && setupPaise !== null && lineValues.every((line) => line.amountPaise !== null && line.label.length >= 2);
    return { ok, monthlyPaise, setupPaise, lines: lineValues as { label: string; amountPaise: number; unit: AddonUnit }[] };
  }, [monthly, setup, lines]);

  const totals = parsed.ok
    ? quoteTotals({ monthlyPaise: parsed.monthlyPaise!, setupPaise: parsed.setupPaise!, lines: parsed.lines, gstPercent: Number(gst) || 0, commitmentMonths: Number(commitment) || 0 })
    : null;

  async function saveStatus() {
    setBusy("status");
    setMessage(null);
    const response = await fetch(`/api/admin/digital-enquiries/${enquiry.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: status === enquiry.status ? undefined : status, adminNotes: notes.trim() || null }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(null);
    setMessage(response?.ok ? { tone: "success", text: "Saved." } : { tone: "danger", text: body?.error ?? "Could not save." });
    if (response?.ok) router.refresh();
  }

  async function saveQuote(event: React.FormEvent) {
    event.preventDefault();
    if (!parsed.ok) {
      setMessage({ tone: "danger", text: "Check the quotation: every amount must be in rupees and every line needs a name." });
      return;
    }
    setBusy("quote");
    setMessage(null);
    const response = await fetch(`/api/admin/digital-enquiries/${enquiry.id}/quote`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        monthlyPaise: parsed.monthlyPaise,
        setupPaise: parsed.setupPaise,
        lines: parsed.lines,
        gstPercent: Number(gst),
        commitmentMonths: Number(commitment),
        notes: quoteNotes,
        validUntil,
      }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => ({}))) as { error?: string; url?: string } | undefined;
    setBusy(null);
    if (!response?.ok || !body?.url) {
      setMessage({ tone: "danger", text: body?.error ?? "The quotation did not save." });
      return;
    }
    setLink(body.url);
    setMessage({ tone: "success", text: enquiry.approvedAt ? "Quotation revised. The customer must approve the new figures." : "Quotation saved. Send the link to the customer." });
    router.refresh();
  }

  const whatsappToCustomer = link
    ? `https://wa.me/91${enquiry.mobile}?text=${encodeURIComponent(
        `Hello ${enquiry.name}, thank you for your interest in the RNOS Digital ${enquiry.planName} plan. Your quotation ${enquiry.reference} is ready to review and approve here: ${link}`,
      )}`
    : null;

  return (
    <div className="grid gap-5">
      {message ? (
        <p role={message.tone === "danger" ? "alert" : "status"} className={cn("rounded-xl px-4 py-2.5 text-sm font-semibold", STATUS_TONE_CLASS[message.tone])}>
          {message.text}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Follow-up</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[14rem_1fr]">
          <label className="text-sm font-semibold text-slate-800">
            Status
            <select className={input} value={status} onChange={(e) => setStatus(e.target.value as EnquiryStatus)}>
              {[enquiry.status, ...ADMIN_STATUSES.filter((s) => s !== enquiry.status)].map((value) => (
                <option key={value} value={value} disabled={value === "won" && enquiry.status !== "approved" && enquiry.status !== "won"}>
                  {ENQUIRY_STATUS_LABEL[value]}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-500">&ldquo;Active client&rdquo; is available once the customer has approved.</span>
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Internal notes
            <textarea className={input} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={3000} />
          </label>
        </div>
        <button type="button" onClick={saveStatus} disabled={busy !== null} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-70">
          {busy === "status" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null} Save follow-up
        </button>
      </section>

      <form onSubmit={saveQuote} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-busy={busy === "quote"}>
        <h2 className="text-base font-bold text-slate-900">Quotation</h2>
        <p className="mt-1 text-sm text-slate-500">
          Prefilled from the prices the customer enquired at. The figures saved here are the agreed price; later changes to the plan do not affect them.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="text-sm font-semibold text-slate-800">
            Monthly fee (₹)
            <input className={input} inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} required />
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Setup fee (₹)
            <input className={input} inputMode="decimal" value={setup} onChange={(e) => setSetup(e.target.value)} required />
          </label>
          <label className="text-sm font-semibold text-slate-800">
            GST %
            <input className={input} type="number" min={0} max={28} step="0.01" value={gst} onChange={(e) => setGst(e.target.value)} required />
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Commitment (months)
            <input className={input} type="number" min={0} max={60} value={commitment} onChange={(e) => setCommitment(e.target.value)} required />
          </label>
        </div>

        <h3 className="mt-6 text-sm font-bold text-slate-900">Add-ons and extra items</h3>
        <div className="mt-2 grid gap-2">
          {lines.map((line, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-[1fr_9rem_10rem_auto] md:items-end">
              <input aria-label="Item" className={input} value={line.label} placeholder="e.g. Logo design" onChange={(e) => setLines(lines.map((l, i) => (i === index ? { ...l, label: e.target.value } : l)))} required />
              <input aria-label="Amount in rupees" className={input} inputMode="decimal" value={line.amount} placeholder="₹" onChange={(e) => setLines(lines.map((l, i) => (i === index ? { ...l, amount: e.target.value } : l)))} required />
              <select aria-label="Charged" className={input} value={line.unit} onChange={(e) => setLines(lines.map((l, i) => (i === index ? { ...l, unit: e.target.value as AddonUnit } : l)))}>
                {ADDON_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {UNIT_LABEL[unit]}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setLines(lines.filter((_, i) => i !== index))} aria-label={`Remove ${line.label || "item"}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          <p className="text-xs text-slate-500">Per-page and per-product items: enter the total for the quantity agreed.</p>
          <button type="button" onClick={() => setLines([...lines, { label: "", amount: "", unit: "one_time" }])} className="inline-flex h-9 w-fit items-center gap-1.5 rounded-full px-4 text-sm font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add item
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_12rem]">
          <label className="text-sm font-semibold text-slate-800">
            Scope and notes for the customer
            <textarea className={input} rows={4} value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)} maxLength={3000} placeholder="What is included, timelines, what you need from them." />
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Valid until
            <input className={input} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
          </label>
        </div>

        {totals ? (
          <dl className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
            <div>
              <dt className="text-slate-500">One-time</dt>
              <dd className="font-bold tabular-nums">{formatPaise(totals.oneTimePaise)} + {formatPaise(totals.oneTimeGstPaise)} GST</dd>
            </div>
            <div>
              <dt className="text-slate-500">Monthly</dt>
              <dd className="font-bold tabular-nums">{formatPaise(totals.monthlyPaise)} + {formatPaise(totals.monthlyGstPaise)} GST</dd>
            </div>
            <div>
              <dt className="text-slate-500">First payment</dt>
              <dd className="font-bold tabular-nums">{formatPaise(totals.firstPaymentPaise)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Commitment value (ex. GST)</dt>
              <dd className="font-bold tabular-nums">{formatPaise(totals.commitmentValuePaise)}</dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy !== null || enquiry.status === "won"} className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-bold text-white disabled:opacity-60">
            {busy === "quote" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {enquiry.quotedAt ? "Revise quotation" : "Save quotation"}
          </button>
          {link ? (
            <>
              <button type="button" onClick={() => void navigator.clipboard.writeText(link).then(() => setMessage({ tone: "success", text: "Link copied." }))} className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">
                <Copy className="h-4 w-4" aria-hidden="true" /> Copy customer link
              </button>
              {whatsappToCustomer ? (
                <a href={whatsappToCustomer} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> Send on WhatsApp
                </a>
              ) : null}
            </>
          ) : null}
        </div>
      </form>
    </div>
  );
}
