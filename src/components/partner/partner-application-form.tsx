"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, Copy, Lock, Mail, MapPin, Search, UserRound } from "lucide-react";

import { AuthButton, TextField } from "@/components/auth/ui";
import { FormPrivacyNotice } from "@/components/privacy/form-privacy-notice";
import { useToast } from "@/components/providers/toast-provider";
import { DIGI_PARTNER_LOGIN_ROUTE } from "@/lib/auth/partner-access";
import { isValidMobile } from "@/lib/partner-applications";

import { clearDraft, loadDraft, saveDraft } from "./partner-application-draft";
import { errorForField, firstError, type ApplicationFields } from "./partner-application-validation";

/**
 * Applying to become a DC Partner.
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
 *
 * The questions were right; getting through them was not. Every mistake cost a
 * round trip and came back naming one field, so three mistakes meant three
 * submissions — and nothing moved the applicant to the field that was wrong,
 * which on a phone is a red message about a box that is off the screen. The
 * rules now run in the browser first, using the server's own validator rather
 * than a second copy of it, and whatever is wrong gets focused.
 */

type Form = ApplicationFields;

const EMPTY: Form = {
  fullName: "",
  businessName: "",
  mobile: "",
  email: "",
  district: "",
  state: "",
  pin: "",
  password: "",
};

const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

/** What the applicant ends on: a code, and whether we already had one from them. */
type Finished = { code: string | null; alreadyApplied: boolean };

export function PartnerApplicationForm() {
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [finished, setFinished] = useState<Finished | null>(null);
  const [pinState, setPinState] = useState<"idle" | "looking" | "found" | "unknown">("idle");
  const [restored, setRestored] = useState(false);

  /* Focusing the field that is wrong needs a handle on it. */
  const fieldRefs = useRef<Partial<Record<keyof Form, HTMLInputElement | null>>>({});
  const bindRef = (key: keyof Form) => (el: HTMLInputElement | null) => {
    fieldRefs.current[key] = el;
  };

  /*
    Bring the applicant to the problem instead of describing it.

    A toast that says "Enter a valid 10-digit mobile number" is no help when
    the mobile box is three scrolls up.

    The field is put in the UPPER third of the screen, not the middle. On a
    phone the bottom half is spoken for: focusing an input raises the keyboard
    over it, and a first-time visitor still has the cookie consent sheet
    sitting there. Centring was tried first and did exactly that — the field
    scrolled to the middle and landed behind the consent sheet. Geometry said
    it was in the viewport; the applicant could not see it.
  */
  const REVEAL_FROM_TOP = 0.28;

  const revealField = useCallback((field: keyof Form) => {
    const el = fieldRefs.current[field];
    if (!el) return;
    el.focus({ preventScroll: true });
    const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * REVEAL_FROM_TOP;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, []);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    // Clear as they fix it; re-checked on blur and again on submit.
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  /** Check one field as the applicant leaves it, with the server's own rules. */
  function checkOnBlur(key: keyof Form) {
    const message = errorForField(key, form);
    setErrors((current) => {
      if (!message) {
        if (!current[key]) return current;
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: message };
    });
  }

  /* ── Draft ────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const draft = loadDraft(EMPTY);
    if (draft) {
      setForm({ ...EMPTY, ...draft, password: "" });
      setRestored(true);
    }
  }, []);

  useEffect(() => {
    // Nothing worth keeping until they have actually started.
    if (form.fullName || form.mobile || form.businessName || form.pin) {
      // The password is never written to the device.
      saveDraft({ ...form, password: "" });
    }
  }, [form]);

  /* ── PIN lookup ───────────────────────────────────────────────────────── */

  /*
    Six digits, and the rest of the address fills itself.

    Nobody standing in a shop wants to type "Jalaun" and "Uttar Pradesh" into
    a phone, and half of them will spell the district differently from the way
    the admin searches for it later. /api/pincode already existed and nothing
    was using it.
  */
  const pin = form.pin;
  /*
    Only a lookup that answered is remembered. This used to record the attempt
    itself, so a PIN that failed on a dropped connection could never be tried
    again — retyping the same six digits did nothing and the applicant was
    stuck typing their district by hand.
  */
  const resolved = useRef<string>("");
  useEffect(() => {
    if (pin.length !== 6) {
      if (pin.length < 6) setPinState("idle");
      return;
    }
    if (resolved.current === pin) return;

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
        resolved.current = pin;
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

  /* ── Submit ───────────────────────────────────────────────────────────── */

  function submit() {
    /*
      Checked here first, so a typo costs nothing. The rules come from
      `validatePartnerApplication`, the same function the route runs — the
      server still has the final say, this only saves the trip.
    */
    const problem = firstError(form);
    if (problem) {
      setErrors((current) => ({ ...current, [problem.field]: problem.message }));
      revealField(problem.field);
      return;
    }

    setErrors({});

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
          /*
            "You already have an application under review" used to be a red
            toast and nothing else, while the reply carried the tracking code
            the applicant needed. They were told to go away with no way to
            follow it up. Now that answer ends the form properly.
          */
          if (response.status === 409 && result.trackingCode) {
            clearDraft();
            setFinished({ code: result.trackingCode, alreadyApplied: true });
            return;
          }

          if (result.field) {
            const field = result.field as keyof Form;
            if (field in form) {
              setErrors((current) => ({ ...current, [field]: result.error ?? "" }));
              revealField(field);
            }
          }
          throw new Error(result.error ?? "Your application could not be submitted.");
        }

        clearDraft();
        setFinished({ code: result.trackingCode ?? null, alreadyApplied: false });
        success("Application submitted.");
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Your application could not be submitted.");
      }
    });
  }

  /* ── Done ─────────────────────────────────────────────────────────────── */

  if (finished) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[22px] font-bold tracking-tight text-slate-900">
            {finished.alreadyApplied ? "You have already applied" : "Application received"}
          </h2>
          <p className="mx-auto max-w-sm text-sm font-medium leading-relaxed text-slate-500">
            {finished.alreadyApplied
              ? "Your earlier application is still with us. There is nothing more to send — here is the code to follow it."
              : "We review every application and call you on the number you gave us. Keep this code — it is how you check progress."}
          </p>
        </div>

        {finished.code ? (
          <div className="mx-auto flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
            <span className="font-mono text-lg font-black tracking-wider text-slate-900">
              {finished.code}
            </span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(finished.code ?? "");
                success("Tracking code copied.");
              }}
              className="rounded-full p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-900"
              aria-label="Copy tracking code"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={
              finished.code
                ? `/become-dc-partner/apply/status?code=${encodeURIComponent(finished.code)}`
                : "/become-dc-partner/apply/status"
            }
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

  /* ── Form ─────────────────────────────────────────────────────────────── */

  const errorFor = (field: keyof Form) => errors[field] ?? null;

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {restored ? (
        <p
          role="status"
          className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs font-semibold text-blue-800"
        >
          We brought back what you had already filled in. Carry on from where you stopped.
        </p>
      ) : null}

      <section className="flex flex-col gap-4">
        <TextField
          ref={bindRef("fullName")}
          label="Full name"
          icon={<UserRound className="h-4 w-4" />}
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          onBlur={() => checkOnBlur("fullName")}
          error={errorFor("fullName")}
          autoComplete="name"
          disabled={isPending}
        />

        <TextField
          ref={bindRef("businessName")}
          label="Shop name"
          icon={<Building2 className="h-4 w-4" />}
          value={form.businessName}
          onChange={(e) => set("businessName", e.target.value)}
          onBlur={() => checkOnBlur("businessName")}
          error={errorFor("businessName")}
          autoComplete="organization"
          disabled={isPending}
        />

        <TextField
          ref={bindRef("mobile")}
          label="Mobile number"
          prefix="+91"
          type="tel"
          inputMode="numeric"
          value={form.mobile}
          onChange={(e) => set("mobile", digits(e.target.value, 10))}
          onBlur={() => checkOnBlur("mobile")}
          error={errorFor("mobile")}
          success={!errorFor("mobile") && isValidMobile(form.mobile)}
          hint="This is also your login ID."
          autoComplete="tel-national"
          disabled={isPending}
        />

        <TextField
          ref={bindRef("email")}
          label="Email (Gmail)"
          icon={<Mail className="h-4 w-4" />}
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          onBlur={() => checkOnBlur("email")}
          error={errorFor("email")}
          autoComplete="email"
          hint="Password reset links are sent here."
          disabled={isPending}
        />
      </section>

      <section className="flex flex-col gap-4">
        <TextField
          ref={bindRef("pin")}
          label="PIN code"
          icon={<MapPin className="h-4 w-4" />}
          inputMode="numeric"
          value={form.pin}
          onChange={(e) => set("pin", digits(e.target.value, 6))}
          onBlur={() => checkOnBlur("pin")}
          error={errorFor("pin")}
          success={pinState === "found"}
          hint={
            pinState === "looking"
              ? "Looking up your area…"
              : pinState === "found"
                ? `City: ${form.district} · State: ${form.state}`
                : pinState === "unknown"
                  ? "PIN not found. Type your city and state below."
                  : "City and state fill in automatically."
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
              ref={bindRef("district")}
              label="City"
              value={form.district}
              onChange={(e) => set("district", e.target.value)}
              disabled={isPending}
            />
            <TextField
              ref={bindRef("state")}
              label="State"
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              disabled={isPending}
            />
          </div>
        ) : null}

        <TextField
          ref={bindRef("password")}
          label="Create password"
          secure
          icon={<Lock className="h-4 w-4" />}
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          onBlur={() => checkOnBlur("password")}
          error={errorFor("password")}
          autoComplete="new-password"
          hint="At least 8 characters. You sign in with your mobile number and this password once approved."
          disabled={isPending}
        />
      </section>

      <div className="flex flex-col gap-3">
        <AuthButton type="submit" loading={isPending} loadingText="Sending…">
          Submit application
        </AuthButton>
        <p className="text-center text-[11.5px] font-medium leading-relaxed text-slate-600">
          No documents needed now. PAN and Aadhaar come later, before your first payout.
        </p>
        <FormPrivacyNotice
          className="text-center"
          purpose="to review your DC Partner application and contact you about it"
        />
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-slate-100 pt-4 text-center text-sm font-semibold text-slate-500">
        <span>
          Already applied?{" "}
          <Link href="/become-dc-partner/apply/status" className="text-slate-900 hover:underline">
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
