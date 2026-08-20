"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, LoaderCircle, Search } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { DIGI_PARTNER_TYPES, DIGI_PARTNER_TYPE_VALUES } from "@/lib/ap/partner-type";
import { DIGI_PARTNER_LOGIN_ROUTE } from "@/lib/auth/partner-access";

const FIELD =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(15,93,184,0.08)]";
const LABEL = "text-xs font-bold uppercase tracking-[0.1em] text-slate-500";
const ERROR_FIELD = "border-rose-300 focus:border-rose-400";

type Form = {
  fullName: string;
  businessName: string;
  partnerType: string;
  mobile: string;
  whatsapp: string;
  email: string;
  address: string;
  district: string;
  state: string;
  pin: string;
  panNumber: string;
  aadhaarNumber: string;
  gstin: string;
  referralSource: string;
  about: string;
};

const EMPTY: Form = {
  fullName: "",
  businessName: "",
  partnerType: "business_partner",
  mobile: "",
  whatsapp: "",
  email: "",
  address: "",
  district: "",
  state: "",
  pin: "",
  panNumber: "",
  aadhaarNumber: "",
  gstin: "",
  referralSource: "",
  about: "",
};

export function PartnerApplicationForm() {
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<Form>(EMPTY);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (fieldError?.field === key) setFieldError(null);
  }

  function submit() {
    setFieldError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/partner-applications", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        });
        const result = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          field?: string;
          trackingCode?: string;
        };

        if (!response.ok || !result.ok) {
          if (result.field) setFieldError({ field: result.field, message: result.error ?? "" });
          throw new Error(result.error ?? "Your application could not be submitted.");
        }

        setSubmitted(result.trackingCode ?? null);
        success("Application submitted.");
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Your application could not be submitted.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="space-y-5 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900">Application received</h2>
          <p className="mx-auto max-w-md text-sm font-medium text-slate-600">
            Our team reviews applications and gets in touch on the mobile number you gave us. Keep
            this tracking code — it is how you check progress.
          </p>
        </div>

        <div className="mx-auto flex max-w-xs items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-3">
          <span className="font-mono text-lg font-black tracking-wider text-slate-900">{submitted}</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(submitted);
              success("Tracking code copied.");
            }}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Copy tracking code"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/digi-partner/apply/status?code=${encodeURIComponent(submitted)}`}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Track application
          </Link>
          <Link
            href={DIGI_PARTNER_LOGIN_ROUTE}
            className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Partner login
          </Link>
        </div>
      </div>
    );
  }

  const errorFor = (field: keyof Form) => (fieldError?.field === field ? fieldError.message : null);
  const cls = (field: keyof Form) => `${FIELD} ${errorFor(field) ? ERROR_FIELD : ""}`;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">How you want to partner</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {DIGI_PARTNER_TYPE_VALUES.map((value) => {
            const meta = DIGI_PARTNER_TYPES[value];
            const active = form.partnerType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => set("partnerType", value)}
                aria-pressed={active}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-[var(--primary)] bg-blue-50/60 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-black text-slate-900">
                  <span aria-hidden="true">{meta.icon}</span> {meta.label}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-600">{meta.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">About you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="fullName">Full name *</label>
            <input id="fullName" className={cls("fullName")} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="As per your PAN" />
            {errorFor("fullName") ? <p className="text-xs font-semibold text-rose-600">{errorFor("fullName")}</p> : null}
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="businessName">Shop / business name</label>
            <input id="businessName" className={cls("businessName")} value={form.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="mobile">Mobile *</label>
            <input id="mobile" inputMode="numeric" className={cls("mobile")} value={form.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="10-digit number" />
            {errorFor("mobile") ? <p className="text-xs font-semibold text-rose-600">{errorFor("mobile")}</p> : null}
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="whatsapp">WhatsApp</label>
            <input id="whatsapp" inputMode="numeric" className={cls("whatsapp")} value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="If different from mobile" />
            {errorFor("whatsapp") ? <p className="text-xs font-semibold text-rose-600">{errorFor("whatsapp")}</p> : null}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={LABEL} htmlFor="email">Email *</label>
            <input id="email" type="email" className={cls("email")} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
            {errorFor("email") ? <p className="text-xs font-semibold text-rose-600">{errorFor("email")}</p> : null}
            <p className="text-[11px] font-medium text-slate-500">This becomes your partner login once approved.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">Where you operate</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className={LABEL} htmlFor="address">Address</label>
            <input id="address" className={cls("address")} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Shop or home address" />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="district">District / city</label>
            <input id="district" className={cls("district")} value={form.district} onChange={(e) => set("district", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="state">State</label>
            <input id="state" className={cls("state")} value={form.state} onChange={(e) => set("state", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="pin">PIN code</label>
            <input id="pin" inputMode="numeric" className={cls("pin")} value={form.pin} onChange={(e) => set("pin", e.target.value)} placeholder="6 digits" />
            {errorFor("pin") ? <p className="text-xs font-semibold text-rose-600">{errorFor("pin")}</p> : null}
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="referralSource">How did you hear about us?</label>
            <input id="referralSource" className={cls("referralSource")} value={form.referralSource} onChange={(e) => set("referralSource", e.target.value)} placeholder="Friend, WhatsApp, YouTube…" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">
          Documents <span className="font-bold normal-case tracking-normal text-slate-500">— optional now, needed before payouts</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="panNumber">PAN</label>
            <input id="panNumber" className={cls("panNumber")} value={form.panNumber} onChange={(e) => set("panNumber", e.target.value.toUpperCase())} placeholder="ABCDE1234F" />
            {errorFor("panNumber") ? <p className="text-xs font-semibold text-rose-600">{errorFor("panNumber")}</p> : null}
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="aadhaarNumber">Aadhaar</label>
            <input id="aadhaarNumber" inputMode="numeric" className={cls("aadhaarNumber")} value={form.aadhaarNumber} onChange={(e) => set("aadhaarNumber", e.target.value)} placeholder="12 digits" />
            {errorFor("aadhaarNumber") ? <p className="text-xs font-semibold text-rose-600">{errorFor("aadhaarNumber")}</p> : null}
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="gstin">GSTIN</label>
            <input id="gstin" className={cls("gstin")} value={form.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} placeholder="If registered" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="about">Anything else we should know?</label>
          <textarea id="about" rows={3} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(15,93,184,0.08)]" value={form.about} onChange={(e) => set("about", e.target.value)} placeholder="Your experience, services you already offer…" />
          {errorFor("about") ? <p className="text-xs font-semibold text-rose-600">{errorFor("about")}</p> : null}
        </div>
      </section>

      <div className="space-y-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Submit application
        </button>
        <p className="text-center text-xs font-medium text-slate-500">
          Already applied?{" "}
          <Link href="/digi-partner/apply/status" className="font-bold text-[var(--primary)] hover:underline">
            Track your application
          </Link>
          {" · "}
          Already a partner?{" "}
          <Link href={DIGI_PARTNER_LOGIN_ROUTE} className="font-bold text-[var(--primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
