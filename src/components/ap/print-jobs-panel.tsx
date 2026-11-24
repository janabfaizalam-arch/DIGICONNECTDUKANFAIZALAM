"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, IndianRupee, Loader2, RefreshCw, RotateCcw, Undo2, Wallet } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";

type Job = {
  id: string;
  job_number: string;
  service_type: string;
  paper_size: string;
  color_mode: string;
  copies: number;
  sheet_count: number;
  pages: number;
  price: number;
  partner_earning: number | null;
  payment_status: string;
  print_status: string;
  pickup_pin: string | null;
  customer_mobile: string;
  error_message: string | null;
  created_at: string;
};

type Earnings = { today: number; month: number; total: number; jobsToday: number; walletBalance: number | null };

const STATUS: Record<string, { label: string; tone: string }> = {
  awaiting_approval: { label: "Approval chahiye", tone: "bg-amber-100 text-amber-800" },
  queued: { label: "Printer ki line me", tone: "bg-blue-100 text-blue-800" },
  printing: { label: "Print ho raha hai", tone: "bg-blue-100 text-blue-800" },
  printed: { label: "Print ho gaya", tone: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Fail hua", tone: "bg-red-100 text-red-700" },
  cancelled: { label: "Refund kiya", tone: "bg-slate-200 text-slate-700" },
};

function money(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "abhi";
  if (minutes < 60) return `${minutes} min pehle`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ghante pehle`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Today's takings and the live job list for a partner's Digi Print counter.
 *
 * Refreshes itself every ten seconds: a shop holding jobs for approval needs
 * to see a new one arrive without pressing anything, and a customer standing
 * at the desk should not wait on a page reload.
 */
export function PrintJobsPanel({ requireApproval }: { requireApproval: boolean }) {
  const { success, error } = useToast();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/ap/print-station/jobs", { cache: "no-store" });
      if (!response.ok) return;
      const json = (await response.json()) as { jobs?: Job[]; earnings?: Earnings };
      setJobs(json.jobs ?? []);
      setEarnings(json.earnings ?? null);
    } catch {
      /* A dropped poll is retried on the next tick. */
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 10_000);
    return () => clearInterval(timer);
  }, [load]);

  const act = async (job: Job, action: "approve" | "refund" | "reprint") => {
    if (action === "refund" && !window.confirm(`${job.job_number} cancel karke customer ko ${money(job.price)} wapas bhejein?`)) {
      return;
    }
    setActing(`${job.id}:${action}`);
    try {
      const response = await fetch("/api/ap/print-station/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, action }),
      });
      const json = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(json.error || "Nahi ho paya.");
      success(json.message || "Ho gaya.");
      await load();
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Nahi ho paya.");
    } finally {
      setActing(null);
    }
  };

  const waiting = (jobs ?? []).filter((job) => job.print_status === "awaiting_approval");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Aaj ki kamai" value={earnings ? money(earnings.today) : "—"} sub={earnings ? `${earnings.jobsToday} jobs` : ""} icon={IndianRupee} accent />
        <Tile label="Is mahine" value={earnings ? money(earnings.month) : "—"} icon={IndianRupee} />
        <Tile label="Ab tak kul" value={earnings ? money(earnings.total) : "—"} icon={IndianRupee} />
        <Tile
          label="Wallet balance"
          value={earnings?.walletBalance === null || earnings === null ? "—" : money(earnings.walletBalance)}
          sub="Services ya withdraw ke liye"
          icon={Wallet}
          href="/dc-partner/wallet"
        />
      </div>

      <div className="lg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">Print jobs</h3>
            <p className="mt-0.5 text-[12px] font-medium text-[var(--dc-body)]">
              {requireApproval
                ? "Approval chalu hai — har paid job aapke OK ke baad print hoga."
                : "Payment hote hi job seedha printer par jata hai."}{" "}
              Har payment ki kamai turant wallet me.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="lg-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--dc-body)]"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {waiting.length ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[12.5px] font-extrabold text-amber-800">
            {waiting.length} {waiting.length === 1 ? "job" : "jobs"} aapke approval ka intezaar kar rahe hain
          </p>
        ) : null}

        {jobs === null ? (
          <div className="flex h-24 items-center justify-center text-[var(--dc-body)]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[rgba(15,32,73,.15)] px-4 py-6 text-center text-[12.5px] font-semibold text-[var(--dc-body)]">
            Abhi koi job nahi. Poster counter par lagaiye — pehla customer scan karte hi yahan dikhega.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[rgba(15,32,73,.08)]">
            {jobs.map((job) => {
              const status = STATUS[job.print_status] ?? { label: job.print_status, tone: "bg-slate-100 text-slate-700" };
              const busy = (action: string) => acting === `${job.id}:${action}`;
              const canRefund =
                job.payment_status === "verified" && ["awaiting_approval", "failed", "queued"].includes(job.print_status);
              return (
                <li key={job.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-extrabold text-[var(--dc-ink)]">
                      {job.job_number}
                      <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-extrabold", status.tone)}>
                        {status.label}
                      </span>
                      {job.pickup_pin ? (
                        <span className="font-mono text-[11.5px] font-bold text-[var(--dc-blue-mid)]">PIN {job.pickup_pin}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[11.5px] font-medium text-[var(--dc-body)]">
                      {job.service_type.replace(/_/g, " ")} · {job.paper_size} {job.color_mode === "color" ? "colour" : "B/W"} ·{" "}
                      {job.copies} copy · {job.customer_mobile} · {timeAgo(job.created_at)}
                    </p>
                    {job.print_status === "failed" && job.error_message ? (
                      <p className="mt-0.5 text-[11.5px] font-semibold text-red-600">{job.error_message}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-right text-[12px] font-bold text-[var(--dc-ink)]">
                      {money(job.price)}
                      {job.partner_earning !== null && job.partner_earning !== job.price ? (
                        <span className="block text-[10.5px] font-semibold text-emerald-700">
                          aapko {money(job.partner_earning)}
                        </span>
                      ) : null}
                    </span>
                    {job.print_status === "awaiting_approval" ? (
                      <ActionButton onClick={() => act(job, "approve")} busy={busy("approve")} primary icon={Check}>
                        Print karo
                      </ActionButton>
                    ) : null}
                    {["printed", "failed"].includes(job.print_status) && job.payment_status === "verified" ? (
                      <ActionButton onClick={() => act(job, "reprint")} busy={busy("reprint")} icon={RotateCcw}>
                        Dobara
                      </ActionButton>
                    ) : null}
                    {canRefund ? (
                      <ActionButton onClick={() => act(job, "refund")} busy={busy("refund")} icon={Undo2}>
                        Refund
                      </ActionButton>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Wallet;
  accent?: boolean;
  href?: string;
}) {
  const body = (
    <>
      <p className={cn("flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em]", accent ? "text-white/80" : "text-[var(--dc-body)]")}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className={cn("mt-1.5 text-[1.35rem] font-black leading-none", accent ? "text-white" : "text-[var(--dc-ink)]")}>{value}</p>
      {sub ? <p className={cn("mt-1 text-[11px] font-semibold", accent ? "text-white/75" : "text-[var(--dc-body)]")}>{sub}</p> : null}
    </>
  );
  const className = cn("lg-card block p-4", accent && "text-white");
  const style = accent ? { background: "var(--dc-grad-blue)" } : undefined;
  return href ? (
    <a href={href} className={className} style={style}>
      {body}
    </a>
  ) : (
    <div className={className} style={style}>
      {body}
    </div>
  );
}

function ActionButton({
  onClick,
  busy,
  primary,
  icon: Icon,
  children,
}: {
  onClick: () => void;
  busy: boolean;
  primary?: boolean;
  icon: typeof Check;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-bold transition disabled:opacity-50",
        primary ? "text-white" : "lg-pill text-[var(--dc-ink)]",
      )}
      style={primary ? { background: "var(--dc-grad-blue)" } : undefined}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
