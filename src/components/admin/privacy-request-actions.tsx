"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/providers/toast-provider";

type Status = "pending" | "verification_required" | "in_review" | "completed" | "rejected";
type Verification = "unverified" | "verified" | "failed";

const NEXT: Record<Status, { status: Status; label: string }[]> = {
  pending: [
    { status: "verification_required", label: "Verify identity" },
    { status: "in_review", label: "Start review" },
    { status: "rejected", label: "Reject" },
  ],
  verification_required: [
    { status: "in_review", label: "Start review" },
    { status: "rejected", label: "Reject" },
  ],
  in_review: [
    { status: "verification_required", label: "Back to verification" },
    { status: "completed", label: "Mark completed" },
    { status: "rejected", label: "Reject" },
  ],
  completed: [],
  rejected: [],
};

const button =
  "inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

/**
 * Workflow buttons for one privacy request.
 *
 * Completing is refused by the server until identity is marked verified, and
 * every status change asks for a note so the record says why.
 */
export function PrivacyRequestActions({
  id,
  reference,
  status,
  verification,
}: {
  id: string;
  reference: string;
  status: Status;
  verification: Verification;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function send(payload: Record<string, unknown>, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/privacy-requests/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!response.ok || !result.ok) throw new Error(result.error || "Update failed.");
        success(`${reference} updated.`);
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Update failed.");
      } finally {
        setBusy(false);
      }
    });
  }

  function changeStatus(next: Status, label: string) {
    const note = window.prompt(`${label} — ${reference}. Add a note for the record:`);
    if (note === null) return;
    send({ status: next, notes: note.trim() || `${label}.` });
  }

  const disabled = busy || isPending;

  return (
    <div className="flex flex-wrap gap-1.5">
      {verification !== "verified" && status !== "completed" && status !== "rejected" ? (
        <button
          type="button"
          className={button}
          disabled={disabled}
          onClick={() =>
            send(
              { verificationStatus: "verified", notes: "Identity verified against the registered mobile." },
              `Confirm you have verified that ${reference} was made by the account holder (e.g. by calling the registered mobile).`,
            )
          }
        >
          Mark identity verified
        </button>
      ) : null}
      {NEXT[status].map((action) => (
        <button key={action.status} type="button" className={button} disabled={disabled} onClick={() => changeStatus(action.status, action.label)}>
          {action.label}
        </button>
      ))}
      <button type="button" className={button} disabled={disabled} onClick={() => send({ assignToMe: true })}>
        Assign to me
      </button>
    </div>
  );
}
