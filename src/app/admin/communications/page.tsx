"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils";

type OutboxItem = {
  id: string;
  status: string;
  purpose: string | null;
  eventType: string;
  channel: string;
  classification: string;
  recipientMasked: string;
  applicationId: string | null;
  customerId: string | null;
  leadId: string | null;
  attemptCount: number;
  maxAttempts: number;
  failureCode: string | null;
  failureSummary: string | null;
  providerStatus: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  sentAt: string | null;
  correlationId: string | null;
};

const STATUS_FILTERS = [
  "all",
  "queued",
  "retryable",
  "failed",
  "configuration_required",
  "processing",
  "sent",
  "delivered",
  "cancelled",
  "suppressed",
] as const;

export default function AdminCommunicationsPage() {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        pageSize: "25",
      });
      if (q.trim()) params.set("q", q.trim());
      const response = await fetch(`/api/admin/communications?${params}`, { cache: "no-store" });
      const data = (await response.json()) as {
        items?: OutboxItem[];
        total?: number;
        counts?: Record<string, number>;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not load communications.");
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setCounts(data.counts ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, page, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (
    id: string,
    action: "retry" | "cancel" | "explicit_resend",
  ) => {
    setBusyId(id);
    setError("");
    setSuccess("");
    try {
      let body: Record<string, string> = { action };
      if (action === "cancel") {
        const reason = window.prompt("Cancel reason (required):");
        if (!reason || reason.trim().length < 3) {
          setError("Cancel requires a reason.");
          return;
        }
        body.reason = reason.trim();
      }
      if (action === "explicit_resend") {
        const reason = window.prompt("Resend reason (required, min 5 chars):");
        if (!reason || reason.trim().length < 5) {
          setError("Explicit resend requires a reason.");
          return;
        }
        const newEventId = window.prompt(
          "Authorized new event ID (required — creates a new outbox record):",
        );
        if (!newEventId || newEventId.trim().length < 8) {
          setError("Explicit resend requires a new authorized event identity.");
          return;
        }
        body = { action, reason: reason.trim(), newEventId: newEventId.trim() };
      }
      if (action === "retry") {
        body.reason = "manual_retry_ui";
      }

      const response = await fetch(`/api/admin/communications/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string; ok?: boolean };
      if (!response.ok) throw new Error(data.error || "Action failed.");
      setSuccess(
        action === "retry"
          ? "Retry queued/processed."
          : action === "cancel"
            ? "Message cancelled."
            : "Explicit resend enqueued as a new communication.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Communications"
        description="WhatsApp outbox — masked recipients, retry/cancel, delivery state. No live arbitrary sends."
      />

      <div className="flex flex-wrap gap-2 text-xs">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={cn(
              "rounded-md border px-2.5 py-1",
              status === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700",
            )}
          >
            {s}
            {s !== "all" && counts[s] != null ? ` (${counts[s]})` : ""}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              void load();
            }
          }}
          placeholder="Search application / customer / correlation ID"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm sm:max-w-md"
        />
        <button
          type="button"
          onClick={() => {
            setPage(1);
            void load();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="No communications"
          description="No outbox rows match these filters. Messages appear after application WhatsApp events enqueue."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Purpose</th>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Related</th>
                <th className="px-3 py-2">Attempts</th>
                <th className="px-3 py-2">Error</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 align-top">
                  <td className="px-3 py-2">
                    <span className="font-medium">{item.status}</span>
                    {item.providerStatus ? (
                      <div className="text-xs text-slate-500">{item.providerStatus}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <div>{item.purpose || item.eventType}</div>
                    <div className="text-xs text-slate-500">{item.classification}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{item.recipientMasked}</td>
                  <td className="px-3 py-2 text-xs">
                    {item.applicationId ? (
                      <Link className="text-blue-700 underline" href={`/admin/applications/${item.applicationId}`}>
                        App
                      </Link>
                    ) : null}
                    {item.leadId ? (
                      <Link className="ml-2 text-blue-700 underline" href={`/admin/leads?id=${item.leadId}`}>
                        Lead
                      </Link>
                    ) : null}
                    {!item.applicationId && !item.leadId ? "—" : null}
                  </td>
                  <td className="px-3 py-2">
                    {item.attemptCount}/{item.maxAttempts}
                    {item.nextAttemptAt ? (
                      <div className="text-xs text-slate-500">
                        next {new Date(item.nextAttemptAt).toLocaleString("en-IN")}
                      </div>
                    ) : null}
                  </td>
                  <td className="max-w-[12rem] px-3 py-2 text-xs text-slate-600">
                    {item.failureCode || item.failureSummary || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void runAction(item.id, "retry")}
                        className="rounded border border-slate-200 px-2 py-1 text-xs disabled:opacity-50"
                      >
                        Retry
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void runAction(item.id, "cancel")}
                        className="rounded border border-slate-200 px-2 py-1 text-xs disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void runAction(item.id, "explicit_resend")}
                        className="rounded border border-slate-200 px-2 py-1 text-xs disabled:opacity-50"
                      >
                        New resend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} of {pageCount} · {total} total
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
