"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Gift, Wallet, ArrowRight, Users, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function RewardCenter() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralReward, setReferralReward] = useState(0);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      if (!supabase) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      setIsLoggedIn(true);

      try {
        const res = await fetch("/api/wallet");
        const data = await res.json();

        if (data) {
          setWalletBalance(data.balance || 0);
          const summary = data.referralSummary || {};
          setReferralReward(summary.rewardEarned || 0);
        }
      } catch {
        /* ignore */
      }
    }

    loadData();
  }, []);

  return (
    <section className="bg-white py-10 md:py-16 px-3">
      <div className="container-shell">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-500 flex items-center justify-center gap-1.5">
            <Gift className="h-3.5 w-3.5" />
            Rewards
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl leading-tight">
            Earn Rewards on Every Service
          </h2>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Get cashback, referral bonuses, and wallet benefits automatically.
          </p>
        </div>

        {/* Reward Cards Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* 20% Cashback Card */}
          <div className="group rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-6 transition hover:shadow-md hover:-translate-y-0.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Wallet className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">20% Cashback</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Every paid service automatically credits 20% reward points to your DigiWallet. Use points for discounts on future services.
            </p>
            {isLoggedIn && (
              <div className="mt-4 rounded-xl bg-white border border-blue-100 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Wallet Balance</p>
                  <p className="text-base font-black text-blue-700">₹{walletBalance}</p>
                </div>
                <Link
                  href="/customer/wallet"
                  className="flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-3 text-[10px] font-bold text-white hover:bg-blue-700 transition"
                >
                  View <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* ₹100 Referral Bonus */}
          <div className="group rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/50 to-amber-50/30 p-6 transition hover:shadow-md hover:-translate-y-0.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">₹100 Referral Bonus</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Invite friends to DigiConnect Dukan. When they complete their first paid service, you earn ₹100 instant reward in your wallet.
            </p>
            {isLoggedIn && (
              <div className="mt-4 rounded-xl bg-white border border-orange-100 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Referral Earned</p>
                  <p className="text-base font-black text-orange-600">₹{referralReward}</p>
                </div>
                <Link
                  href="/customer/dashboard#refer-earn"
                  className="flex h-8 items-center gap-1 rounded-lg bg-orange-500 px-3 text-[10px] font-bold text-white hover:bg-orange-600 transition"
                >
                  Invite <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Wallet Benefits */}
          <div className="group rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 p-6 transition hover:shadow-md hover:-translate-y-0.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">Wallet Benefits</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Use wallet points for up to 50% discount on any future service. 100% cashback on your first service. Points never expire.
            </p>
            <div className="mt-4 space-y-2">
              {["100% first service cashback", "Up to 50% discount", "Points never expire"].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA for non-logged-in users */}
        {!isLoggedIn && (
          <div className="mt-8 text-center">
            <Link
              href="/login/customer"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white hover:bg-slate-800 transition active:scale-[0.98]"
            >
              Login to Start Earning
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
