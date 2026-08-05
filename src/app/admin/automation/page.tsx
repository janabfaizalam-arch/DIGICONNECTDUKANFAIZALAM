"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCw } from "lucide-react";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils";

type Tab = "events" | "alerts" | "summaries" | "rules";

export default function AdminAutomationPage() {
  const [tab, setTab] = useState<Tab>("events");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("");
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [summaries, setSummaries] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState("all");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/automation?status=${status}&page=1`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      setEvents(data.items ?? []);
      setCounts(data.counts ?? {});
      setRules(data.rules ?? []);
      setDeliveryMode(String(data.deliveryMode ?? ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [status]);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/automation/alerts?status=open`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      setAlerts(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSummaries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/automation/summaries`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      setSummaries(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "events" || tab === "rules") void loadEvents();
    if (tab === "alerts") void loadAlerts();
    if (tab === "summaries") void loadSummaries();
  }, [tab, loadEvents, loadAlerts, loadSummaries]);

  const alertAction = async (id: string, action: "acknowledge" | "resolve") => {
    setSuccess("");
    setError("");
    const res = await fetch("/api/admin/automation/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Action failed");
      return;
    }
    setSuccess(action === "resolve" ? "Alert resolved." : "Alert acknowledged.");
    await loadAlerts();
  };

  const generateSummary = async () => {
    setSuccess("");
    setError("");
    const res = await fetch(`/api/admin/automation/summaries?generate=1`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Generate failed");
      return;
    }
    setSuccess(`Summary for ${data.businessDate} ready (delivery disabled).`);
    await loadSummaries();
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Automation & ops"
        description="Events, rules (read-only), alerts, and IST daily summaries. No live summary delivery."
      />

      <p className="text-sm text-slate-600">
        Delivery mode: <span className="font-mono font-medium">{deliveryMode || "…"}</span> (server env
        only)
      </p>

      <div className="flex flex-wrap gap-2">
        {(["events", "alerts", "summaries", "rules"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm capitalize",
              tab === t ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white",
            )}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            if (tab === "events" || tab === "rules") void loadEvents();
            if (tab === "alerts") void loadAlerts();
            if (tab === "summaries") void loadSummaries();
          }}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {success ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : null}

      {!loading && tab === "events" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {["all", "pending", "retryable", "failed", "completed"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded border px-2 py-1",
                  status === s ? "bg-slate-900 text-white" : "bg-white",
                )}
              >
                {s}
                {s !== "all" && counts[s] != null ? ` (${counts[s]})` : ""}
              </button>
            ))}
          </div>
          {events.length === 0 ? (
            <AdminEmptyState title="No automation events" description="Events appear when CRM operations emit them." />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Entity</th>
                    <th className="px-3 py-2">Attempts</th>
                    <th className="px-3 py-2">Error</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={String(e.id)} className="border-b border-slate-50">
                      <td className="px-3 py-2 font-mono text-xs">{String(e.event_type)}</td>
                      <td className="px-3 py-2">{String(e.status)}</td>
                      <td className="px-3 py-2 text-xs">
                        {e.entity_type === "application" && e.entity_id ? (
                          <Link className="text-blue-700 underline" href={`/admin/applications/${e.entity_id}`}>
                            App
                          </Link>
                        ) : (
                          `${e.entity_type}`
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {String(e.attempt_count)}/{String(e.max_attempts)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">{String(e.failure_code || "—")}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {new Date(String(e.created_at)).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {!loading && tab === "alerts" ? (
        alerts.length === 0 ? (
          <AdminEmptyState title="No open alerts" description="Failed communications and automation issues appear here." />
        ) : (
          <ul className="space-y-3">
            {alerts.map((a) => (
              <li key={String(a.id)} className="rounded-lg border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{String(a.title)}</p>
                    <p className="text-sm text-slate-600">{String(a.safe_summary)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {String(a.alert_type)} · {String(a.severity)} ·{" "}
                      {new Date(String(a.created_at)).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => void alertAction(String(a.id), "acknowledge")}
                    >
                      Ack
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => void alertAction(String(a.id), "resolve")}
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {!loading && tab === "summaries" ? (
        <div className="space-y-3">
          <button type="button" onClick={() => void generateSummary()} className="rounded border bg-white px-3 py-2 text-sm">
            Generate today (IST)
          </button>
          {summaries.length === 0 ? (
            <AdminEmptyState title="No summaries yet" description="Generate an IST daily aggregate (delivery disabled)." />
          ) : (
            <div className="space-y-3">
              {summaries.map((s) => {
                const m = (s.metrics ?? {}) as Record<string, number>;
                return (
                  <div key={String(s.id)} className="rounded-lg border bg-white p-4 text-sm">
                    <p className="font-medium">
                      {String(s.business_date)} · delivery {String(s.delivery_status)}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {Object.entries(m).map(([k, v]) => (
                        <div key={k} className="rounded bg-slate-50 px-2 py-1">
                          <div className="text-xs text-slate-500">{k.replace(/_/g, " ")}</div>
                          <div className="font-medium">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {!loading && tab === "rules" ? (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Enabled</th>
                <th className="px-3 py-2">Readiness</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={String(r.key)} className="border-b border-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{String(r.key)}</td>
                  <td className="px-3 py-2 text-xs">{String(r.eventType)}</td>
                  <td className="px-3 py-2 text-xs">{String(r.actionType)}</td>
                  <td className="px-3 py-2">{r.enabled ? "yes" : "no"}</td>
                  <td className="px-3 py-2">{String(r.readiness)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
