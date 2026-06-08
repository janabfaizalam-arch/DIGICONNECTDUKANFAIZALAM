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
    <section id="rewards" className="bg-white py-8 md:py-10 px-3 relative overflow-hidden">
      
      {/* Scoped CSS animations for the premium coin stack */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shine-glint {
          0% { left: -100%; opacity: 0; }
          40% { left: 100%; opacity: 0.8; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes coin-bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes coin-bounce-delay {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
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
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blue-500/5 blur-[70px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-orange-500/5 blur-[70px] pointer-events-none" />

      <div className="container-shell">
        <div className="text-center max-w-2xl mx-auto mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-500 flex items-center justify-center gap-1">
            <Gift className="h-3 w-3" /> Rewards Program
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 md:text-2xl leading-none">
            Refer & Earn Center
          </h2>
        </div>

        {/* Bento Grid layout: Rules (Left) & Dashboard (Right) */}
        <div className="grid gap-4 md:grid-cols-2 max-w-5xl mx-auto items-stretch">
          
          {/* Rules Card */}
          <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col justify-between relative overflow-hidden">
            
            {/* Animated SVG Graphics - Custom Premium Coin Stack */}
            <div className="absolute top-5 right-5 w-16 h-16 pointer-events-none flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-14 h-14 overflow-visible">
                {/* Glow ring */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(245, 158, 11, 0.15)" strokeWidth="4" />
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
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-3">
                <Sparkles className="h-4 w-4 text-orange-500" /> Reward Rules & Benefits
              </h3>
              
              <ul className="space-y-2.5">
                {[
                  { text: "Every Paid Service", highlight: "20% Wallet Cashback", desc: "instantly on completion." },
                  { text: "First Service", highlight: "100% Welcome Cashback", desc: "return on first order." },
                  { text: "Referral Bonus", highlight: "₹100 Signup Bonus", desc: "for friends using link." },
                  { text: "Referrer Payout", highlight: "₹100 Cash Credit", desc: "on friend's first completion." },
                  { text: "Redemption Limit", highlight: "Up to 50% checkout discount", desc: "applied automatically." }
                ].map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] mt-0.5 border border-emerald-100">
                      ✓
                    </span>
                    <div className="text-left leading-normal">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase leading-none">{rule.text}</span>
                      <p className="text-xs font-black text-slate-800 mt-0.5">
                        {rule.highlight} <span className="font-semibold text-slate-500">{rule.desc}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 border-t border-slate-100/80 pt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
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
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between text-left relative overflow-hidden">
            
            {isLoggedIn ? (
              /* Logged In Bento Dashboard */
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">Your Wallet Dashboard</p>
                  
                  {/* Bento Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-3.5">
                    {/* Wallet Balance */}
                    <div className="rounded-2xl bg-blue-50/50 border border-blue-100/50 p-2.5 flex flex-col justify-between">
                      <p className="text-[8px] font-black text-slate-450 uppercase tracking-wide leading-none">Wallet Balance</p>
                      <p className="text-base font-black text-blue-700 mt-2 leading-none">₹{walletBalance}</p>
                    </div>
                    {/* Cashback Earned */}
                    <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100/50 p-2.5 flex flex-col justify-between">
                      <p className="text-[8px] font-black text-slate-450 uppercase tracking-wide leading-none">Cashback Earned</p>
                      <p className="text-base font-black text-emerald-700 mt-2 leading-none">₹{cashbackEarned}</p>
                    </div>
                    {/* Referral Earnings */}
                    <div className="rounded-2xl bg-orange-50/50 border border-orange-100/50 p-2.5 flex flex-col justify-between">
                      <p className="text-[8px] font-black text-slate-450 uppercase tracking-wide leading-none">Referral Earned</p>
                      <p className="text-base font-black text-orange-600 mt-2 leading-none">₹{referralReward}</p>
                    </div>
                  </div>

                  {/* Referral Code Box */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Referral Code</label>
                      <div className="flex h-9 items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 text-xs font-black text-slate-700 select-all">
                        {refCode || "DIGI777"}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Referral Link</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          readOnly
                          value={inviteLink}
                          className="flex-1 h-9 text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-2.5 outline-none truncate shadow-inner"
                        />
                        <button
                          onClick={handleCopy}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition active:scale-95 shadow-sm"
                          title="Copy Link"
                        >
                          {copied ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTAs */}
                <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                  <div className="flex gap-2">
                    <button
                      onClick={handleWhatsAppShare}
                      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-xs font-black text-white hover:bg-emerald-700 transition active:scale-95 shadow-sm"
                    >
                      <MessageCircle className="h-4.5 w-4.5" /> Invite Friends
                    </button>
                    <Link
                      href="/customer/wallet"
                      className="flex h-10 px-4 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-700 hover:bg-slate-50 transition active:scale-95"
                    >
                      Open Wallet
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* Logged Out Fallback State */
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">Bento reward Center</p>
                  
                  <div className="mt-3.5 rounded-2xl bg-blue-50/20 border border-blue-100/40 p-4 text-center relative overflow-hidden">
                    {/* Glint line */}
                    <div className="animate-glint" />
                    <Wallet className="h-8 w-8 text-blue-500 mx-auto mb-1.5" />
                    <h4 className="text-xs font-black text-slate-850">Earn ₹100 Referral Commission</h4>
                    <p className="text-[9.5px] text-slate-450 leading-relaxed font-semibold mt-1 max-w-[210px] mx-auto">
                      Login to check wallet balance, referral commissions, signup bonuses & cashback statistics.
                    </p>
                  </div>
                </div>

                {/* CTAs */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <Link
                    href="/login/customer"
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-xs font-black text-white hover:bg-slate-800 transition active:scale-95 shadow-sm"
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
