/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Gift, Copy, Check, Share2, Users, Award, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function ReferEarn() {
  const [refCode, setRefCode] = useState("");
  const [refLink, setRefLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ referrals: 0, earnings: 0 });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
        
        if (data.referralSummary) {
          setRefCode(data.referralSummary.code || "");
          setRefLink(data.referralSummary.link || "");
          
          const completedCount = data.referralSummary.referrals?.filter((r: any) => r.status === "completed")?.length || 0;
          const earnings = data.referralSummary.rewardEarned || (completedCount * 100); // 100 Rs per verified referral
          setStats({
            referrals: data.referralSummary.total || 0,
            earnings: earnings,
          });
        }
      } catch (e) {
        console.warn("Failed to fetch referral details", e);
      }
    }

    loadReferralDetails();
  }, []);

  const handleCopy = async () => {
    const linkToCopy = refLink || `https://rnos.in/signup?ref=${refCode || "DIGI777"}`;
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  const handleShare = async () => {
    const linkToShare = refLink || `https://rnos.in/signup?ref=${refCode || "DIGI777"}`;
    const text = `Join DigiConnect Dukan using my link to get 100% cashback rewards on your first digital/gov service application: ${linkToShare}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Refer & Earn - DigiConnect Dukan",
          text: text,
          url: linkToShare,
        });
      } catch (err) {
        console.warn("Share cancelled or failed", err);
      }
    } else {
      // Fallback: open WhatsApp
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  return (
    <section id="refer-earn" className="bg-white py-10 px-3">
      <div className="container-shell">
        <div className="glass-panel overflow-hidden rounded-[2.25rem] border border-blue-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(239,246,255,0.3))] p-6 shadow-soft md:p-10 relative">
          
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center relative z-10">
            
            {/* Left Content Column */}
            <div className="space-y-5 text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-blue-700 shadow-sm">
                <Gift className="h-3.5 w-3.5 text-orange-500" />
                Refer & Earn program
              </span>
              
              <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl leading-tight">
                Invite Friends & Earn ₹100 Cash rewards
              </h2>
              
              <p className="text-sm font-semibold text-slate-500 max-w-xl">
                Apne friends, clients ya agents ko invite karein. Jab aapka referred user register karke first paid service complete karega, toh aapko milega ₹100 reward cash direct wallet me!
              </p>

              {/* Progress Milestones display */}
              <div className="relative pt-4 max-w-md">
                <div className="flex justify-between text-xs font-bold text-slate-650 mb-2">
                  <span>Milestone Tier</span>
                  <span>{stats.referrals} / 10 Referrals</span>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 w-full bg-slate-150 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((stats.referrals / 10) * 100, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2">
                  <span>Start (₹0)</span>
                  <span>Tier 1 (₹500 Bonus)</span>
                  <span>Super Referrer (₹1000 Bonus)</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Referral Card */}
            <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm flex flex-col justify-between text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-40 h-40 rounded-full bg-blue-500/5 blur-[50px] pointer-events-none" />

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-450 leading-none">Your Invite Assets</p>
                
                {isLoggedIn ? (
                  /* Logged In State */
                  <div className="mt-4 space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400">Referral Code</span>
                      <div className="flex items-center gap-2 mt-1 bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-sm font-black text-slate-800 tracking-widest uppercase">
                        {refCode || "DIGI777"}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400">Personal Sharing Link</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          readOnly
                          value={refLink || `https://rnos.in/signup?ref=${refCode || "DIGI777"}`}
                          className="flex-1 text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-xl outline-none font-semibold text-slate-500 truncate"
                        />
                        <button
                          onClick={handleCopy}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition active:scale-95 shadow-sm"
                          title="Copy Link"
                        >
                          {copied ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4.5 w-4.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Stats Dashboard inside card */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                      <div className="bg-blue-50/50 border border-blue-100/30 p-2.5 rounded-xl flex items-center gap-2">
                        <Users className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 leading-none">Invites</p>
                          <p className="text-xs font-black text-slate-800 mt-1">{stats.referrals} Joined</p>
                        </div>
                      </div>
                      <div className="bg-emerald-50/50 border border-emerald-100/30 p-2.5 rounded-xl flex items-center gap-2">
                        <Award className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 leading-none">Rewards</p>
                          <p className="text-xs font-black text-slate-800 mt-1">₹{stats.earnings}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Unauthenticated Mock State */
                  <div className="mt-4 space-y-4">
                    <div className="bg-slate-50/70 border border-slate-100 p-4 rounded-2xl text-center space-y-3.5">
                      <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                        Referral link generate karne aur details track karne ke liye login karein.
                      </p>
                      <Link
                        href="/login/customer"
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 text-xs font-extrabold text-white shadow-md active:scale-95 transition"
                      >
                        Login to Get Link
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Share Buttons */}
              {isLoggedIn && (
                <div className="mt-5">
                  <button
                    onClick={handleShare}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-650 to-indigo-650 text-xs font-black text-white hover:brightness-110 transition active:scale-[0.98] shadow-sm"
                  >
                    <Share2 className="h-4 w-4" />
                    Share Invite Link
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
