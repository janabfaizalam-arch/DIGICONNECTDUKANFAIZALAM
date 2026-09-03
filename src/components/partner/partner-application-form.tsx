"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Copy,
  Footprints,
  MapPin,
  MessageCircle,
  Search,
  Store,
  UserRound,
} from "lucide-react";

import { AuthButton, TextField } from "@/components/auth/ui";
import { useToast } from "@/components/providers/toast-provider";
import {
  DIGI_PARTNER_TYPES,
  PUBLIC_APPLICATION_PARTNER_TYPES,
  type PublicApplicationPartnerType,
} from "@/lib/ap/partner-type";
import { DIGI_PARTNER_LOGIN_ROUTE } from "@/lib/auth/partner-access";

/**
 * Applying to become a Digi Partner.
 *
 * This form used to ask for sixteen things — PAN, Aadhaar, GSTIN, how you
 * heard about us, anything else we should know — from a shop owner who had
 * not yet been told whether we wanted them. It asked for an email and said
 * that email would be their login, which was never true. And it offered four
 * ways to partner, two of which are internal arrangements a stranger cannot
 * choose for themselves.
 *
 * What is left is the shortest thing an admin can act on: who you are, how to
 * reach you, and where you are. Documents belong to KYC, which happens after
 * approval and before money moves.
 */

const TYPE_ICONS: Record<PublicApplicationPartnerType, typeof Store> = {
  business_partner: Store,
  field_executive: Footprints,
};

type Form = {
  fullName: string;
  businessName: string;
  partnerType: PublicApplicationPartnerType;
  mobile: string;
  whatsapp: string;
  email: string;
  address: string;
  district: string;
  state: string;
  pin: string;
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
};

const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

export function PartnerApplicationForm() {
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<Form>(EMPTY);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [pinState, setPinState] = useState<"idle" | "looking" | "found" | "unknown">("idle");

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (fieldError?.field === key) setFieldError(null);
  }

  /*
    Six digits, and the rest of the address fills itself.

    Nobody standing in a shop wants to type "Jalaun" and "Uttar Pradesh" into
    a phone, and half of them will spell the district differently from the way
    the admin searches for it later. /api/pincode already existed and nothing
    was using it.
  */
  const pin = form.pin;
  const lastLooked = useRef<string>("");
  useEffect(() => {
    if (pin.length !== 6) {
      if (pin.length < 6) setPinState("idle");
      return;
    }
    if (lastLooked.current === pin) return;
    lastLooked.current = pin;

    let cancelled = false;
    setPinState("looking");

    void (async () => {
      try {
        const response = await fetch(`/api/pincode?pincode=${pin}`, { cache: "force-cache" });
        const json = (await response.json()) as {
          ok?: boolean;
          district?: string;
          state?: string;
          city?: string;
        };
        if (cancelled) return;
        if (!response.ok || !json.ok || !json.state) {
          setPinState("unknown");
          return;
        }
        setPinState("found");
        setForm((current) => ({
          ...current,
          district: json.district || json.city || current.district,
          state: json.state || current.state,
        }));
      } catch {
        if (!cancelled) setPinState("unknown");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pin]);

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
      <div className="flex flex-col gap-5 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[22px] font-bold tracking-tight text-slate-900">Application received</h2>
          <p className="mx-auto max-w-sm text-sm font-medium leading-relaxed text-slate-500">
            We review every application and call you on the number you gave us. Keep this code — it is
            how you check progress.
          </p>
        </div>

        <div className="mx-auto flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
          <span className="font-mono text-lg font-black tracking-wider text-slate-900">{submitted}</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(submitted);
              success("Tracking code copied.");
            }}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-900"
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
  const isShop = form.partnerType === "business_partner";

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <section className="flex flex-col gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
          How you want to partner
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PUBLIC_APPLICATION_PARTNER_TYPES.map((value) => {
            const meta = DIGI_PARTNER_TYPES[value];
            const Icon = TYPE_ICONS[value];
            const active = form.partnerType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => set("partnerType", value)}
                aria-pressed={active}
                className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-blue-500 bg-blue-50/70 shadow-[0_0_0_4px_rgba(37,99,235,0.10)]"
                    : "border-slate-200/90 bg-white/85 hover:border-slate-300"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <span className="text-sm font-bold text-slate-900">{meta.label}</span>
                <span className="text-xs font-medium leading-snug text-slate-500">
                  {meta.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <TextField
          label="Full name"
          icon={<UserRound className="h-4 w-4" />}
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          error={errorFor("fullName")}
          autoComplete="name"
          disabled={isPending}
        />

        {/*
          A shop has a name; a person walking the field does not. Asking a
          Field Executive for one only invites an invented answer.
        */}
        {isShop ? (
          <TextField
            label="Shop / business name"
            icon={<Building2 className="h-4 w-4" />}
            value={form.businessName}
            onChange={(e) => set("businessName", e.target.value)}
            error={errorFor("businessName")}
            autoComplete="organization"
            disabled={isPending}
          />
        ) : null}

        <TextField
          label="Mobile number"
          prefix="+91"
          inputMode="numeric"
          value={form.mobile}
          onChange={(e) => set("mobile", digits(e.target.value, 10))}
          error={errorFor("mobile")}
          hint="We call and WhatsApp you on this. It also becomes your login username."
          autoComplete="tel-national"
          disabled={isPending}
        />

        <TextField
          label="WhatsApp (optional)"
          icon={<MessageCircle className="h-4 w-4" />}
          inputMode="numeric"
          value={form.whatsapp}
          onChange={(e) => set("whatsapp", digits(e.target.value, 10))}
          error={errorFor("whatsapp")}
          hint="Only if it is different from the number above."
          disabled={isPending}
        />

        <TextField
          label="Email (optional)"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          error={errorFor("email")}
          autoComplete="email"
          disabled={isPending}
        />
      </section>

      <section className="flex flex-col gap-4">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
          Where you work
        </p>

        <TextField
          label="PIN code"
          icon={<MapPin className="h-4 w-4" />}
          inputMode="numeric"
          value={form.pin}
          onChange={(e) => set("pin", digits(e.target.value, 6))}
          error={errorFor("pin")}
          success={pinState === "found"}
          hint={
            pinState === "looking"
              ? "Looking up your area…"
              : pinState === "found"
                ? `${form.district}, ${form.state}`
                : pinState === "unknown"
                  ? "We could not find that PIN. Type your district and state below."
                  : "Six digits — district and state fill themselves."
          }
          disabled={isPending}
        />

        {/*
          Shown only when the PIN could not answer for itself. A pair of empty
          boxes that the next field is about to fill is just two more things to
          read on a phone.
        */}
        {pinState === "unknown" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="District / city"
              value={form.district}
              onChange={(e) => set("district", e.target.value)}
              disabled={isPending}
            />
            <TextField
              label="State"
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              disabled={isPending}
            />
          </div>
        ) : null}

        <TextField
          label={isShop ? "Shop address (optional)" : "Address (optional)"}
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          disabled={isPending}
        />
      </section>

      <div className="flex flex-col gap-3">
        <AuthButton type="submit" loading={isPending} loadingText="Sending…">
          Submit application
        </AuthButton>
        <p className="text-center text-[11.5px] font-medium leading-relaxed text-slate-500">
          No documents needed now. PAN and Aadhaar come later, before your first payout.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-slate-100 pt-4 text-center text-sm font-semibold text-slate-500">
        <span>
          Already applied?{" "}
          <Link href="/digi-partner/apply/status" className="text-slate-900 hover:underline">
            Track your application
          </Link>
        </span>
        <span>
          Already a partner?{" "}
          <Link href={DIGI_PARTNER_LOGIN_ROUTE} className="text-slate-900 hover:underline">
            Sign in
          </Link>
        </span>
      </div>
    </form>
  );
}
