"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Gift, Plus, WalletCards, Sparkles, X } from "lucide-react";

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
  isProfileIncomplete?: boolean;
};

function safeCurrency(value: number) {
  return formatCurrency(Number.isFinite(value) ? value : 0);
}

export function CustomerDashboard({ applications, stats, profile, isProfileIncomplete = false }: CustomerDashboardProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const isDismissed = localStorage.getItem("dismiss-profile-reminder") === "true";
    setDismissed(isDismissed);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("dismiss-profile-reminder", "true");
    setDismissed(true);
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fcfdfe_0%,#f4f8ff_100%)] px-3 py-4 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:gap-5">
        
        {/* Unified Premium CRED-Style Wallet + Referral Hero Board */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_24px_50px_rgba(15,23,42,0.18)] md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(37,99,235,0.22),transparent_35%),radial-gradient(circle_at_88%_90%,rgba(249,115,22,0.16),transparent_30%)]" />
          
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-400">
                <Sparkles className="h-3 w-3 text-orange-400 animate-pulse" />
                Customer Account
              </p>
              <h1 className="mt-3 break-words text-2xl font-extrabold tracking-tight text-white md:text-3.5xl">
                Welcome back, {profile.name}
              </h1>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-400 md:text-sm">
                Track your active digital applications, referral wallet balance, and rewards.
              </p>
            </div>
            
            <Link href="/services" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-extrabold text-white shadow-lg shadow-blue-600/15 transition duration-150 active:scale-[0.98]">
              <Plus className="h-4 w-4" />
              Apply For Service
            </Link>
          </div>

          {/* CRED-inspired Cards Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            
            {/* Wallet Panel */}
            <div className="rounded-2xl border border-white/8 bg-white/6 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  <WalletCards className="h-4 w-4 text-blue-400" />
                  DigiWallet Balance
                </span>
                <Link href="/customer/wallet" className="text-xs font-extrabold text-blue-400 hover:text-blue-300">
                  History &rarr;
                </Link>
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                {safeCurrency(stats.walletBalance)}
              </p>
              <p className="mt-2 text-[10px] font-bold text-emerald-400 leading-none">
                &bull; 20% cashback ready for next service apply
              </p>
            </div>

            {/* Refer & Earn Panel */}
            <div className="rounded-2xl border border-white/8 bg-white/6 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  <Gift className="h-4 w-4 text-orange-400" />
                  Referral Earning
                </span>
                <span className="rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-orange-400">
                  Code: {stats.code || "SYNCING"}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <p className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                  {safeCurrency(stats.lifetimeEarning)}
                </p>
                <div className="flex shrink-0 gap-1.5">
                  <ReferralCopyButton value={stats.link} label="Copy Link" />
                </div>
              </div>
              <p className="mt-2 text-[10px] font-bold text-slate-400 leading-tight truncate">
                {stats.link || "Generating your custom referral link..."}
              </p>
            </div>

          </div>

          {/* Quick Metrics Strip */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/8 pt-4">
            <div className="flex gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Total Referrals</p>
                <p className="text-sm font-extrabold text-white">{stats.totalReferrals} Joins</p>
              </div>
              <div className="border-l border-white/8 pl-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{"Today's Earnings"}</p>
                <p className="text-sm font-extrabold text-emerald-400">{safeCurrency(stats.todayEarning)}</p>
              </div>
            </div>
            
            <Link href="/customer/profile" className="text-xs font-extrabold text-slate-400 hover:text-white transition duration-150">
              Edit Account Profile &rarr;
            </Link>
          </div>

        </section>

        {isProfileIncomplete && !dismissed && (
          <section className="relative overflow-hidden rounded-2xl border border-orange-100 bg-orange-50/20 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Complete your profile for a better experience.</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/customer/profile"
                  className="inline-flex h-8 items-center justify-center rounded-full bg-orange-600 px-3.5 text-[11px] font-bold text-white shadow-sm hover:bg-orange-700 transition duration-150"
                >
                  Complete Profile
                </Link>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                  aria-label="Dismiss reminder"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* My Applications Section (Includes Timeline) */}
        <CustomerApplicationsList applications={applications} />

      </div>
    </main>
  );
}
