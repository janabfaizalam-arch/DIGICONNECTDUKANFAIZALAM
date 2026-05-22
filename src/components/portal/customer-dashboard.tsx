import Link from "next/link";
import { ArrowRight, Gift, Plus, WalletCards } from "lucide-react";

import { CustomerApplicationsList } from "@/components/portal/customer-applications-list";
import { ReferralCopyButton } from "@/components/portal/referral-copy-button";
import { formatCurrency } from "@/lib/portal-data";
import type { CustomerDashboardApplication, CustomerDashboardStats } from "@/lib/customer-dashboard-data";

type CustomerDashboardProps = {
  applications: CustomerDashboardApplication[];
  stats: CustomerDashboardStats;
  profile: {
    name: string;
  };
};

function safeCurrency(value: number) {
  return formatCurrency(Number.isFinite(value) ? value : 0);
}

export function CustomerDashboard({ applications, stats, profile }: CustomerDashboardProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8ff_100%)] px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:gap-5">
        <section className="rounded-[1.5rem] border border-white/80 bg-white/78 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] backdrop-blur-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">Customer Dashboard</p>
              <h1 className="mt-1 break-words text-2xl font-bold text-slate-950 md:text-3xl">Welcome, {profile.name}</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">Track applications, rewards, and referrals from one compact view.</p>
            </div>
            <Link href="/services" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-blue-700 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/15">
              <Plus className="h-4 w-4" />
              Apply Service
            </Link>
          </div>

          <div id="refer-earn" className="mt-4 rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,rgba(255,247,237,0.94),rgba(239,246,255,0.92))] p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                  <Gift className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-950">Refer & Earn</p>
                  <p className="truncate text-xs font-semibold text-slate-600">{stats.code ? `Code ${stats.code}` : "Referral code will appear after account sync."}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ReferralCopyButton value={stats.link} label="Copy Link" />
                <Link href="/customer/wallet" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 text-xs font-extrabold text-blue-700">
                  <WalletCards className="h-3.5 w-3.5" />
                  Wallet
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Customer rewards stats" className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
          {[
            ["Total Referrals", String(stats.totalReferrals)],
            ["Today's Referral Earning", safeCurrency(stats.todayEarning)],
            ["Lifetime Referral Earning", safeCurrency(stats.lifetimeEarning)],
            ["Wallet Balance", safeCurrency(stats.walletBalance)],
          ].map(([label, value]) => (
            <article key={label} className="min-w-0 rounded-2xl border border-white/85 bg-white/84 p-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)] md:p-4">
              <p className="text-[11px] font-bold leading-4 text-slate-500 md:text-xs">{label}</p>
              <p className="mt-2 break-words text-lg font-extrabold text-slate-950 md:text-2xl">{value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[1.5rem] border border-white/85 bg-white/84 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">Referral Summary</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">Share your referral link</h2>
            </div>
            <Link href="/customer/wallet" className="inline-flex items-center gap-1 text-sm font-extrabold text-blue-700">
              Open Wallet
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <p className="min-w-0 break-all rounded-2xl bg-slate-50 px-3 py-2 font-mono text-xs font-bold text-slate-700">
              {stats.link || "Your referral link is not available yet."}
            </p>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-2 md:min-w-60">
              <div className="rounded-2xl bg-blue-50/70 px-3 py-2">
                <p className="text-[11px] font-bold text-slate-500">Referrals</p>
                <p className="text-lg font-extrabold text-slate-950">{stats.totalReferrals}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50/70 px-3 py-2">
                <p className="text-[11px] font-bold text-slate-500">Earnings</p>
                <p className="text-lg font-extrabold text-emerald-700">{safeCurrency(stats.lifetimeEarning)}</p>
              </div>
            </div>
          </div>
        </section>

        <CustomerApplicationsList applications={applications} />
      </div>
    </main>
  );
}
