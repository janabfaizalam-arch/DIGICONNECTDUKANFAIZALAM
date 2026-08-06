"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ClipboardList,
  CreditCard,
  FileWarning,
  ListTodo,
  MessageSquare,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useTransition } from "react";

import type { AdminDashboardPayload } from "@/lib/admin/dashboard-data";
import { ADMIN_DATE_PRESET_OPTIONS, type AdminDatePreset, toIstDateInputValue } from "@/lib/admin/date-range";
import { cn } from "@/lib/utils";

const Charts = dynamic(() => import("@/components/admin/admin-dashboard-charts").then((m) => m.AdminDashboardCharts), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" aria-hidden />,
});

const PrimaryFunnel = dynamic(
  () => import("@/components/admin/admin-dashboard-charts").then((m) => m.AdminDashboardPrimaryFunnel),
  {
    ssr: false,
    loading: () => <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" aria-hidden />,
  },
);

/** Primary New Customer lives in the command header only — not duplicated here. */
const QUICK_ACTIONS = [
  { href: "/admin/leads", label: "New Lead", icon: TrendingUp },
  { href: "/admin/customers/walk-in", label: "New Application", icon: ClipboardList },
  { href: "/admin/applications?agent=unassigned", label: "Assign Work", icon: Users },
  { href: "/admin/payments", label: "Record Payment", icon: CreditCard },
  { href: "/admin/applications", label: "Today’s Queue", icon: ListTodo },
  { href: "/admin/leads", label: "Follow-ups Due", icon: TrendingUp, tone: "amber" as const },
  { href: "/admin/applications", label: "Pending Documents", icon: FileWarning, tone: "coral" as const },
] as const;

function TodayMetric({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone: "blue" | "violet" | "emerald" | "amber" | "coral" | "slate";
}) {
  const tones = {
    blue: "border-l-blue-600 bg-white",
    violet: "border-l-violet-600 bg-white",
    emerald: "border-l-emerald-600 bg-white",
    amber: "border-l-amber-500 bg-white",
    coral: "border-l-rose-500 bg-white",
    slate: "border-l-slate-500 bg-white",
  } as const;
  const valueTone = {
    blue: "text-blue-700",
    violet: "text-violet-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    coral: "text-rose-700",
    slate: "text-slate-800",
  } as const;

  return (
    <Link
      href={href}
      className={cn(
        "rounded-xl border border-slate-200 border-l-4 px-3 py-2.5 shadow-sm outline-none transition hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-blue-500/40",
        tones[tone],
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-0.5 text-xl font-bold tabular-nums tracking-tight", valueTone[tone])}>
        {value.toLocaleString("en-IN")}
      </p>
    </Link>
  );
}

function ActionCategory({
  label,
  count,
  href,
  tone,
}: {
  label: string;
  count: number;
  href: string;
  tone: "coral" | "amber" | "violet" | "slate";
}) {
  const hot = count > 0;
  const tones = {
    coral: hot ? "border-rose-200 bg-rose-50 text-rose-900" : "border-slate-200 bg-white text-slate-700",
    amber: hot ? "border-amber-200 bg-amber-50 text-amber-950" : "border-slate-200 bg-white text-slate-700",
    violet: hot ? "border-violet-200 bg-violet-50 text-violet-950" : "border-slate-200 bg-white text-slate-700",
    slate: hot ? "border-slate-300 bg-slate-50 text-slate-900" : "border-slate-200 bg-white text-slate-700",
  } as const;

  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 outline-none transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/40",
        tones[tone],
      )}
    >
      <span className="min-w-0 truncate text-sm font-semibold">{label}</span>
      <span className="flex shrink-0 items-center gap-2">
        <span className={cn("text-base font-bold tabular-nums", hot ? "" : "text-slate-400")}>{count.toLocaleString("en-IN")}</span>
        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
      </span>
    </Link>
  );
}

export function AdminDashboardView({ payload }: { payload: AdminDashboardPayload }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const preset = (searchParams.get("range") || payload.range.preset) as AdminDatePreset;
  const customFrom = searchParams.get("from") || "";
  const customTo = searchParams.get("to") || "";
  const todayInput = useMemo(() => toIstDateInputValue(), []);

  const setRange = (next: { range: string; from?: string; to?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", next.range);
    if (next.range === "custom") {
      if (next.from) params.set("from", next.from);
      if (next.to) params.set("to", next.to);
    } else {
      params.delete("from");
      params.delete("to");
    }
    startTransition(() => {
      router.push(`/admin?${params.toString()}`);
    });
  };

  const ar = payload.actionRequired;
  const urgentTotal =
    ar.unassignedApplications + ar.overdueFollowUps + ar.pendingDocuments + ar.paymentsDue + ar.failedOrConfigMessages;
  const messagingHealthy = payload.health.messagingModeLabel === "Disabled" || payload.health.openOpsAlerts === 0;

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 pb-8">
      {/* Compact command header */}
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Operations command center</h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              DigiConnect Dukan · {payload.range.label} · IST · Updated {new Date(payload.generatedAt).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => router.refresh())}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} /> Refresh
            </button>
            <Link
              href="/admin/customers/walk-in"
              className="inline-flex h-11 min-w-[10rem] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/20 outline-none transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500/50"
            >
              <UserPlus className="h-4 w-4" /> New Customer
            </Link>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500/40",
                  "tone" in action && action.tone === "amber"
                    ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    : "tone" in action && action.tone === "coral"
                      ? "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-white",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Primary: Today + Action Required + Health + Funnel */}
      <section className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Today’s operations</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <TodayMetric label="Walk-ins" value={payload.today.walkIns} href="/admin/customers/walk-in" tone="blue" />
              <TodayMetric label="New leads" value={payload.today.newLeads} href="/admin/leads" tone="violet" />
              <TodayMetric label="Applications" value={payload.today.applicationsCreated} href="/admin/applications" tone="emerald" />
              <TodayMetric label="Follow-ups due" value={payload.today.followUpsDue} href="/admin/leads" tone="amber" />
              <TodayMetric label="Documents pending" value={payload.today.documentsPending} href="/admin/applications" tone="coral" />
              <TodayMetric label="Payments due" value={payload.today.paymentsDue} href="/admin/payments" tone="slate" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">Action required</p>
                <h2 className="mt-0.5 text-base font-bold text-slate-900">Clear the queue first</h2>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums",
                  urgentTotal > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800",
                )}
              >
                {urgentTotal > 0 ? `${urgentTotal} open` : "Clear"}
              </span>
            </div>

            {payload.alertsSourceError ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                Operational alerts could not be refreshed. Other counts below remain available.
              </p>
            ) : null}

            {urgentTotal === 0 && !payload.alertsSourceError ? (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                No urgent alerts
              </p>
            ) : null}

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <ActionCategory
                label="Unassigned applications"
                count={ar.unassignedApplications}
                href="/admin/applications?agent=unassigned"
                tone="amber"
              />
              <ActionCategory label="Overdue follow-ups" count={ar.overdueFollowUps} href="/admin/leads" tone="coral" />
              <ActionCategory label="Pending documents" count={ar.pendingDocuments} href="/admin/applications" tone="amber" />
              <ActionCategory label="Payments due" count={ar.paymentsDue} href="/admin/payments" tone="slate" />
              <ActionCategory
                label="Failed / config-required messages"
                count={ar.failedOrConfigMessages}
                href="/admin/communications"
                tone="coral"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-violet-600" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Comms & automation</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  messagingHealthy ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900",
                )}
              >
                Messaging {payload.health.messagingModeLabel}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Link href="/admin/automation" className="rounded-lg border border-slate-100 px-2 py-2 hover:bg-slate-50">
                <p className="text-[9px] font-bold uppercase text-slate-400">Alerts</p>
                <p className="text-sm font-bold tabular-nums text-slate-900">{payload.health.openOpsAlerts}</p>
              </Link>
              <Link href="/admin/communications" className="rounded-lg border border-slate-100 px-2 py-2 hover:bg-slate-50">
                <p className="text-[9px] font-bold uppercase text-slate-400">Queued</p>
                <p className="text-sm font-bold tabular-nums text-slate-900">{payload.health.queuedMessages}</p>
              </Link>
              <Link href="/admin/automation" className="rounded-lg border border-slate-100 px-2 py-2 hover:bg-slate-50">
                <p className="text-[9px] font-bold uppercase text-slate-400">Auto</p>
                <p className="text-sm font-bold tabular-nums text-slate-900">{payload.health.automationPending}</p>
              </Link>
            </div>
          </div>

          <PrimaryFunnel funnel={payload.charts.funnel} />
        </div>
      </section>

      {/* Date filters — secondary analytics controls */}
      <section className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <div className="flex flex-wrap gap-1.5">
          {ADMIN_DATE_PRESET_OPTIONS.filter((o) => o.value !== "custom").map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange({ range: option.value })}
              className={cn(
                "h-9 rounded-lg border px-2.5 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                preset === option.value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRange({ range: "custom", from: customFrom || todayInput, to: customTo || todayInput })}
            className={cn(
              "h-9 rounded-lg border px-2.5 text-[11px] font-bold",
              preset === "custom" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600",
            )}
          >
            Custom
          </button>
        </div>
        {preset === "custom" ? (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="text-[11px] font-bold text-slate-500">
              From
              <input
                type="date"
                value={customFrom || todayInput}
                max={todayInput}
                onChange={(e) => setRange({ range: "custom", from: e.target.value, to: customTo || e.target.value })}
                className="mt-1 block h-9 rounded-lg border border-slate-200 px-2 text-xs"
              />
            </label>
            <label className="text-[11px] font-bold text-slate-500">
              To
              <input
                type="date"
                value={customTo || todayInput}
                max={todayInput}
                onChange={(e) => setRange({ range: "custom", from: customFrom || e.target.value, to: e.target.value })}
                className="mt-1 block h-9 rounded-lg border border-slate-200 px-2 text-xs"
              />
            </label>
          </div>
        ) : null}
      </section>

      {/* Secondary: charts */}
      <Charts charts={payload.charts} variant="secondary" />

      {/* Tertiary: workload, insights, activity */}
      <section className="grid gap-3 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Staff / partner workload</p>
          <h2 className="mt-0.5 text-sm font-bold text-slate-900">Capacity snapshot</h2>
          <dl className="mt-3 space-y-2">
            {[
              { label: "Active Digi Partners", value: payload.workload.partnersActive, href: "/admin/agency-partners" },
              { label: "Partner apps (range)", value: payload.workload.partnerAppsInRange, href: "/admin/applications" },
              {
                label: "Unassigned applications",
                value: payload.workload.unassignedApplications,
                href: "/admin/applications?agent=unassigned",
              },
              {
                label: "Partner approvals pending",
                value: payload.workload.pendingPartnerApprovals,
                href: "/admin/agency-partners",
              },
            ].map((row) => (
              <Link
                key={row.label}
                href={row.href}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-2 hover:bg-slate-50"
              >
                <dt className="text-xs font-semibold text-slate-600">{row.label}</dt>
                <dd className="text-sm font-bold tabular-nums text-slate-900">{row.value.toLocaleString("en-IN")}</dd>
              </Link>
            ))}
          </dl>
        </div>

        <div id="insights" className="rounded-2xl border border-violet-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700">Smart insights</p>
          </div>
          <h2 className="mt-0.5 text-sm font-bold text-slate-900">Real-data signals</h2>
          <ul className="mt-3 space-y-2">
            {payload.insights.map((insight) => (
              <li key={insight.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{insight.title}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      insight.kind === "config" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800",
                    )}
                  >
                    {insight.kind === "config" ? "AI off" : "Deterministic"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{insight.detail}</p>
                {insight.href ? (
                  <Link href={insight.href} className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-violet-700">
                    Open <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">Recent activity</h2>
            <Link href="/admin/automation" className="text-[11px] font-bold text-blue-700">
              Ops alerts
            </Link>
          </div>
          {payload.widgets.recentActivity.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">No recent activity in the selected window.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {payload.widgets.recentActivity.map((item) => (
                <li key={`${item.meta}-${item.id}`}>
                  <Link href={item.href} className="block rounded-lg border border-slate-100 px-2.5 py-2 hover:bg-slate-50">
                    <p className="truncate text-xs font-bold text-slate-900">{item.title}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {item.meta ? `${item.meta} · ` : ""}
                      {item.subtitle}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 border-t border-slate-100 pt-3">
            {payload.alertsSourceError ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-900">
                Alerts could not be loaded.
              </p>
            ) : payload.widgets.recentNotifications.length === 0 ? (
              <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2 text-[11px] font-medium text-emerald-900">
                No urgent alerts
              </p>
            ) : (
              <ul className="space-y-1.5">
                {payload.widgets.recentNotifications.slice(0, 3).map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="block rounded-lg border border-slate-100 px-2.5 py-2 hover:bg-slate-50">
                      <p className="truncate text-xs font-bold text-slate-900">{item.title}</p>
                      <p className="truncate text-[11px] text-slate-500">{item.subtitle}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Workflow className="h-3.5 w-3.5" /> Summaries: {payload.health.summariesStatus}
          </p>
        </div>
      </section>

      {payload.notes.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
          {payload.notes.map((note) => (
            <p key={note}>• {note}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
