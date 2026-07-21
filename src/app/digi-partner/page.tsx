import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  HandCoins,
  Headphones,
  LayoutGrid,
  LogIn,
  Megaphone,
  Users,
  WalletCards,
} from "lucide-react";

import { MarketingFooter } from "@/components/marketing-footer";
import {
  DIGI_PARTNER_BECOME_CTA_LABEL,
  DIGI_PARTNER_CTA_LABEL,
  DIGI_PARTNER_LANDING_ROUTE,
  DIGI_PARTNER_LOGIN_ROUTE,
} from "@/lib/auth/partner-access";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Digi Partner | DigiConnect Dukan",
  description:
    "Grow your digital business with DigiConnect Dukan. Serve customers, earn commissions, manage applications and grow your service center.",
  alternates: { canonical: DIGI_PARTNER_LANDING_ROUTE },
};

const trustPoints = [
  { icon: HandCoins, title: "Earn commissions", body: "Transparent earnings on every eligible application you complete." },
  { icon: Users, title: "Manage customers", body: "Keep a clean CRM of every customer you serve from one workspace." },
  { icon: LayoutGrid, title: "Track applications", body: "Follow status, documents and next actions without chasing anyone." },
  { icon: WalletCards, title: "Wallet and payouts", body: "See available balance, settlements and payout history in ₹." },
  { icon: Megaphone, title: "Marketing materials", body: "Share approved creatives and WhatsApp captions with customers." },
  { icon: Headphones, title: "Support and training", body: "Get onboarding help, process guides and a dedicated support desk." },
];

export default function DigiPartnerLandingPage() {
  const becomeUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({
      page: "digi_partner_landing",
      topic: "I want to become a Digi Partner with DigiConnect Dukan",
    }),
  );

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f6f8fc]">
      {/* Aurora wash — decorative, disabled under reduced motion via CSS */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 80% at 50% -10%, rgba(79,70,229,0.14), transparent 55%)," +
            "radial-gradient(90% 70% at 100% 100%, rgba(37,99,235,0.10), transparent 55%)," +
            "radial-gradient(70% 50% at 0% 80%, rgba(249,115,22,0.08), transparent 55%)," +
            "#f6f8fc",
        }}
      />
      <div
        aria-hidden
        className="auth-aurora pointer-events-none absolute -inset-[15%] opacity-60"
        style={{
          background:
            "radial-gradient(28% 32% at 22% 28%, rgba(99,102,241,0.28), transparent 60%)," +
            "radial-gradient(26% 30% at 78% 24%, rgba(59,130,246,0.18), transparent 60%)," +
            "radial-gradient(30% 34% at 68% 82%, rgba(16,185,129,0.12), transparent 60%)",
          filter: "blur(56px)",
        }}
      />

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto flex max-w-5xl flex-col items-center px-5 pb-16 pt-16 text-center sm:pt-24 md:pb-20">
          <div className="mb-8 flex items-center gap-2.5">
            <Image
              src="/logo-navbar.png"
              alt="DigiConnect Dukan"
              width={160}
              height={40}
              priority
              className="h-8 w-auto object-contain sm:h-9"
            />
          </div>

          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-indigo-200/70 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700 shadow-sm backdrop-blur-md">
            <BadgeCheck className="h-3.5 w-3.5" />
            Digi Partner
          </p>

          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl md:text-[3.25rem] md:leading-[1.08]">
            Grow your digital business with DigiConnect Dukan.
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-slate-500 sm:text-lg">
            Serve customers, earn commissions, manage applications and grow your service center from one intelligent
            platform.
          </p>

          <div className="mt-9 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <a
              href={becomeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-extrabold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {DIGI_PARTNER_BECOME_CTA_LABEL}
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href={DIGI_PARTNER_LOGIN_ROUTE}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/75 px-6 text-sm font-extrabold text-indigo-700 shadow-sm backdrop-blur-md transition hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <LogIn className="h-4 w-4" />
              {DIGI_PARTNER_CTA_LABEL}
            </Link>
          </div>

          {/* Abstract network visual */}
          <div
            aria-hidden
            className="relative mt-14 h-44 w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/70 bg-white/50 shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:h-56"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(99,102,241,0.18),transparent_45%),radial-gradient(circle_at_70%_60%,rgba(37,99,235,0.16),transparent_40%)]" />
            <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 800 280" fill="none">
              <circle cx="140" cy="140" r="8" fill="#4F46E5" />
              <circle cx="320" cy="80" r="6" fill="#2563EB" />
              <circle cx="480" cy="160" r="9" fill="#6366F1" />
              <circle cx="640" cy="100" r="7" fill="#0EA5E9" />
              <circle cx="400" cy="220" r="5" fill="#10B981" />
              <path d="M140 140 L320 80 L480 160 L640 100" stroke="rgba(79,70,229,0.35)" strokeWidth="2" />
              <path d="M320 80 L400 220 L480 160" stroke="rgba(37,99,235,0.28)" strokeWidth="2" />
            </svg>
            <p className="absolute bottom-4 left-0 right-0 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Digital Service Operating System
            </p>
          </div>
        </section>

        {/* Trust points */}
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trustPoints.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-[22px] border border-white/70 bg-white/70 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl ring-1 ring-slate-900/[0.03]"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-500">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Brand block */}
        <section className="mx-auto max-w-3xl px-5 pb-20 text-center">
          <div className="rounded-[28px] border border-white/70 bg-white/70 px-6 py-10 shadow-[0_18px_48px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <p className="text-xl font-extrabold tracking-tight text-slate-950">DigiConnect Dukan</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">Connecting People. Empowering Digital India.</p>
            <p className="mt-4 text-[11px] font-medium text-slate-400">
              Powered by <span className="font-semibold text-slate-500">RNoS India Pvt. Ltd.</span>
            </p>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
