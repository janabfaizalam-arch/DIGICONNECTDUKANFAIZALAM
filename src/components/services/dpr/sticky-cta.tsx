"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { DPR_LAUNCH_PRICE } from "@/lib/dpr/constants";
import type { DprSection } from "@/lib/dpr/types";
import { WhatsAppIcon, type DprSectionContext } from "./shared";

type Props = {
  section: DprSection;
  ctx: DprSectionContext;
  launchPrice?: number;
};

export function DprStickyCta({ section, ctx, launchPrice = DPR_LAUNCH_PRICE }: Props) {
  const label = section.ctaLabel || `Apply for DPR — ₹${launchPrice}`;
  const href = section.ctaUrl || ctx.applyUrl;

  return (
    <div
      className="fixed bottom-0 left-0 w-full bg-white/95 border-t border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] px-4 py-3 z-50 flex items-center justify-between gap-3 md:hidden backdrop-blur-md"
      role="region"
      aria-label="Apply for DPR"
    >
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">DPR</span>
        <span className="text-base font-bold text-slate-900">₹{launchPrice}</span>
      </div>
      <div className="flex items-center gap-2 grow max-w-[240px]">
        <a
          href={`tel:${ctx.supportPhone}`}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
          aria-label="Call support"
        >
          <Phone className="h-4 w-4" />
        </a>
        <a
          href={ctx.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-600"
          aria-label="WhatsApp support"
        >
          <WhatsAppIcon className="h-4.5 w-4.5" />
        </a>
        <Link
          href={href}
          className="flex h-10 grow items-center justify-center rounded-full bg-sky-600 text-white text-xs font-bold shadow-xs active:scale-[0.98] transition-transform px-3 text-center"
        >
          {label}
        </Link>
      </div>
    </div>
  );
}

export function DprFloatingWhatsApp({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 hidden md:flex items-center justify-center h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:scale-105 active:scale-95 transition-all z-50"
      aria-label="Contact support on WhatsApp"
    >
      <WhatsAppIcon className="h-6 w-6" />
    </a>
  );
}
