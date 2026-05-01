import Link from "next/link";
import { BadgeCheck, LogIn, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";

import { generateWhatsAppLink } from "@/lib/whatsapp";

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden px-0 pb-10 pt-6 md:pb-20 md:pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(37,99,235,0.16),transparent_30%),radial-gradient(circle_at_92%_18%,rgba(20,184,166,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.45),rgba(239,247,255,0.35))]" />
      <div className="container-shell">
        <div className="glass-panel shadow-liquid mx-auto min-w-0 max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 px-5 py-7 sm:px-7 md:rounded-[2.25rem] md:px-10 md:py-12">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:px-4 sm:text-sm">
            <Sparkles className="h-4 w-4" />
            <span className="truncate">Available across India through online digital services</span>
          </div>
          <div className="mt-6 space-y-4">
            <h1 className="max-w-full text-balance text-[2rem] font-bold leading-[1.08] text-slate-950 sm:max-w-3xl sm:text-5xl md:text-6xl">
              Connecting People, Empowering Digital India
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
              Access trusted digital, government, documentation, and business services across India through a secure online service platform.
            </p>
          </div>
          <div className="mt-7 grid min-w-0 grid-cols-1 gap-3 min-[390px]:grid-cols-2 sm:flex sm:flex-row">
            <Link href="/login" className="premium-button premium-button-blue">
              <LogIn className="h-4 w-4" />
              Login
            </Link>
            <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="premium-button premium-button-whatsapp">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
          <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div className="liquid-card rounded-[1.5rem] p-4">
              <BadgeCheck className="mb-3 h-5 w-5 text-emerald-600" />
              <p className="font-semibold text-slate-950">Trusted Support</p>
              <p className="mt-1 text-xs leading-5">Guided digital service assistance.</p>
            </div>
            <div className="liquid-card rounded-[1.5rem] p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-blue-600" />
              <p className="font-semibold text-slate-950">Secure Process</p>
              <p className="mt-1 text-xs leading-5">Careful document handling.</p>
            </div>
            <div className="liquid-card rounded-[1.5rem] p-4">
              <Sparkles className="mb-3 h-5 w-5 text-orange-500" />
              <p className="font-semibold text-slate-950">Pan India Access</p>
              <p className="mt-1 text-xs leading-5">Online support across India.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
