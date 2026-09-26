"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Play, RefreshCw, Send, XCircle } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils";

type PlatformStatus = { platform: string; label: string; configured: boolean; missing: string[] };
type Result = { platform: string; status: "posted" | "skipped" | "failed"; postUrl?: string; error?: string };
type Prepared = { platform: string; text: string; link: string };
type Run = {
  id: string;
  run_date: string;
  trigger: "cron" | "manual";
  mode: "draft" | "live";
  status: "running" | "completed" | "partial" | "failed";
  stage: string;
  service_title: string | null;
  creative: { angle?: string; hook?: string } | null;
  prepared: Prepared[] | null;
  results: Result[];
  image_url: string | null;
  article_slug: string | null;
  error: string | null;
  created_at: string;
};
type Overview = {
  mode: "disabled" | "draft" | "live";
  geminiConfigured: boolean;
  platforms: PlatformStatus[];
  runs: Run[];
  tableMissing: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-800",
  failed: "bg-rose-100 text-rose-700",
  running: "bg-sky-100 text-sky-700",
  posted: "bg-emerald-100 text-emerald-700",
  skipped: "bg-slate-100 text-slate-500",
};

export function MarketingAgentsConsole() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<"draft" | "live" | null>(null);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing-agents", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Load failed");
      setData(body);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(mode: "draft" | "live") {
    if (mode === "live" && !window.confirm("Sabhi connected platforms par abhi post ho jayega. Aage badhein?")) return;
    setRunning(mode);
    setMessage("Agents kaam kar rahe hain — isme 1–3 minute lag sakte hain…");
    try {
      const res = await fetch("/api/admin/marketing-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const body = await res.json();
      const messages: Record<string, string> = {
        completed: "Run ho gaya — niche posts dekhein.",
        partial: "Run ho gaya, lekin kuch hissa fail hua — niche laal error dekhein.",
        failed: "Run fail hua — niche laal error dekhein.",
      };
      setMessage(body.ok ? messages[body.status] ?? `Run ${body.status}` : body.skipped || body.error || "Run did not start");
    } catch {
      setMessage("Run request failed.");
    } finally {
      setRunning(null);
      void load();
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
      </div>
    );
  }
  if (!data) return <AdminEmptyState title="Could not load" description={message} />;

  return (
    <div className="space-y-6">
      {data.tableMissing ? (
        <Notice text="Table marketing_agent_runs abhi nahi bani. Supabase mein migration 20260925120000_marketing_agents.sql chalaayein." />
      ) : null}
      {!data.geminiConfigured ? <Notice text="GEMINI_API_KEY set nahi hai — agents research aur likhne ke liye isi ka use karte hain." /> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Mode</p>
            <p className="text-lg font-extrabold text-slate-900">
              {data.mode === "live" ? "Live — roz automatic post" : data.mode === "draft" ? "Draft — banata hai, post nahi karta" : "Disabled"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
            </button>
            <button
              type="button"
              disabled={running !== null}
              onClick={() => void run("draft")}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--dc-blue-700)] px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {running === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Draft banaayein
            </button>
            <button
              type="button"
              disabled={running !== null || data.mode !== "live"}
              title={data.mode !== "live" ? "MARKETING_AGENTS_MODE=live set karein" : undefined}
              onClick={() => void run("live")}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              {running === "live" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Abhi post karein
            </button>
          </div>
        </div>
        {message ? <p className="mt-3 text-sm font-semibold text-slate-600">{message}</p> : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data.platforms.map((p) => (
            <div key={p.platform} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              {p.configured ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">{p.label}</p>
                {!p.configured ? <p className="truncate text-[11px] text-slate-500">Missing: {p.missing.join(", ")}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900">Recent runs</h2>
        {data.runs.length === 0 ? (
          <AdminEmptyState title="Abhi tak koi run nahi" description="“Draft banaayein” dabaakar pehla run try karein aur posts check karein." />
        ) : null}
        {data.runs.map((run) => (
          <article key={run.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start gap-4">
              {run.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={run.image_url} alt="" className="h-24 w-24 rounded-xl border border-slate-100 object-cover" />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS_STYLES[run.status])}>{run.status}</span>
                  <span className="text-[11px] font-bold uppercase text-slate-500">
                    {run.run_date} · {run.mode} · {run.trigger}
                    {run.status === "running" ? ` · ${run.stage}` : ""}
                  </span>
                </div>
                <p className="mt-1 font-extrabold text-slate-900">{run.service_title ?? "—"}</p>
                {run.creative?.hook ? <p className="text-sm text-slate-600">“{run.creative.hook}”</p> : null}
                {run.error ? <p className="mt-1 text-xs font-semibold text-rose-600">{run.error}</p> : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(run.results ?? []).map((r) => (
                    <a
                      key={r.platform}
                      href={r.postUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                      title={r.error}
                      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS_STYLES[r.status])}
                    >
                      {r.platform} {r.postUrl ? <ExternalLink className="h-3 w-3" aria-hidden="true" /> : null}
                    </a>
                  ))}
                  {run.article_slug ? (
                    <a
                      href={run.mode === "live" ? `/blog/${run.article_slug}` : "/admin/articles"}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700"
                    >
                      blog article <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
                {run.prepared?.length ? (
                  <button
                    type="button"
                    onClick={() => setOpen(open === run.id ? null : run.id)}
                    className="mt-2 text-xs font-bold text-[var(--dc-blue-700)]"
                  >
                    {open === run.id ? "Posts chhupaayein" : "Posts dekhein"}
                  </button>
                ) : null}
              </div>
            </div>
            {open === run.id ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {run.prepared?.map((post) => (
                  <div key={post.platform} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold uppercase text-slate-500">{post.platform}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{post.text}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
      <p className="text-sm font-semibold text-amber-900">{text}</p>
    </div>
  );
}
