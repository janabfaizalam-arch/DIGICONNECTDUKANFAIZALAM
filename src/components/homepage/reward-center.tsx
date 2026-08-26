"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Gift, Wallet, ArrowRight, Check, Copy, MessageCircle, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import {
  FIRST_SERVICE_CASHBACK_PERCENT,
  REPEAT_CASHBACK_PERCENT,
  REFERRER_SIGNUP_BONUS_AMOUNT,
  REFERRER_FIRST_SERVICE_BONUS_AMOUNT,
  MAX_WALLET_REDEEM_PERCENT,
} from "@/lib/reward-rules";
import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";
import { HOMEPAGE_REWARDS_ILLUSTRATION } from "@/lib/homepage-visual-assets";

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

      const {
        data: { session },
      } = await supabase.auth.getSession();
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

  const inviteLink =
    refLink || (refCode ? `https://www.rnos.in/signup?ref=${encodeURIComponent(refCode)}` : "https://www.rnos.in/signup");
  const shareText = `Join DigiConnect Dukan — private digital assistance by RNOS India Pvt Ltd. Use my link: ${inviteLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const rules = [
    {
      text: "Eligible paid services",
      highlight: `${REPEAT_CASHBACK_PERCENT}% wallet cashback`,
      desc: "per current reward configuration on completion.",
    },
    {
      text: "First eligible service",
      highlight: `${FIRST_SERVICE_CASHBACK_PERCENT}% welcome cashback`,
      desc: "when the reward rules apply to your account.",
    },
    {
      text: "Referral signup",
      highlight: `₹${REFERRER_SIGNUP_BONUS_AMOUNT} referrer bonus`,
      desc: "when a referred user completes signup (config-driven).",
    },
    {
      text: "Friend's first service",
      highlight: `₹${REFERRER_FIRST_SERVICE_BONUS_AMOUNT} referrer credit`,
      desc: `Redeem wallet credits up to ${MAX_WALLET_REDEEM_PERCENT}% of an order.`,
    },
  ];

  return (
    <HomepageSection id="rewards" surface="navy">
      <HomepageSectionHeader
        eyebrow="Rewards"
        title="Refer & Earn · Wallet rewards"
        description="Configured reward rules only. Wallet balance and referral links appear after login — no fabricated guest earnings."
        light
      />

      <div className="grid items-stretch gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <div className="lg-card-dark relative rounded-[1.75rem] p-6 md:p-8">
          <div className="dc-orb dc-orb-flame lg-drift pointer-events-none -right-10 -top-10 h-52 w-52" aria-hidden="true" />
          <div className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <h3 className="flex items-center gap-2 text-lg font-black text-white md:text-xl">
              <Gift className="h-6 w-6 text-[var(--dc-orange-400)]" aria-hidden="true" />
              Reward rules
            </h3>
            <div className="relative h-28 w-36 shrink-0 sm:h-32 sm:w-40">
              <Image src={HOMEPAGE_REWARDS_ILLUSTRATION} alt="" fill loading="lazy" className="object-contain drop-shadow-xl" sizes="160px" />
            </div>
          </div>
          <ul className="relative space-y-4">
            {rules.map((rule) => (
              <li key={rule.text} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white"
                  style={{ background: "var(--dc-grad-flame)" }}
                >
                  ✓
                </span>
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wide text-white/65">{rule.text}</span>
                  <p className="mt-1 text-base font-black text-white md:text-lg">
                    {rule.highlight} <span className="font-semibold text-white/80">{rule.desc}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <a
            href="#faq"
            className="relative mt-6 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-[var(--dc-orange-400)] hover:underline"
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" /> How rewards work
          </a>
        </div>

        <div className="lg-card flex flex-col rounded-[1.75rem] p-6 text-[var(--dc-ink)] md:p-7">
          {isLoggedIn ? (
            <div className="flex h-full flex-col gap-5">
              <p className="text-xs font-black uppercase tracking-wider text-[var(--dc-muted)]">Your wallet</p>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-[var(--dc-blue-soft)] p-3.5">
                  <p className="text-[11px] font-black uppercase text-[var(--dc-muted)]">Balance</p>
                  <p className="mt-2 text-lg font-black text-[var(--dc-blue-700)]">₹{walletBalance.toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-2xl bg-[var(--dc-blue-soft)] p-3.5">
                  <p className="text-[11px] font-black uppercase text-[var(--dc-muted)]">Cashback</p>
                  <p className="mt-2 text-lg font-black text-[var(--dc-teal)]">₹{cashbackEarned.toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-2xl bg-[var(--dc-orange-soft)] p-3.5">
                  <p className="text-[11px] font-black uppercase text-[var(--dc-muted)]">Referral</p>
                  <p className="mt-2 text-lg font-black text-[var(--dc-orange-600)]">₹{referralReward.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-[var(--dc-muted)]">Referral code</label>
                  <div className="mt-1.5 flex h-11 items-center rounded-xl bg-slate-100 px-3 text-sm font-black">{refCode || "—"}</div>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-[var(--dc-muted)]">Referral link</label>
                  <div className="mt-1.5 flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="h-11 min-w-0 flex-1 truncate rounded-xl bg-slate-100 px-3 text-xs font-semibold outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition duration-300 hover:brightness-110"
                      style={{ background: "var(--dc-grad-blue)" }}
                      aria-label="Copy referral link"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-auto flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--dc-teal)] text-sm font-extrabold text-white transition duration-300 hover:brightness-110"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> Invite
                </button>
                <Link
                  href="/customer/wallet"
                  className="lg-pill lg-raise inline-flex h-12 items-center justify-center rounded-xl px-4 text-sm font-extrabold"
                >
                  Open wallet
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="rounded-[1.35rem] bg-[var(--dc-blue-soft)] p-6 text-center">
                <div className="relative mx-auto mb-3 h-32 w-36">
                  <Image src={HOMEPAGE_REWARDS_ILLUSTRATION} alt="" fill className="object-contain" sizes="144px" />
                </div>
                <Wallet className="mx-auto h-6 w-6 text-[var(--dc-blue-700)]" aria-hidden="true" />
                <h4 className="mt-3 text-lg font-black text-[var(--dc-ink)]">Login to view wallet & referrals</h4>
                <p className="mt-2 text-[15px] font-semibold leading-relaxed text-[var(--dc-body)]">
                  Signup referral bonus is ₹{REFERRER_SIGNUP_BONUS_AMOUNT} when configured rules apply. No fabricated
                  earnings are shown to guests.
                </p>
              </div>
              <Link
                href="/login/customer"
                className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-xl text-[15px] font-extrabold text-white shadow-[0_12px_26px_-12px_rgba(247,74,1,0.95)] transition duration-300 hover:brightness-110"
                style={{ background: "var(--dc-grad-flame)" }}
              >
                Login to start earning <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </HomepageSection>
  );
}
