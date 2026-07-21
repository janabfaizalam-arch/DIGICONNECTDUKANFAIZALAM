"use client";

import Link from "next/link";
import {
  Bell,
  BookOpen,
  FileText,
  HandCoins,
  Headphones,
  Megaphone,
  PlusCircle,
  Receipt,
  Upload,
  UserPlus2,
  Users,
  WalletCards,
} from "lucide-react";

import {
  EmptyState,
  GlassPanel,
  MetricCard,
  PageHeader,
  QuickActionCard,
  StatusBadge,
  TierBadge,
  VerifiedBadge,
} from "@/components/ap/ui";
import { formatCount, formatINR, formatPercentDelta, partnerInitials } from "@/lib/ap/format";
import { cn } from "@/lib/utils";

type AgencyPartnerView = {
  id: string;
  full_name: string;
  partner_code: string;
  partner_type: string;
  kyc_status: string;
  status: string;
  business_name?: string | null;
  district?: string | null;
  state?: string | null;
  tier?: { name: string } | null;
};

type DashboardStats = {
  walletBalance: number;
  commissionApproved: number;
  totalPaidPayout: number;
  commissionPending: number;
  totalApplications: number;
  pendingApplications: number;
  completedApplications: number;
  rejectedApplications: number;
  todayApplications?: number;
  revenueCollected?: number;
  conversionRate?: number;
  monthlyApplications: number;
  commissionEarned: number;
  customerCount: number;
  todayEarnings?: number;
  yesterdayApplications?: number;
  lastWeekApplications?: number;
  lastMonthApplications?: number;
  yesterdayEarnings?: number;
  lastWeekEarnings?: number;
  lastMonthEarnings?: number;
};

type RecentApp = {
  id: string;
  customerName?: string;
  customer_name?: string;
  service_name: string;
  application_code?: string;
  status: string;
};

type Announcement = {
  id: string;
  announcement_type: string;
  published_at?: string;
  title: string;
  body: string;
};

type TxRow = {
  id: string;
  title: string;
  amount: number;
  type: "credit" | "debit";
  status: string;
  date: string;
};

type ChartPoint = { name: string; filings: number; earnings: number };

type Props = {
  ap: AgencyPartnerView;
  stats: DashboardStats;
  recentApps: RecentApp[];
  announcements: Announcement[];
  analytics?: unknown;
  dbTransactions: TxRow[];
  chartData: ChartPoint[];
  teamMemberCount: number;
  teamMembers: { id: string; full_name: string; partner_type: string; status: string; partner_code: string }[];
};

const QUICK_ACTIONS = [
  { href: "/ap/customers", label: "Create Customer", description: "Add a new customer profile", icon: <UserPlus2 className="h-4 w-4" /> },
  { href: "/ap/applications/new", label: "Apply New Service", description: "Start a service application", icon: <PlusCircle className="h-4 w-4" /> },
  { href: "/ap/applications", label: "Track Application", description: "Filter and follow up", icon: <FileText className="h-4 w-4" /> },
  { href: "/ap/applications", label: "Upload Documents", description: "Clear document pendings", icon: <Upload className="h-4 w-4" /> },
  { href: "/ap/wallet", label: "Add Wallet Balance", description: "Review balance & payouts", icon: <WalletCards className="h-4 w-4" /> },
  { href: "/ap/commissions", label: "View Commission", description: "Open earnings ledger", icon: <HandCoins className="h-4 w-4" /> },
  { href: "/ap/support", label: "Raise Support Ticket", description: "Get help from the desk", icon: <Headphones className="h-4 w-4" /> },
  { href: "/ap/marketing", label: "Marketing Material", description: "Captions and creatives", icon: <Megaphone className="h-4 w-4" /> },
  { href: "/ap/training", label: "Training", description: "Guides and checklist", icon: <BookOpen className="h-4 w-4" /> },
];

function nextActionForStatus(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("document")) return "Upload document";
  if (s.includes("payment")) return "Payment pending";
  if (s === "submitted" || s === "under_review") return "Awaiting admin review";
  if (s === "draft") return "Complete and submit";
  if (s === "completed" || s === "rejected" || s === "cancelled") return "No action required";
  return "Review status";
}

export function APDashboardClient({
  ap,
  stats,
  recentApps,
  announcements,
  dbTransactions,
  chartData,
  teamMemberCount,
  teamMembers,
}: Props) {
  const firstName = ap.full_name.trim().split(/\s+/)[0] || "Partner";
  const verified = ap.kyc_status === "approved" && ap.status === "active";

  const earningsDelta = formatPercentDelta(stats.todayEarnings ?? 0, stats.yesterdayEarnings ?? 0);
  const appsDelta = formatPercentDelta(stats.todayApplications ?? 0, stats.yesterdayApplications ?? 0);
  const weekAppsDelta = formatPercentDelta(stats.monthlyApplications, stats.lastMonthApplications ?? 0);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <PageHeader
        eyebrow="Digi Partner OS"
        title={`Welcome back, ${firstName}`}
        description="Your digital service command center — applications, customers, wallet and commissions in one place."
        meta={
          <>
            {verified ? <VerifiedBadge /> : <StatusBadge status={ap.kyc_status} label={`KYC ${ap.kyc_status}`} />}
            <TierBadge name={ap.tier?.name} />
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
              {ap.partner_code}
            </span>
            {ap.business_name ? (
              <span className="text-[11px] font-semibold text-slate-500">{ap.business_name}</span>
            ) : null}
          </>
        }
        actions={
          <>
            <Link
              href="/ap/notifications"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Link>
            <Link
              href="/ap/applications/new"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <PlusCircle className="h-4 w-4" />
              Quick Apply
            </Link>
          </>
        }
      />

      {/* Identity strip */}
      <GlassPanel className="flex flex-wrap items-center gap-4" padding="md">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-extrabold text-white">
          {partnerInitials(ap.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-slate-900">{ap.full_name}</p>
          <p className="text-[11px] font-semibold text-slate-500">
            {[ap.district, ap.state].filter(Boolean).join(", ") || "Service area not set"}
            {" · "}
            <span className="capitalize">{ap.partner_type.replace(/_/g, " ")}</span>
          </p>
        </div>
        <Link href="/ap/profile" className="text-xs font-bold text-indigo-700 hover:underline">
          View profile
        </Link>
      </GlassPanel>

      {/* Metrics */}
      <section aria-label="Business metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Today’s Earnings"
          value={formatINR(stats.todayEarnings ?? 0)}
          icon={<HandCoins className="h-4 w-4" />}
          delta={earningsDelta}
          hint="vs yesterday"
        />
        <MetricCard
          label="Wallet Balance"
          value={formatINR(stats.walletBalance)}
          icon={<WalletCards className="h-4 w-4" />}
          hint="Available balance"
        />
        <MetricCard
          label="Total Applications"
          value={formatCount(stats.totalApplications)}
          icon={<FileText className="h-4 w-4" />}
          delta={appsDelta}
          hint="vs yesterday"
        />
        <MetricCard
          label="Pending Applications"
          value={formatCount(stats.pendingApplications)}
          icon={<Receipt className="h-4 w-4" />}
          hint="Needs attention"
        />
        <MetricCard label="Completed Applications" value={formatCount(stats.completedApplications)} hint="Lifetime" />
        <MetricCard
          label="Total Customers"
          value={formatCount(stats.customerCount)}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          label="Commission Earned"
          value={formatINR(stats.commissionEarned)}
          delta={weekAppsDelta}
          hint="vs last month volume"
        />
        <MetricCard
          label="Pending Settlement"
          value={formatINR(stats.commissionPending)}
          hint={`Paid ${formatINR(stats.totalPaidPayout)}`}
        />
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions" className="space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900">Quick actions</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard key={action.label} {...action} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Recent applications */}
        <section className="space-y-3 lg:col-span-3" aria-label="Recent applications">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">Recent applications</h2>
            <Link href="/ap/applications" className="text-xs font-bold text-indigo-700 hover:underline">
              View all
            </Link>
          </div>
          {recentApps.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Submit your first customer application to start earning."
              actionLabel="Apply New Service"
              actionHref="/ap/applications/new"
            />
          ) : (
            <GlassPanel padding="none" className="overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {recentApps.map((app) => {
                  const name = app.customerName || app.customer_name || "Customer";
                  return (
                    <li key={app.id}>
                      <Link
                        href={`/ap/applications/${app.id}`}
                        className="flex items-start gap-3 px-4 py-3.5 transition hover:bg-slate-50/80 focus-visible:bg-slate-50 focus-visible:outline-none"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-bold text-slate-900">{name}</p>
                            <StatusBadge status={app.status} />
                          </div>
                          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                            {app.service_name}
                            {app.application_code ? ` · ${app.application_code}` : ""}
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-indigo-600">{nextActionForStatus(app.status)}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </GlassPanel>
          )}
        </section>

        {/* Wallet + announcements */}
        <aside className="space-y-4 lg:col-span-2">
          <section aria-label="Wallet activity" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Wallet activity</h2>
              <Link href="/ap/wallet" className="text-xs font-bold text-indigo-700 hover:underline">
                Open wallet
              </Link>
            </div>
            {dbTransactions.length === 0 ? (
              <EmptyState
                title="No commission activity yet"
                description="Completed eligible applications will appear here."
                actionLabel="View commissions"
                actionHref="/ap/commissions"
              />
            ) : (
              <GlassPanel padding="none" className="overflow-hidden">
                <ul className="divide-y divide-slate-100">
                  {dbTransactions.map((tx) => (
                    <li key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800">{tx.title}</p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          {new Date(tx.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "shrink-0 text-xs font-extrabold tabular-nums",
                          tx.type === "credit" ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        {tx.type === "credit" ? "+" : "−"}
                        {formatINR(Math.abs(tx.amount))}
                      </p>
                    </li>
                  ))}
                </ul>
              </GlassPanel>
            )}
          </section>

          {announcements.length > 0 ? (
            <section aria-label="Announcements" className="space-y-3">
              <h2 className="text-sm font-extrabold text-slate-900">Announcements</h2>
              <div className="space-y-2">
                {announcements.slice(0, 3).map((ann) => (
                  <GlassPanel key={ann.id} padding="sm">
                    <p className="text-xs font-extrabold text-slate-900">{ann.title}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">{ann.body}</p>
                  </GlassPanel>
                ))}
              </div>
            </section>
          ) : null}

          {teamMemberCount > 0 ? (
            <section aria-label="Team" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900">Team ({teamMemberCount})</h2>
                <Link href="/ap/team" className="text-xs font-bold text-indigo-700 hover:underline">
                  Manage
                </Link>
              </div>
              <GlassPanel padding="sm" className="space-y-2">
                {teamMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800">{m.full_name}</p>
                      <p className="font-mono text-[10px] text-slate-400">{m.partner_code}</p>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </GlassPanel>
            </section>
          ) : null}
        </aside>
      </div>

      {/* Lightweight trend summary — accessible text, no heavy chart library on first paint */}
      {chartData.length > 0 ? (
        <section aria-label="Monthly trend" className="space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900">Monthly trend</h2>
          <GlassPanel padding="md">
            <p className="sr-only">
              Monthly application and earnings trend for the last {chartData.length} months.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {chartData.slice(-6).map((point) => (
                <div key={point.name} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{point.name}</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">
                    {formatCount(point.filings)} apps
                  </p>
                  <p className="text-xs font-bold text-emerald-700">{formatINR(point.earnings)}</p>
                </div>
              ))}
            </div>
          </GlassPanel>
        </section>
      ) : null}
    </div>
  );
}
