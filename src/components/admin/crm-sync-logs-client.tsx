"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RefreshCw, RotateCcw } from "lucide-react";

type Job = {
  id: string;
  event_type: string;
  application_id: string | null;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  created_at: string;
  processed_at: string | null;
  next_attempt_at: string;
};

export function CrmSyncLogsClient({
  jobs: initialJobs,
  summary,
  configured,
}: {
  jobs: Job[];
  summary: { pending: number; success: number; failed: number; processing: number };
  configured: boolean;
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runAction(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/crm-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessage(
        body.action === "retry"
          ? "Retry queued and processed."
          : `Processed ${data.processed ?? 0} job(s). Success: ${data.succeeded ?? 0}, failed: ${data.failed ?? 0}.`,
      );
      const refresh = await fetch("/api/admin/crm-sync");
      const refreshed = await refresh.json();
      if (refresh.ok && Array.isArray(refreshed.jobs)) {
        setJobs(refreshed.jobs);
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={Boolean(busy) || !configured}
          onClick={() => void runAction({ action: "process", limit: 20 }, "process")}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy === "process" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Process queue now
        </button>
        {!configured ? (
          <p className="text-sm font-semibold text-amber-700">
            Google Sheets env vars are not configured. Jobs will not sync until credentials are set.
          </p>
        ) : null}
        {message ? <p className="text-sm font-semibold text-slate-600">{message}</p> : null}
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Pending", value: summary.pending, className: "border-amber-100 bg-amber-50 text-amber-950" },
          { label: "Processing", value: summary.processing, className: "border-sky-100 bg-sky-50 text-sky-950" },
          { label: "Success", value: summary.success, className: "border-emerald-100 bg-emerald-50 text-emerald-950" },
          { label: "Failed", value: summary.failed, className: "border-rose-100 bg-rose-50 text-rose-950" },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border p-4 ${card.className}`}>
            <p className="text-sm font-bold opacity-80">{card.label}</p>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Application</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Error</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No CRM sync jobs yet.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold capitalize">{job.status}</td>
                  <td className="px-4 py-3">{job.event_type}</td>
                  <td className="px-4 py-3 font-mono text-xs">{job.application_id?.slice(0, 8) || "—"}</td>
                  <td className="px-4 py-3">
                    {job.attempts}/{job.max_attempts}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-rose-700" title={job.last_error || ""}>
                    {job.last_error || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(job.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {job.status === "failed" || job.status === "pending" ? (
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => void runAction({ action: "retry", jobId: job.id }, job.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50"
                      >
                        {busy === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        Retry
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
