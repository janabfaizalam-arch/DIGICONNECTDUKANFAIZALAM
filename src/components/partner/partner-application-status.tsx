"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, LoaderCircle, Search, XCircle } from "lucide-react";

import { DIGI_PARTNER_LOGIN_ROUTE } from "@/lib/auth/partner-access";
import type { PartnerApplicationStatus } from "@/lib/partner-applications";

type Application = {
  fullName: string;
  status: PartnerApplicationStatus;
  statusLabel: string;
  partnerCode: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
};

const TONE: Record<PartnerApplicationStatus, { icon: typeof Clock; card: string; text: string }> = {
  pending: { icon: Clock, card: "border-amber-200 bg-amber-50/60", text: "text-amber-700" },
  under_review: { icon: Clock, card: "border-blue-200 bg-blue-50/60", text: "text-blue-700" },
  approved: { icon: CheckCircle2, card: "border-emerald-200 bg-emerald-50/60", text: "text-emerald-700" },
  rejected: { icon: XCircle, card: "border-rose-200 bg-rose-50/60", text: "text-rose-700" },
};

const MESSAGE: Record<PartnerApplicationStatus, string> = {
  pending: "We have your application and it is in the queue. We will reach out on WhatsApp once it is reviewed.",
  under_review: "Our team is going through your details right now. We will be in touch shortly.",
  approved: "You are in. Sign in with the email you applied with — we have sent your password separately.",
  rejected: "We could not take this application forward. You are welcome to apply again with updated details.",
};

export function PartnerApplicationStatusLookup({ initialCode }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [application, setApplication] = useState<Application | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function lookup(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter your tracking code.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/partner-applications/status?code=${encodeURIComponent(trimmed)}`,
        );
        const result = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          application?: Application;
        };

        if (!response.ok || !result.ok || !result.application) {
          setApplication(null);
          throw new Error(result.error ?? "No application found for that code.");
        }

        setApplication(result.application);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not check that code.");
      }
    });
  }

  // A code arriving in the URL — from the submit screen — should resolve
  // without the applicant having to press anything.
  useEffect(() => {
    if (initialCode) lookup(initialCode);
  }, [initialCode]);

  const tone = application ? TONE[application.status] : null;
  const Icon = tone?.icon ?? Clock;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") lookup(code);
          }}
          placeholder="DPA-XXXXXXXXXXXX"
          aria-label="Tracking code"
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-mono text-base tracking-wider text-slate-900 outline-none transition placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(15,93,184,0.08)]"
        />
        <button
          type="button"
          onClick={() => lookup(code)}
          disabled={isPending}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          Check
        </button>
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}

      {application && tone ? (
        <div className={`space-y-4 rounded-3xl border p-6 ${tone.card}`}>
          <div className="flex items-start gap-3">
            <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${tone.text}`} aria-hidden="true" />
            <div className="space-y-1">
              <p className={`text-lg font-black ${tone.text}`}>{application.statusLabel}</p>
              <p className="text-sm font-medium text-slate-700">{MESSAGE[application.status]}</p>
            </div>
          </div>

          <dl className="grid gap-3 border-t border-white/60 pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Applicant</dt>
              <dd className="font-bold text-slate-900">{application.fullName}</dd>
            </div>
            {application.partnerCode ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Partner code</dt>
                <dd className="font-mono font-bold text-slate-900">{application.partnerCode}</dd>
              </div>
            ) : null}
          </dl>

          {application.status === "approved" ? (
            <Link
              href={DIGI_PARTNER_LOGIN_ROUTE}
              className="inline-flex h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Go to partner login
            </Link>
          ) : null}

          {application.status === "rejected" ? (
            <Link
              href="/digi-partner/apply"
              className="inline-flex h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Apply again
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
