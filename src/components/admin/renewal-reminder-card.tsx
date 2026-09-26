"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BellRing, CheckCircle2, LoaderCircle, Send, XCircle } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";

export type RenewalRow = {
  id: string;
  application_id: string;
  customer_name: string;
  customer_mobile: string;
  service_name: string;
  reference_number: string | null;
  renewal_date: string;
  reminder_days: number[];
  reminders_sent: number[];
  last_reminder_at: string | null;
  status: "active" | "renewed" | "cancelled";
  notes: string | null;
};

const REMINDER_PRESETS: Array<{ label: string; days: number[] }> = [
  { label: "30, 7, 1 days before + on the day", days: [30, 7, 1, 0] },
  { label: "15, 3 days before + on the day", days: [15, 3, 0] },
  { label: "60, 30, 15, 7, 1 days before", days: [60, 30, 15, 7, 1] },
  { label: "7, 1 days before", days: [7, 1] },
];

function daysLeft(date: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

function nextYear(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function DueLabel({ renewal }: { renewal: RenewalRow }) {
  if (renewal.status === "renewed") return <span className="text-emerald-700">Renewed</span>;
  if (renewal.status === "cancelled") return <span className="text-slate-500">Cancelled</span>;
  const left = daysLeft(renewal.renewal_date);
  if (left < 0) return <span className="text-rose-700">Expired {Math.abs(left)}d ago</span>;
  if (left === 0) return <span className="text-orange-700">Due today</span>;
  return <span className={left <= 7 ? "text-orange-700" : "text-blue-700"}>{left} days left</span>;
}

/**
 * Renewal reminders — on one application (with an add form) or across all of
 * them (the /admin/renewals list). The daily cron sends the WhatsApp
 * reminders; this is where an admin sets them up and closes them out.
 */
export function RenewalsManager({ applicationId, compact = false }: { applicationId?: string; compact?: boolean }) {
  const { success, error: toastError } = useToast();
  const [renewals, setRenewals] = useState<RenewalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<"active" | "all">("active");

  const [renewalDate, setRenewalDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [preset, setPreset] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams();
      if (applicationId) params.set("applicationId", applicationId);
      else if (status !== "all") params.set("status", status);
      const response = await fetch(`/api/admin/renewals?${params.toString()}`, { cache: "no-store" });
      const result = (await response.json().catch(() => ({}))) as { renewals?: RenewalRow[]; message?: string };
      if (!response.ok) throw new Error(result.message || "Renewals could not be loaded.");
      setRenewals(result.renewals ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Renewals could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [applicationId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function call(id: string, init: RequestInit, fallback: string) {
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/renewals/${id}`, {
        ...init,
        headers: { "Content-Type": "application/json" },
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        whatsappOk?: boolean;
        queued?: boolean;
      };
      if (!response.ok) throw new Error(result.message || fallback);
      if (result.whatsappOk === false && !result.queued) toastError(result.message || fallback);
      else success(result.message || "Done.");
      await load();
    } catch (error) {
      toastError(error instanceof Error ? error.message : fallback);
    } finally {
      setBusyId(null);
    }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!applicationId || !renewalDate) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/renewals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          renewalDate,
          referenceNumber: referenceNumber || null,
          reminderDays: REMINDER_PRESETS[preset].days,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Renewal could not be saved.");
      success(result.message || "Renewal reminder saved.");
      setRenewalDate("");
      setReferenceNumber("");
      await load();
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Renewal could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {!applicationId ? (
        <div className="flex gap-2">
          {(["active", "all"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`h-8 rounded-full border px-3 text-xs font-bold ${
                status === value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {value === "active" ? "Upcoming" : "All"}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Loading renewals…
        </p>
      ) : loadError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">{loadError}</p>
      ) : renewals.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-600">
          {applicationId
            ? "No renewal reminder yet. Add the policy / certificate expiry date below and the customer gets WhatsApp reminders automatically."
            : "No renewals yet. Open an application (e.g. an insurance policy) and add its renewal date there."}
        </p>
      ) : (
        <ul className="space-y-2">
          {renewals.map((renewal) => (
            <li key={renewal.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {!applicationId ? (
                    <Link
                      href={`/admin/applications/${renewal.application_id}`}
                      className="block truncate text-sm font-bold text-slate-950 hover:text-blue-700"
                    >
                      {renewal.customer_name} · {renewal.service_name}
                    </Link>
                  ) : null}
                  <p className="text-xs font-semibold text-slate-700">
                    Renewal {formatDate(renewal.renewal_date)} · <DueLabel renewal={renewal} />
                  </p>
                  {renewal.reference_number ? (
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">Ref {renewal.reference_number}</p>
                  ) : null}
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    Reminders: {renewal.reminder_days.map((d) => (d === 0 ? "on the day" : `${d}d`)).join(", ")}
                    {renewal.reminders_sent.length ? ` · sent ${renewal.reminders_sent.length}` : ""}
                  </p>
                </div>
              </div>
              {renewal.status === "active" ? (
                <div className={`mt-2 flex flex-wrap gap-1.5 ${compact ? "" : "sm:justify-end"}`}>
                  <button
                    type="button"
                    disabled={busyId === renewal.id}
                    onClick={() => call(renewal.id, { method: "POST" }, "Reminder could not be sent.")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-[11px] font-bold text-white disabled:opacity-60"
                  >
                    <Send className="h-3 w-3" /> Send now
                  </button>
                  <button
                    type="button"
                    disabled={busyId === renewal.id}
                    onClick={() =>
                      call(
                        renewal.id,
                        { method: "PATCH", body: JSON.stringify({ renewalDate: nextYear(renewal.renewal_date) }) },
                        "Renewal could not be updated.",
                      )
                    }
                    title="Customer renewed — remind again next year"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-800 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Renewed, +1 year
                  </button>
                  <button
                    type="button"
                    disabled={busyId === renewal.id}
                    onClick={() =>
                      call(renewal.id, { method: "PATCH", body: JSON.stringify({ status: "renewed" }) }, "Renewal could not be updated.")
                    }
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-800 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Renewed, stop
                  </button>
                  <button
                    type="button"
                    disabled={busyId === renewal.id}
                    onClick={() =>
                      call(renewal.id, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) }, "Renewal could not be updated.")
                    }
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-rose-700 disabled:opacity-60"
                  >
                    <XCircle className="h-3 w-3" /> Stop
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {applicationId ? (
        <form onSubmit={create} className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Renewal / expiry date
            <input
              type="date"
              required
              value={renewalDate}
              onChange={(event) => setRenewalDate(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-900"
            />
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Policy / reference no. (optional)
            <input
              type="text"
              maxLength={80}
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-900"
            />
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Remind on WhatsApp
            <select
              value={preset}
              onChange={(event) => setPreset(Number(event.target.value))}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold normal-case tracking-normal text-slate-900"
            >
              {REMINDER_PRESETS.map((option, index) => (
                <option key={option.label} value={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={saving || !renewalDate}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-blue-700 px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            <BellRing className="h-4 w-4" />
            {saving ? "Saving..." : "Add renewal reminder"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

/** Sidebar card on the admin application page. */
export function RenewalReminderCard({ applicationId }: { applicationId: string }) {
  return (
    <div className="lg-card p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-[var(--dc-ink)]">
        <BellRing className="h-4 w-4 text-blue-700" />
        Renewal reminder
      </h2>
      <p className="mt-1 text-[11.5px] font-medium leading-[1.5] text-[var(--dc-body)]">
        Insurance, licence or any service that expires — the customer gets WhatsApp reminders before it is due.
      </p>
      <div className="mt-3">
        <RenewalsManager applicationId={applicationId} compact />
      </div>
    </div>
  );
}
