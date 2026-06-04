/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Gift, Copy, Check, Share2, Users, Award, MessageCircle, Send, MessageSquare, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function ReferEarn() {
  const [refCode, setRefCode] = useState("");
  const [refLink, setRefLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [stats, setStats] = useState({
    invitesSent: 0,
    usersRegistered: 0,
    firstCompleted: 0,
    rewardEarned: 0,
    todaysReward: 0,
    lifetimeReward: 0,
    walletBalance: 0,
    pendingRewards: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    async function loadReferralDetails() {
      const supabase = createClient();
      if (!supabase) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsLoggedIn(false);
        return;
      }
      setIsLoggedIn(true);

      try {
        const res = await fetch("/api/wallet");
        const data = await res.json();
        
        if (data) {
          const summary = data.referralSummary || {};
          const referralsList = summary.referrals || [];
          const code = summary.code || "";
          const link = summary.link || "";
          setRefCode(code);
          setRefLink(link);

          const total = summary.total || 0;
          const completed = summary.completed || 0;
          const rewardEarned = summary.rewardEarned || 0;

          // Today's completed rewards
          const todayStr = new Date().toISOString().split("T")[0];
          const todaysCompleted = referralsList.filter(
            (r: any) => r.status === "completed" && r.completed_at && r.completed_at.startsWith(todayStr)
          );
          const todaysReward = todaysCompleted.reduce((sum: number, r: any) => sum + (r.reward_amount || 100), 0);

          // Lifetime and wallet rewards
          const walletBalance = data.balance || 0;
          const lifetimeReward = data.lifetime_earned || rewardEarned;
          const pendingRewards = referralsList.filter((r: any) => r.status === "pending").length * 100;
          const conversionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

          setStats({
            invitesSent: total,
            usersRegistered: total,
            firstCompleted: completed,
            rewardEarned: rewardEarned,
            todaysReward,
            lifetimeReward,
            walletBalance,
            pendingRewards,
            conversionRate,
          });
        }
      } catch (e) {
        console.warn("Failed to fetch referral details", e);
      }
    }

    loadReferralDetails();
  }, []);

  const linkToShare = refLink || `https://rnos.in/signup?ref=${refCode || "DIGI777"}`;
  const shareText = `Join DigiConnect Dukan using my link to get 100% cashback rewards on your first digital/gov service application: ${linkToShare}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(linkToShare);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const shareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(linkToShare)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const shareSMS = () => {
    const url = `sms:?body=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Refer & Earn - DigiConnect Dukan",
          text: shareText,
          url: linkToShare,
        });
      } catch (err) {
        console.warn("Native share failed", err);
      }
    } else {
      shareWhatsApp();
    }
  };

  // Level Milestones
  const totalInvites = stats.invitesSent;
  let level = 1;
  let levelName = "Bronze Level (0-10)";
  let nextLevelName = "Level 2 (10-25)";
  let nextGoal = 10;
  let progressPercent = 0;

  if (totalInvites < 10) {
    level = 1;
    levelName = "Level 1: Bronze Referrer";
    nextLevelName = "Level 2: Silver Referrer (10 Invites)";
    nextGoal = 10;
    progressPercent = Math.min((totalInvites / 10) * 100, 100);
  } else if (totalInvites < 25) {
    level = 2;
    levelName = "Level 2: Silver Referrer";
    nextLevelName = "Level 3: Gold Referrer (25 Invites)";
    nextGoal = 25;
    progressPercent = Math.min(((totalInvites - 10) / 15) * 100, 100);
  } else if (totalInvites < 50) {
    level = 3;
    levelName = "Level 3: Gold Referrer";
    nextLevelName = "Level 4: Platinum Referrer (50 Invites)";
    nextGoal = 50;
    progressPercent = Math.min(((totalInvites - 25) / 25) * 100, 100);
  } else {
    level = 4;
    levelName = "Level 4: Platinum Referrer";
    nextLevelName = "Max Level Reached!";
    nextGoal = totalInvites;
    progressPercent = 100;
  }

  return (
    <section id="refer-earn" className="bg-white py-12 px-3">
      {styleTag}
      <div className="container-shell">
        <div className="glass-panel overflow-hidden rounded-[2.25rem] border border-blue-150 bg-gradient-to-br from-white/80 via-blue-50/20 to-slate-50 p-5 shadow-soft md:p-10 relative">
          
          {/* Subtle backgrounds */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 rounded-full bg-blue-500/5 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />

          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start relative z-10">
            
            {/* Left Content Column */}
            <div className="space-y-6 text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-blue-700 shadow-sm">
                <Gift className="h-3.5 w-3.5 text-orange-500" />
                Referral Hub
              </span>
              
              <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4.5xl leading-tight">
                Invite Friends, Unlock Milestones & Earn Cash
              </h2>
              
              <p className="text-sm font-semibold text-slate-500 leading-relaxed">
                Apne friends aur agents ko invite karein. Jab aapka referred user register karke first paid service complete karega, toh aapko milega **₹100 Cash rewards** direct wallet me!
              </p>

              {/* Stats Grid */}
              {isLoggedIn ? (
                <div className="grid grid-cols-3 gap-2.5 pt-2">
                  {[
                    { label: "Invites Sent", val: stats.invitesSent },
                    { label: "Registered", val: stats.usersRegistered },
                    { label: "Completed", val: stats.firstCompleted, theme: "text-blue-700" },
                    { label: "Today's Earn", val: `₹${stats.todaysReward}`, theme: "text-emerald-600" },
                    { label: "Pending Reward", val: `₹${stats.pendingRewards}`, theme: "text-orange-500" },
                    { label: "Conversion", val: `${stats.conversionRate}%` },
                  ].map((s, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-150 bg-white/70 p-3 shadow-[0_2px_8px_rgba(15,23,42,0.01)] backdrop-blur-md">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">{s.label}</p>
                      <p className={`text-base font-black mt-2 leading-none ${s.theme || "text-slate-800"}`}>{s.val}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-150/80 bg-slate-50/50 p-5 text-center shadow-xs">
                  <p className="text-xs font-semibold text-slate-500">
                    Register ya login karke real-time statistics aur details track karein.
                  </p>
                </div>
              )}

              {/* Progress Milestones display */}
              {isLoggedIn && (
                <div className="relative pt-2 bg-slate-50/50 border border-slate-150/40 p-4 rounded-2xl">
                  <div className="flex justify-between items-center text-xs font-black text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-orange-500" />
                      {levelName}
                    </span>
                    <span className="text-[10px] text-slate-455">Next: {nextLevelName}</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mt-3 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[8.5px] font-black text-slate-450 uppercase tracking-wider mt-2.5">
                    <span>Lvl 1 (10)</span>
                    <span>Lvl 2 (25)</span>
                    <span>Lvl 3 (50)</span>
                    <span>Lvl 4 (50+)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Interactive Referral Card */}
            <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-md flex flex-col justify-between text-left relative overflow-hidden h-full">
              {/* Premium Coin Float illustrations */}
              <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center anim-spin-coin border border-orange-200/50 text-orange-600 font-black text-xl shadow-xs">
                ₹
              </div>
              <div className="absolute top-16 right-16 w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center anim-spin-coin-slow border border-yellow-200/50 text-yellow-600 font-bold text-sm shadow-xs opacity-60" />

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 leading-none">Referral Assets Dashboard</p>
                
                {isLoggedIn ? (
                  /* Logged In State */
                  <div className="mt-5 space-y-4">
                    
                    {/* Compact Highlight Box */}
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-4">
                      <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Referral Reward</p>
                        <p className="text-sm font-black text-slate-800 mt-1">₹{stats.rewardEarned}</p>
                      </div>
                      <div className="text-center border-x border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Wallet Balance</p>
                        <p className="text-sm font-black text-blue-700 mt-1">₹{stats.walletBalance}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Lifetime Earned</p>
                        <p className="text-sm font-black text-slate-800 mt-1">₹{stats.lifetimeReward}</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Referral Code</span>
                      <div className="flex items-center gap-2 mt-1.5 bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-sm font-black text-slate-800 tracking-[0.2em] uppercase shadow-inner">
                        {refCode || "DIGI777"}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Sharing Link</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <input
                          type="text"
                          readOnly
                          value={linkToShare}
                          className="flex-1 text-xs bg-slate-50 border border-slate-150 p-2.5 rounded-xl outline-none font-semibold text-slate-500 truncate shadow-inner"
                        />
                        <button
                          onClick={handleCopy}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white hover:bg-slate-900 transition active:scale-95 shadow-sm"
                          title="Copy Link"
                        >
                          {copied ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4.5 w-4.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Active Share Action Grid (No placeholders) */}
                    <div className="pt-2">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Quick Share Actions</span>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        <button
                          onClick={shareWhatsApp}
                          className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 transition active:scale-95 shadow-xs"
                          title="Share on WhatsApp"
                        >
                          <MessageCircle className="h-4.5 w-4.5" />
                          <span className="text-[8px] font-extrabold uppercase mt-1">WhatsApp</span>
                        </button>
                        <button
                          onClick={shareTelegram}
                          className="flex flex-col items-center justify-center p-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-700 transition active:scale-95 shadow-xs"
                          title="Share on Telegram"
                        >
                          <Send className="h-4.5 w-4.5" />
                          <span className="text-[8px] font-extrabold uppercase mt-1">Telegram</span>
                        </button>
                        <button
                          onClick={shareSMS}
                          className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-100 text-amber-700 transition active:scale-95 shadow-xs"
                          title="Share via SMS"
                        >
                          <MessageSquare className="h-4.5 w-4.5" />
                          <span className="text-[8px] font-extrabold uppercase mt-1">SMS</span>
                        </button>
                        <button
                          onClick={shareNative}
                          className="flex flex-col items-center justify-center p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 transition active:scale-95 shadow-xs"
                          title="Share natively"
                        >
                          <Share2 className="h-4.5 w-4.5" />
                          <span className="text-[8px] font-extrabold uppercase mt-1">Share</span>
                        </button>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* Unauthenticated Mock State */
                  <div className="mt-6 space-y-4">
                    <div className="bg-slate-50/70 border border-slate-150 p-6 rounded-2xl text-center space-y-4 shadow-inner">
                      <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                        Referral links generate karne, stats track karne aur cash claim karne ke liye user account login karein.
                      </p>
                      <Link
                        href="/login/customer"
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 text-xs font-extrabold text-white shadow-md active:scale-95 transition"
                      >
                        Login to Get Link
                        <Send className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Secure tag */}
              <div className="mt-6 flex items-center gap-1.5 justify-center text-[10px] font-bold text-slate-450 border-t border-slate-100/50 pt-3">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                Verified & Handled by RNOS Rewards Engine
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

// Scoped spin animations for reward illustrations
const styleTag = (
  <style jsx global>{`
    @keyframes spin-coin-subtle {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-6px) rotate(15deg); }
    }
    .anim-spin-coin {
      animation: spin-coin-subtle 4s ease-in-out infinite;
    }
    .anim-spin-coin-slow {
      animation: spin-coin-subtle 5s ease-in-out infinite 0.5s;
    }
  `}</style>
);
