"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Gift, Wallet, ArrowRight, Check, Copy, MessageCircle, HelpCircle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function RewardCenter() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
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
          const summary = data.referralSummary || {};
          setReferralReward(summary.rewardEarned || 0);
          setRefCode(summary.code || "");
          setRefLink(summary.link || "");
        }
      } catch {
        /* ignore */
      }
    }

    loadData();
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
    <section id="rewards" className="bg-white py-10 md:py-12 px-3 relative overflow-hidden">
      
      {/* CSS Coin spin keyframes */}
      <style jsx global>{`
        @keyframes float-coin {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(15deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 0.4; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .animate-coin {
          animation: float-coin 5s ease-in-out infinite;
        }
        .animate-ring {
          animation: pulse-ring 4s ease-in-out infinite;
        }
      `}</style>

      {/* Decorative blurs */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blue-500/5 blur-[70px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-orange-500/5 blur-[70px] pointer-events-none" />

      <div className="container-shell">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-500 flex items-center justify-center gap-1">
            <Gift className="h-3 w-3" /> Rewards Program
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 md:text-2xl leading-none">
            Refer & Earn Center
          </h2>
        </div>

        {/* Bento Grid layout: Rules (Left) & Dashboard Card (Right) */}
        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr] max-w-4xl mx-auto items-stretch">
          
          {/* Rules Card */}
          <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 flex flex-col justify-between relative overflow-hidden">
            
            {/* Animated SVG Graphics - Floating Coin */}
            <div className="absolute top-6 right-6 w-14 h-14 pointer-events-none flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-orange-200/40 bg-orange-50/20 animate-ring" />
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-black text-lg flex items-center justify-center shadow-md animate-coin">
                ₹
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-4">
                <Sparkles className="h-4 w-4 text-orange-500" /> Reward Rules & Benefits
              </h3>
              
              <ul className="space-y-3">
                {[
                  { text: "Every Paid Service", highlight: "20% DigiWallet Cashback", desc: "points credited instantly on completion." },
                  { text: "First Service", highlight: "100% Cashback Welcome Offer", desc: "points return on your very first order." },
                  { text: "Referral Bonus", highlight: "₹100 Signup Bonus", desc: "for your friends using your link." },
                  { text: "Referrer Reward", highlight: "₹100 Cash Credit", desc: "when your referred user completes their first service." },
                  { text: "Redeem Benefits", highlight: "Up to 50% Wallet Discount", desc: "applicable on all future service checkout bills." }
                ].map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 font-bold text-xs mt-0.5">
                      ✓
                    </span>
                    <div className="text-left leading-normal">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase leading-none">{rule.text}</span>
                      <p className="text-xs font-black text-slate-800 mt-0.5">
                        {rule.highlight} <span className="font-semibold text-slate-500">{rule.desc}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support/FAQ CTA */}
            <div className="mt-6 border-t border-slate-100/80 pt-4 flex items-center justify-between text-xs font-bold text-slate-400">
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

          {/* Interactive Stats Dashboard Card */}
          <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm flex flex-col justify-between text-left relative overflow-hidden">
            
            {isLoggedIn ? (
              /* Logged In Dashboard state */
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">Referral Stats</p>
                  
                  {/* Live Stats Display */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="rounded-2xl bg-blue-50/50 border border-blue-100/50 p-3.5">
                      <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wide leading-none">Wallet Balance</p>
                      <p className="text-xl font-black text-blue-700 mt-2 leading-none">₹{walletBalance}</p>
                    </div>
                    <div className="rounded-2xl bg-orange-50/50 border border-orange-100/50 p-3.5">
                      <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wide leading-none">Referral Earned</p>
                      <p className="text-xl font-black text-orange-600 mt-2 leading-none">₹{referralReward}</p>
                    </div>
                  </div>

                  {/* Copy Link Hub */}
                  <div className="mt-5 space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Referral Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteLink}
                        className="flex-1 h-10 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 outline-none truncate shadow-inner"
                      />
                      <button
                        onClick={handleCopy}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition active:scale-95 shadow-sm"
                        title="Copy referral link"
                      >
                        {copied ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* CTAs */}
                <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
                  <div className="flex gap-2">
                    <button
                      onClick={handleWhatsAppShare}
                      className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-xs font-black text-white hover:bg-emerald-700 transition active:scale-95 shadow-sm"
                    >
                      <MessageCircle className="h-4 w-4" /> Share on WhatsApp
                    </button>
                    <Link
                      href="/customer/wallet"
                      className="flex h-11 px-4 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-700 hover:bg-slate-50 transition active:scale-95"
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
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">Get Invitation Link</p>
                  
                  <div className="mt-4 rounded-2xl bg-blue-50/30 border border-blue-100/40 p-4 text-center">
                    <Wallet className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h4 className="text-xs font-black text-slate-850">Earn ₹100 Referral Commission</h4>
                    <p className="text-[10px] text-slate-450 leading-relaxed font-semibold mt-1 max-w-[200px] mx-auto">
                      Login/Register to generate your unique sharing links and start tracking rewards.
                    </p>
                  </div>
                </div>

                {/* CTAs */}
                <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
                  <Link
                    href="/login/customer"
                    className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-xs font-black text-white hover:bg-slate-800 transition active:scale-95 shadow-sm"
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
