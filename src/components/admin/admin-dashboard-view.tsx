"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  FileWarning,
  IndianRupee,
  RefreshCw,
  UserCheck,
  UsersRound,
  Wallet,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useTransition } from "react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import type { AdminDashboardPayload, DashboardMetric } from "@/lib/admin/dashboard-data";
import { ADMIN_DATE_PRESET_OPTIONS, type AdminDatePreset, toIstDateInputValue } from "@/lib/admin/date-range";
import { ADMIN_AGENCY_PARTNERS_NEW_ROUTE } from "@/lib/admin/agency-partner-routes";
import { cn } from "@/lib/utils";

const Charts = dynamic(() => import("@/components/admin/admin-dashboard-charts").then((m) => m.AdminDashboardCharts), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />,
});

const iconMap = {
  customers: UsersRound,
  partners: UserCheck,
  applications: ClipboardList,
  pending: FileWarning,
  progress: ClipboardList,
  completed: ClipboardList,
  revenue: IndianRupee,
  wallet: Wallet,
  failed: FileWarning,
  commission: IndianRupee,
};

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = iconMap[metric.icon] ?? ClipboardList;
  const up = metric.delta.absolute > 0;
  const down = metric.delta.absolute < 0;
  const good = metric.increaseIsGood ? up : down;
  const bad = metric.increaseIsGood ? down : up;

  return (
    <Link
      href={metric.href}
      className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{metric.title}</p>
        <span className="rounded-lg border border-slate-100 bg-slate-50 p-1.5 text-slate-500">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{metric.value}</p>
      <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold">
        {up ? <ArrowUpRight className={cn("h-3.5 w-3.5", good ? "text-emerald-600" : "text-rose-600")} /> : null}
        {down ? <ArrowDownRight className={cn("h-3.5 w-3.5", bad ? "text-rose-600" : "text-emerald-600")} /> : null}
        <span className={cn(good ? "text-emerald-700" : bad ? "text-rose-700" : "text-slate-500")}>{metric.delta.label}</span>
        <span className="text-slate-400">vs prior period</span>
      </div>
    </Link>
  );
}

function WidgetCard({
  title,
  items,
  empty,
}: {
  title: string;
  items: AdminDashboardPayload["widgets"]["recentApplications"];
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="block rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50">
                <p className="truncate text-xs font-bold text-slate-900">{item.title}</p>
                <p className="truncate text-[11px] text-slate-500">{item.subtitle}</p>
                {item.meta ? <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">{item.meta}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminDashboardView({ payload }: { payload: AdminDashboardPayload }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const preset = (searchParams.get("range") || payload.range.preset) as AdminDatePreset;
  const customFrom = searchParams.get("from") || "";
  const customTo = searchParams.get("to") || "";

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

  const todayInput = useMemo(() => toIstDateInputValue(), []);

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Overview</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {payload.range.label} · Asia/Kolkata · Updated {new Date(payload.generatedAt).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={ADMIN_AGENCY_PARTNERS_NEW_ROUTE}
              className="inline-flex h-10 items-center rounded-xl bg-slate-900 px-3 text-xs font-bold text-white"
            >
              Onboard Digi Partner
            </Link>
            <Link
              href="/admin/customers/new"
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
            >
              Create Customer
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => router.refresh())}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} /> Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-2">
            {ADMIN_DATE_PRESET_OPTIONS.filter((o) => o.value !== "custom").map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange({ range: option.value })}
                className={cn(
                  "h-9 rounded-full border px-3 text-[11px] font-bold transition",
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
                "h-9 rounded-full border px-3 text-[11px] font-bold",
                preset === "custom" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600",
              )}
            >
              Custom
            </button>
          </div>
          {preset === "custom" ? (
            <div className="flex flex-wrap items-end gap-2">
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
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {payload.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      {payload.notes.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
          {payload.notes.map((note) => (
            <p key={note}>• {note}</p>
          ))}
        </div>
      ) : null}

      <Charts charts={payload.charts} />

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <WidgetCard title="Recent Applications" items={payload.widgets.recentApplications} empty="No recent applications." />
        <WidgetCard title="Needs Attention" items={payload.widgets.needingAttention} empty="No applications need attention." />
        <WidgetCard title="Failed Payments" items={payload.widgets.failedPayments} empty="No failed payments in recent records." />
        <WidgetCard
          title="Pending Digi Partner Approvals"
          items={payload.widgets.pendingPartnerApprovals}
          empty="No Digi Partners awaiting approval."
        />
        <WidgetCard title="Recent Customers" items={payload.widgets.recentCustomers} empty="No recent customers." />
        <WidgetCard title="Admin Notifications" items={payload.widgets.recentNotifications} empty="No notifications." />
      </section>

      {!payload.metrics.length ? <AdminEmptyState title="No dashboard data" description="Connect Supabase admin credentials to load metrics." /> : null}
    </div>
  );
}
