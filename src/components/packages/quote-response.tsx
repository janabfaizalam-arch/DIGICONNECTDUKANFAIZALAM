"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

/**
 * The customer's approve / decline on their quotation. Approval needs their
 * typed name and an explicit tick; it records consent and charges nothing.
 */
export function QuoteResponse({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ kind: "idle" | "sending" } | { kind: "error"; message: string }>({ kind: "idle" });
  const [confirmDecline, setConfirmDecline] = useState(false);

  async function send(body: Record<string, unknown>) {
    setState({ kind: "sending" });
    const response = await fetch(`/api/digital-plans/quote/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
    if (!response?.ok) {
      setState({ kind: "error", message: data?.error ?? "Could not record your response. Please try again." });
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void send({ action: "approve", name: String(form.get("name") ?? ""), agree: form.get("agree") === "on" });
      }}
      className="grid gap-4"
    >
      <label className="text-sm font-semibold text-[var(--dc-ink)]">
        Your full name
        <input name="name" required minLength={2} maxLength={80} autoComplete="name" className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--dc-blue-bright)] focus:ring-2 focus:ring-[var(--dc-blue-bright)]/20" />
      </label>
      <label className="flex items-start gap-3 text-sm leading-6 text-[var(--dc-body)]">
        <input type="checkbox" name="agree" required className="mt-1 h-4 w-4 accent-[var(--dc-blue-bright)]" />
        I have read this quotation, including the scope, prices, GST and terms, and I approve it.
      </label>
      {state.kind === "error" ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state.kind === "sending"} className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--dc-flame)] px-6 text-[15px] font-bold text-white hover:bg-[var(--dc-flame-deep)] disabled:opacity-70">
          {state.kind === "sending" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          Approve quotation
        </button>
        {confirmDecline ? (
          <span className="inline-flex items-center gap-2 text-sm">
            Decline this quotation?
            <button type="button" onClick={() => void send({ action: "decline" })} className="font-bold text-red-700 underline">
              Yes, decline
            </button>
            <button type="button" onClick={() => setConfirmDecline(false)} className="font-semibold text-[var(--dc-muted)] underline">
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDecline(true)} className="text-sm font-semibold text-[var(--dc-muted)] underline-offset-2 hover:underline">
            Decline
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--dc-muted)]">Approving does not take a payment. We will contact you with the invoice for the setup fee after you approve.</p>
    </form>
  );
}
