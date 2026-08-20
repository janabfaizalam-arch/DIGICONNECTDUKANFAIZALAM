"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, Eye, LoaderCircle, XCircle } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import {
  allowedApplicationTransitions,
  type PartnerApplicationStatus,
} from "@/lib/partner-applications";

const ACTION_META: Record<
  PartnerApplicationStatus,
  { label: string; icon: typeof CheckCircle2; className: string } | null
> = {
  pending: null,
  under_review: {
    label: "Start review",
    icon: Eye,
    className: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  },
  approved: {
    label: "Approve",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  rejected: {
    label: "Reject",
    icon: XCircle,
    className: "border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700",
  },
};

export function PartnerApplicationActions({
  applicationId,
  applicantName,
  status,
}: {
  applicationId: string;
  applicantName: string;
  status: PartnerApplicationStatus;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ code: string; password: string } | null>(null);

  const actions = allowedApplicationTransitions(status);

  function run(next: PartnerApplicationStatus) {
    if (next === "approved") {
      // Approving provisions a live login and is not reversible from here.
      if (
        !window.confirm(
          `Approve ${applicantName}? This creates their partner account and login straight away.`,
        )
      ) {
        return;
      }
    }

    let notes: string | null = null;
    if (next === "rejected") {
      notes = window.prompt(`Why is ${applicantName}'s application not going forward?`) ?? null;
      if (notes === null) return;
    }

    setBusy(next);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/partner-applications/${applicationId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: next, notes }),
        });
        const result = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          partnerCode?: string | null;
          temporaryPassword?: string | null;
        };

        if (!response.ok || !result.ok) throw new Error(result.message ?? "Update failed.");

        if (result.temporaryPassword && result.partnerCode) {
          // Shown once — it is never stored, so it cannot be looked up later.
          setCredentials({ code: result.partnerCode, password: result.temporaryPassword });
        }

        success(result.message ?? "Application updated.");
        router.refresh();
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Update failed.");
      } finally {
        setBusy(null);
      }
    });
  }

  if (credentials) {
    return (
      <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-left">
        <p className="text-xs font-black uppercase tracking-[0.1em] text-emerald-800">
          Share these once
        </p>
        <p className="text-xs font-semibold text-emerald-900">
          Partner code: <span className="font-mono font-black">{credentials.code}</span>
        </p>
        <p className="text-xs font-semibold text-emerald-900">
          Password: <span className="font-mono font-black">{credentials.password}</span>
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(
                `Partner code: ${credentials.code}\nPassword: ${credentials.password}`,
              );
              success("Credentials copied.");
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-3 text-[11px] font-bold text-emerald-800"
          >
            <Copy className="h-3 w-3" aria-hidden="true" />
            Copy
          </button>
          <button
            type="button"
            onClick={() => setCredentials(null)}
            className="inline-flex h-8 items-center rounded-full px-3 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
          >
            Done
          </button>
        </div>
        <p className="text-[11px] font-medium text-emerald-800">
          This password is not stored. If it is lost, the partner must reset it.
        </p>
      </div>
    );
  }

  if (!actions.length) {
    return <span className="text-xs font-semibold text-slate-400">No actions</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((next) => {
        const meta = ACTION_META[next];
        if (!meta) return null;
        const Icon = meta.icon;
        const loading = isPending && busy === next;
        return (
          <button
            key={next}
            type="button"
            disabled={isPending}
            onClick={() => run(next)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition disabled:opacity-50 ${meta.className}`}
          >
            {loading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
