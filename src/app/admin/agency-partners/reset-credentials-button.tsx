"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";

/**
 * Put every partner onto number-based credentials, in one press.
 *
 * The endpoint works in slices because forty-odd sequential calls to the Auth
 * admin API is longer than a serverless request should run, so this keeps
 * asking for the next window until the server says it is done, and shows the
 * count as it goes rather than appearing to hang.
 *
 * It asks first, and the question says plainly what it does: this replaces the
 * password of every partner, including any who chose their own.
 */

type Slice = {
  ok?: boolean;
  error?: string;
  updated?: number;
  processed?: number;
  skipped?: { partner: string; reason: string }[];
  nextOffset?: number;
  total?: number;
  done?: boolean;
};

export function ResetCredentialsButton({ partnerCount }: { partnerCount: number }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ updated: number; total: number } | null>(null);

  async function run() {
    const confirmed = window.confirm(
      `Sabhi ${partnerCount} DC Partners ka username unka mobile number aur password "Dc@<number>" kar diya jayega.\n\n` +
        `Jin partners ne apna password bana rakha hai, unka bhi badal jayega — unhe dobara number wale password se login karna padega.\n\n` +
        `Aage badhein?`,
    );
    if (!confirmed) return;

    setRunning(true);
    setProgress({ updated: 0, total: partnerCount });

    let offset = 0;
    let updated = 0;
    const skipped: { partner: string; reason: string }[] = [];

    try {
      // Guard against a server that never reports `done`; one pass per
      // partner is already more than enough.
      for (let guard = 0; guard <= partnerCount + 5; guard += 1) {
        const response = await fetch("/api/admin/agency-partners/reset-to-default", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset }),
        });
        const slice = (await response.json().catch(() => ({}))) as Slice;

        if (!response.ok || !slice.ok) {
          throw new Error(slice.error ?? "Reset could not be completed.");
        }

        updated += slice.updated ?? 0;
        if (slice.skipped?.length) skipped.push(...slice.skipped);
        setProgress({ updated, total: slice.total ?? partnerCount });

        if (slice.done) break;
        offset = slice.nextOffset ?? offset + (slice.processed ?? 0);
      }

      if (skipped.length) {
        toastError(
          `${updated} partners ho gaye. ${skipped.length} chhoot gaye — ` +
            skipped
              .slice(0, 3)
              .map((s) => `${s.partner}: ${s.reason}`)
              .join(" | "),
        );
      } else {
        success(`${updated} partners ab apne number se login kar sakte hain.`);
      }

      router.refresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Reset could not be completed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void run()}
      disabled={running}
      title="Har partner ka username = mobile number, password = Dc@<number>. Login par unse naya password maanga jayega."
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ds-border bg-ds-surface px-4 text-sm font-bold text-ds-text-secondary shadow-ds-sm transition hover:bg-ds-surface-sunken disabled:opacity-60"
    >
      {running ? (
        <LoaderCircle className="h-4 w-4 animate-spin text-ds-primary" aria-hidden="true" />
      ) : (
        <KeyRound className="h-4 w-4 text-ds-primary" aria-hidden="true" />
      )}
      {running && progress
        ? `Reset ho raha hai… ${progress.updated}/${progress.total}`
        : "Number wale login par laayein"}
    </button>
  );
}
