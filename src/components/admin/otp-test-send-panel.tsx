"use client";

import { LoaderCircle, Send, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";

type TestSendResponse = {
  ok?: boolean;
  error?: string;
  maskedPhone?: string;
  submittedMessageId?: string | null;
  campaignName?: string;
};

type StatusResponse = {
  ok?: boolean;
  error?: string;
  stored?: {
    deliveryStatus?: string | null;
    campaign?: string | null;
    phoneMasked?: string | null;
  } | null;
  providerStatus?: {
    deliveryStatus?: string | null;
    guidance?: string;
  };
};

/**
 * Sends a real signup OTP to a number the admin controls, then lets them look up
 * what happened to it. This is the only way to tell a broken campaign apart from
 * a healthy one without leaving the app.
 */
export function OtpTestSendPanel({ webhookConfigured }: { webhookConfigured: boolean }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookupResult, setLookupResult] = useState<string | null>(null);

  async function runTestSend() {
    if (sending || phone.length !== 10) return;

    const confirmed = window.confirm(
      `Send a real WhatsApp OTP to +91 ${phone}?\n\nUse a number you can check yourself. This consumes one AiSensy message.`,
    );
    if (!confirmed) return;

    setSending(true);
    setLookupResult(null);
    try {
      const response = await fetch("/api/admin/diagnostics/otp-test-send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, confirm: true }),
      });
      const result = (await response.json().catch(() => ({}))) as TestSendResponse;

      if (!response.ok || !result.ok) {
        toastError(result.error ?? "Test send failed.");
        return;
      }

      const messageId = result.submittedMessageId ?? null;
      setLastMessageId(messageId);
      if (messageId) setLookupId(messageId);
      success(
        messageId
          ? "AiSensy accepted the send. Now check whether the message actually arrives."
          : "AiSensy accepted the send but returned no message id.",
      );
      router.refresh();
    } catch {
      toastError("Test send failed.");
    } finally {
      setSending(false);
    }
  }

  async function runLookup() {
    const id = lookupId.trim();
    if (looking || !id) return;

    setLooking(true);
    try {
      const response = await fetch(
        `/api/admin/diagnostics/otp-delivery-status?submittedMessageId=${encodeURIComponent(id)}`,
      );
      const result = (await response.json().catch(() => ({}))) as StatusResponse;

      if (!response.ok || !result.ok) {
        toastError(result.error ?? "Lookup failed.");
        return;
      }

      const stored = result.stored?.deliveryStatus ?? "not found";
      const provider = result.providerStatus?.deliveryStatus;
      setLookupResult(
        provider
          ? `WhatsApp reports: ${provider} (our record: ${stored})`
          : `Our record: ${stored}. No delivery confirmation has arrived for this message.`,
      );
    } catch {
      toastError("Lookup failed.");
    } finally {
      setLooking(false);
    }
  }

  return (
    <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Test send</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Sends a genuine signup OTP through the same campaign customers use. Limited to 3 per hour.
        {!webhookConfigured &&
          " Because the delivery webhook is not configured, you must check the phone yourself — the app cannot tell you whether it arrived."}
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="otp-test-phone" className="block text-xs font-bold text-slate-600">
            WhatsApp number
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-[var(--primary)]">
            <span className="font-mono text-sm font-semibold text-slate-500">+91</span>
            <input
              id="otp-test-phone"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              disabled={sending}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit number"
              className="h-11 w-full bg-transparent font-mono text-sm outline-none disabled:opacity-50"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={sending || phone.length !== 10}
          onClick={() => void runTestSend()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--primary)] bg-[var(--primary)] px-5 text-sm font-bold text-white transition disabled:opacity-50"
        >
          {sending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          Send test OTP
        </button>
      </div>

      {lastMessageId && (
        <p className="mt-3 break-all rounded-xl bg-slate-50 p-3 font-mono text-[11px] text-slate-600">
          AiSensy id: {lastMessageId}
        </p>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <label htmlFor="otp-lookup-id" className="block text-xs font-bold text-slate-600">
          Check a message id
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <input
            id="otp-lookup-id"
            value={lookupId}
            disabled={looking}
            onChange={(event) => setLookupId(event.target.value)}
            placeholder="AiSensy submitted message id"
            className="h-11 min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs outline-none focus:border-[var(--primary)] disabled:opacity-50"
          />
          <button
            type="button"
            disabled={looking || !lookupId.trim()}
            onClick={() => void runLookup()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {looking ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            Check
          </button>
        </div>
        {lookupResult && <p className="mt-3 text-sm font-semibold text-slate-700">{lookupResult}</p>}
      </div>
    </Card>
  );
}
