"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Gift, Wallet, ArrowRight, Check, Copy, MessageCircle, HelpCircle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function RewardCenter() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [cashbackEarned, setCashbackEarned] = useState(0);
  const [referralReward, setReferralReward] = useState(0);
  const [refCode, setRefCode] = useState("");
  const [refLink, setRefLink] = useState("");
  const [copied, setCopied] = useState(false);

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
          setCashbackEarned(data.lifetime_earned || 0);
          const summary = data.referralSummary || {};
          setReferralReward(summary.rewardEarned || 0);
          setRefCode(summary.code || "");
          setRefLink(summary.link || "");
        }
      } catch {
        /* ignore */
      }
    }

    void loadData();
  }, []);

  const inviteLink = refLink || `https://rnos.in/signup?ref=${refCode || "DIGI777"}`;
  const shareText = `Join DigiConnect Dukan using my link to get 100% cashback rewards on your first digital/gov service application: ${inviteLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy link:", err);
    }
  };

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  return (
    <section id="rewards" className="bg-white py-12 px-4 relative overflow-hidden">
      
      {/* Scoped CSS animations for the premium coin stack */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shine-glint {
          0% { left: -100%; opacity: 0; }
          40% { left: 100%; opacity: 0.8; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes coin-bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes coin-bounce-delay {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        .animate-glint {
          position: absolute;
          width: 200%;
          height: 100%;
          top: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4) 50%, transparent);
          animation: shine-glint 4s ease-in-out infinite;
        }
        .anim-coin-1 { animation: coin-bounce 4s ease-in-out infinite; }
        .anim-coin-2 { animation: coin-bounce-delay 4s ease-in-out 0.8s infinite; }
      `}} />

      {/* Decorative background gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-blue-500/5 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-orange-500/5 blur-[90px] pointer-events-none" />

      <div className="container-shell max-w-[1600px] mx-auto relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500 flex items-center justify-center gap-1.5">
            <Gift className="h-3.5 w-3.5" /> Rewards Program
          </p>
          <h2 className="mt-1.5 text-xl md:text-2xl font-black tracking-tight text-slate-850">
            Refer & Earn Center
          </h2>
        </div>

        {/* Bento Grid layout: Rules (Left) & Dashboard (Right) */}
        <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto items-stretch">
          
          {/* Rules Card */}
          <div className="glass-liquid-premium rounded-3xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden border-white/50">
            
            {/* Animated SVG Graphics - Custom Premium Coin Stack */}
            <div className="absolute top-6 right-6 w-20 h-20 pointer-events-none flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-16 h-16 overflow-visible">
                {/* Glow ring */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(249, 115, 22, 0.12)" strokeWidth="4" />
                {/* Bottom Coin */}
                <g className="anim-coin-2">
                  <ellipse cx="50" cy="74" rx="28" ry="10" fill="#b45309" />
                  <ellipse cx="50" cy="70" rx="28" ry="10" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
                </g>
                {/* Middle Coin */}
                <g className="anim-coin-1">
                  <ellipse cx="50" cy="59" rx="28" ry="10" fill="#d97706" />
                  <ellipse cx="50" cy="55" rx="28" ry="10" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
                </g>
                {/* Top Coin */}
                <g className="anim-coin-2">
                  <ellipse cx="50" cy="44" rx="28" ry="10" fill="#f59e0b" />
                  <ellipse cx="50" cy="40" rx="28" ry="10" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
                  <text x="50" y="44" fill="#ffffff" fontWeight="900" fontSize="13" textAnchor="middle">₹</text>
                </g>
              </svg>
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-4">
                <Sparkles className="h-4 w-4 text-orange-500" /> Reward Rules & Benefits
              </h3>
              
              <ul className="space-y-4">
                {[
                  { text: "Every Paid Service", highlight: "20% Wallet Cashback", desc: "instantly on completion." },
                  { text: "First Service", highlight: "100% Welcome Cashback", desc: "return on first order." },
                  { text: "Referral Bonus", highlight: "₹100 Signup Bonus", desc: "for friends using link." },
                  { text: "Referrer Payout", highlight: "₹100 Cash Credit", desc: "on friend's first completion." }
                ].map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] mt-0.5 border border-emerald-100/50">
                      ✓
                    </span>
                    <div className="text-left leading-normal">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase leading-none">{rule.text}</span>
                      <p className="text-xs font-black text-slate-850 mt-1 leading-tight">
                        {rule.highlight} <span className="font-semibold text-slate-500">{rule.desc}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 border-t border-slate-200/50 pt-4 flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5 text-blue-500" /> Auto-applied at checkout
              </span>
              <a 
                href="#faq"
                className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
              >
                <HelpCircle className="h-3.5 w-3.5" /> How it Works
              </a>
            </div>

          </div>

          {/* Bento Dashboard Section */}
          <div className="glass-liquid-premium rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between text-left relative overflow-hidden border-white/50">
            
            {isLoggedIn ? (
              /* Logged In Bento Dashboard */
              <div className="space-y-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 leading-none">Your Wallet Dashboard</p>
                  
                  {/* Bento Stats Grid */}
                  <div className="grid grid-cols-3 gap-2.5 mt-4">
                    {/* Wallet Balance */}
                    <div className="rounded-2xl bg-blue-50/40 border border-blue-100/30 p-3 flex flex-col justify-between">
                      <p className="text-[8px] font-black text-slate-450 uppercase tracking-wide leading-none">Wallet Balance</p>
                      <p className="text-base font-black text-blue-600 mt-2.5 leading-none">₹{walletBalance.toLocaleString("en-IN")}</p>
                    </div>
                    {/* Cashback Earned */}
                    <div className="rounded-2xl bg-emerald-50/40 border border-emerald-100/30 p-3 flex flex-col justify-between">
                      <p className="text-[8px] font-black text-slate-450 uppercase tracking-wide leading-none">Cashback Earned</p>
                      <p className="text-base font-black text-emerald-600 mt-2.5 leading-none">₹{cashbackEarned.toLocaleString("en-IN")}</p>
                    </div>
                    {/* Referral Earnings */}
                    <div className="rounded-2xl bg-orange-50/40 border border-orange-100/30 p-3 flex flex-col justify-between">
                      <p className="text-[8px] font-black text-slate-450 uppercase tracking-wide leading-none">Referral Earned</p>
                      <p className="text-base font-black text-orange-600 mt-2.5 leading-none">₹{referralReward.toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  {/* Referral Code Box */}
                  <div className="mt-5 grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Referral Code</label>
                      <div className="flex h-9 items-center justify-between rounded-xl bg-slate-100/60 border border-slate-200/50 px-3 text-xs font-black text-slate-700 select-all">
                        {refCode || "DIGI777"}
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Referral Link</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={inviteLink}
                          className="flex-1 h-9 text-[10px] font-semibold text-slate-500 bg-slate-100/60 border border-slate-200/50 rounded-xl px-2.5 outline-none truncate shadow-inner"
                        />
                        <button
                          onClick={handleCopy}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-850 transition active:scale-95 shadow-sm cursor-pointer"
                          title="Copy Link"
                        >
                          {copied ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTAs */}
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-200/50">
                  <div className="flex gap-3">
                    <button
                      onClick={handleWhatsAppShare}
                      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-xs font-black text-white hover:bg-emerald-750 transition-all active:scale-95 shadow-sm cursor-pointer"
                    >
                      <MessageCircle className="h-4.5 w-4.5" /> Invite Friends
                    </button>
                    <Link
                      href="/customer/wallet"
                      className="flex h-10 px-4 items-center justify-center gap-1.5 rounded-xl border border-slate-250 bg-white text-xs font-black text-slate-700 hover:bg-slate-50 transition active:scale-95"
                    >
                      Open Wallet
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* Logged Out Fallback State */
              <div className="space-y-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 leading-none">Bento Reward Center</p>
                  
                  <div className="mt-4 rounded-2xl bg-blue-50/20 border border-blue-100/40 p-5 text-center relative overflow-hidden">
                    {/* Glint line */}
                    <div className="animate-glint" />
                    <Wallet className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h4 className="text-xs font-black text-slate-800">Earn ₹100 Referral Commission</h4>
                    <p className="text-[9.5px] text-slate-450 leading-relaxed font-semibold mt-1.5 max-w-[210px] mx-auto">
                      Login to check wallet balance, referral commissions, signup bonuses & cashback statistics.
                    </p>
                  </div>
                </div>

                {/* CTAs */}
                <div className="space-y-2 pt-4 border-t border-slate-200/50">
                  <Link
                    href="/login/customer"
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-xs font-black text-white hover:bg-slate-850 transition active:scale-95 shadow-sm"
                  >
                    Login to Start Earning <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </section>
  );
}
