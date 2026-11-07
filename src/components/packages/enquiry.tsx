"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, Loader2, MessageCircle, X } from "lucide-react";

import { formatAddonPrice, formatPrice } from "@/lib/digital-plans/money";
import type { AddonUnit } from "@/lib/digital-plans/types";
import { cn } from "@/lib/utils";

/**
 * The "Get Started" enquiry.
 *
 * One dialog per page, opened by any EnquireButton with its plan. It sends an
 * enquiry — no payment, no subscription — and says so before the customer
 * types anything.
 */

export type EnquiryPlan = {
  slug: string;
  name: string;
  monthlyPricePaise: number;
  setupFeePaise: number;
  priceIsStarting: boolean;
  commitmentMonths: number;
  addons: { slug: string; name: string; pricePaise: number; unit: AddonUnit; priceIsStarting: boolean }[];
};

type Ctx = { open: (slug: string) => void };
const EnquiryContext = createContext<Ctx | null>(null);

export function EnquiryProvider({ plans, whatsappUrl, children }: { plans: EnquiryPlan[]; whatsappUrl: string; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const plan = plans.find((item) => item.slug === slug) ?? null;

  const open = useCallback((next: string) => {
    setSlug(next);
    dialogRef.current?.showModal();
  }, []);

  // "Get Started" from the homepage links here with ?enquire=<slug>; open the form for it.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("enquire");
    if (wanted && plans.some((item) => item.slug === wanted)) open(wanted);
  }, [plans, open]);

  return (
    <EnquiryContext.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="enquiry-title"
        onClose={() => setSlug(null)}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-auto max-h-[92dvh] w-[min(36rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[28px] bg-white p-0 text-[var(--dc-ink)] shadow-[0_40px_120px_-30px_rgba(1,29,95,0.6)] backdrop:bg-[rgba(0,21,54,0.55)] backdrop:backdrop-blur-sm"
      >
        {plan ? <EnquiryForm key={plan.slug} plan={plan} whatsappUrl={whatsappUrl} onClose={() => dialogRef.current?.close()} /> : null}
      </dialog>
    </EnquiryContext.Provider>
  );
}

export function EnquireButton({ planSlug, planName, className, children }: { planSlug: string; planName: string; className?: string; children?: ReactNode }) {
  const ctx = useContext(EnquiryContext);
  return (
    <button
      type="button"
      onClick={() => ctx?.open(planSlug)}
      aria-haspopup="dialog"
      aria-label={children ? undefined : `Get started with ${planName}`}
      className={className}
      data-cursor="magnetic"
    >
      {children ?? (
        <>
          Get Started <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </>
      )}
    </button>
  );
}

const field =
  "mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-[var(--dc-ink)] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--dc-blue-bright)] focus:ring-2 focus:ring-[var(--dc-blue-bright)]/20";

function EnquiryForm({ plan, whatsappUrl, onClose }: { plan: EnquiryPlan; whatsappUrl: string; onClose: () => void }) {
  const id = useId();
  const [state, setState] = useState<{ kind: "idle" } | { kind: "sending" } | { kind: "error"; message: string } | { kind: "done"; reference: string }>({ kind: "idle" });
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.kind === "error") errorRef.current?.focus();
  }, [state]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState({ kind: "sending" });
    try {
      const response = await fetch("/api/digital-plans/enquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planSlug: plan.slug,
          name: String(data.get("name") ?? ""),
          mobile: String(data.get("mobile") ?? ""),
          email: String(data.get("email") ?? ""),
          businessName: String(data.get("businessName") ?? ""),
          requirements: String(data.get("requirements") ?? ""),
          addonSlugs: data.getAll("addons").map(String),
          website: String(data.get("website") ?? ""),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; reference?: string };
      if (!response.ok || !body.reference) {
        setState({ kind: "error", message: body.error ?? "Something went wrong. Please try again or message us on WhatsApp." });
        return;
      }
      setState({ kind: "done", reference: body.reference });
    } catch {
      setState({ kind: "error", message: "No connection. Please try again or message us on WhatsApp." });
    }
  }

  return (
    <div className="relative">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 pb-4 pt-6 backdrop-blur sm:px-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--dc-flame)]">Get started</p>
          <h2 id="enquiry-title" className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-[-0.03em]">
            {plan.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--dc-body)]">
            <strong className="font-semibold text-[var(--dc-ink)]">{formatPrice(plan.monthlyPricePaise, plan.priceIsStarting)}</strong>/month +{" "}
            {formatPrice(plan.setupFeePaise, plan.priceIsStarting)} one-time setup · GST extra
            {plan.commitmentMonths ? ` · ${plan.commitmentMonths}-month minimum` : ""}
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-bright)]" aria-label="Close">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {state.kind === "done" ? (
        <div className="px-6 pb-8 pt-8 text-center sm:px-8" role="status">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden="true" />
          <h3 className="mt-4 font-[family-name:var(--font-heading)] text-xl font-semibold">Enquiry received</h3>
          <p className="mt-2 text-[15px] leading-7 text-[var(--dc-body)]">
            Your reference is <strong className="text-[var(--dc-ink)]">{state.reference}</strong>. We will call you within one working day, then send a written
            quotation for you to review. Nothing is charged until you approve it.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700">
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp us
            </a>
            <button type="button" onClick={onClose} className="inline-flex h-11 items-center rounded-full px-5 text-sm font-bold text-[var(--dc-ink)] ring-1 ring-slate-200 hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4 px-6 pb-7 pt-5 sm:px-8" noValidate={false}>
          <p className="rounded-2xl bg-[var(--dc-sky-soft)] px-4 py-3 text-[13px] leading-5 text-[var(--dc-body)]">
            This is an enquiry, not a purchase. We prepare a written quotation and nothing starts or is billed until you approve it.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold" htmlFor={`${id}-name`}>
              Your name *
              <input id={`${id}-name`} name="name" required minLength={2} maxLength={80} autoComplete="name" className={field} />
            </label>
            <label className="text-sm font-semibold" htmlFor={`${id}-mobile`}>
              Mobile number *
              <input id={`${id}-mobile`} name="mobile" required inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" className={field} />
            </label>
            <label className="text-sm font-semibold" htmlFor={`${id}-email`}>
              Email
              <input id={`${id}-email`} name="email" type="email" maxLength={120} autoComplete="email" className={field} />
            </label>
            <label className="text-sm font-semibold" htmlFor={`${id}-business`}>
              Business name
              <input id={`${id}-business`} name="businessName" maxLength={120} autoComplete="organization" className={field} />
            </label>
          </div>
          <label className="text-sm font-semibold" htmlFor={`${id}-req`}>
            What do you need?
            <textarea id={`${id}-req`} name="requirements" rows={3} maxLength={2000} placeholder="Tell us about your business and what you want the website to do." className={field} />
          </label>
          {plan.addons.length ? (
            <fieldset>
              <legend className="text-sm font-semibold">Interested in any add-ons? (optional)</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {plan.addons.map((addon) => (
                  <label key={addon.slug} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm transition has-[:checked]:border-[var(--dc-blue-bright)] has-[:checked]:bg-[var(--dc-sky-soft)]">
                    <input type="checkbox" name="addons" value={addon.slug} className="mt-0.5 h-4 w-4 accent-[var(--dc-blue-bright)]" />
                    <span>
                      <span className="block font-medium text-[var(--dc-ink)]">{addon.name}</span>
                      <span className="text-xs text-[var(--dc-muted)]">{formatAddonPrice(addon.pricePaise, addon.unit, addon.priceIsStarting)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <label className="hidden" aria-hidden="true">
            Leave empty
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          {state.kind === "error" ? (
            <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 outline-none ring-1 ring-red-200">
              {state.message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={state.kind === "sending"}
            className={cn(
              "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--dc-flame)] px-6 text-[15px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(247,74,1,0.7)] transition hover:bg-[var(--dc-flame-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-bright)] focus-visible:ring-offset-2 disabled:opacity-70",
            )}
          >
            {state.kind === "sending" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {state.kind === "sending" ? "Sending…" : "Send enquiry"}
          </button>
          <p className="text-center text-xs text-[var(--dc-muted)]">
            Prefer to talk?{" "}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--dc-blue-bright)] underline-offset-2 hover:underline">
              Message us on WhatsApp
            </a>
          </p>
        </form>
      )}
    </div>
  );
}
