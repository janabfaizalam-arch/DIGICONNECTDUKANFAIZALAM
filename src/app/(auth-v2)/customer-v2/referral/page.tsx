"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Share2, Users, Gift, Copy, CheckCircle2 } from "lucide-react";

export default function ReferralPage() {
  const [data, setData] = useState<{referralCode: string, referralCount: number} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReferral = async () => {
      try {
        const res = await fetch("/api/customer-auth/referral");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReferral();
  }, []);

  const referralLink = data ? `${window.location.origin}/customer-auth-v2/signup?ref=${data.referralCode}` : "";

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-white/5 animate-pulse rounded-lg" />
        <div className="h-48 bg-white/5 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Refer & Earn</h1>
        <p className="text-white/50 mt-1">Invite your friends and earn rewards when they use our services.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Referral Stats */}
        <div className="bg-gradient-to-br from-[#00bfa5]/20 to-[#00897b]/10 border border-[#00bfa5]/20 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-[#00bfa5]/20 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-[#00bfa5]" />
          </div>
          <div className="text-5xl font-bold text-white mb-2">{data?.referralCount || 0}</div>
          <div className="text-white/70 font-medium">Total Friends Referred</div>
        </div>

        {/* Reward Info */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
            <Gift className="w-8 h-8 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">Get ₹50</div>
          <div className="text-white/70 text-sm">For every friend who completes their first service using your link.</div>
        </div>
      </div>

      {/* Referral Link Box */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
        <h3 className="text-lg font-semibold text-white mb-4">Your Unique Referral Link</h3>
        
        <div className="flex gap-4">
          <div className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white/70 font-mono text-sm truncate flex items-center">
            {referralLink}
          </div>
          <button 
            onClick={handleCopy}
            className="shrink-0 bg-white text-[#0a0f16] hover:bg-gray-200 px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            {copied ? <><CheckCircle2 className="w-5 h-5 text-green-600" /> Copied</> : <><Copy className="w-5 h-5" /> Copy Link</>}
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 flex justify-center gap-4">
          <button className="flex items-center gap-2 px-6 py-3 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-xl font-medium transition-colors">
            Share on WhatsApp
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl font-medium transition-colors">
            <Share2 className="w-4 h-4" /> Share Everywhere
          </button>
        </div>
      </div>
    </motion.div>
  );
}
