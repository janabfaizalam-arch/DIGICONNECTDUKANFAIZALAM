"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgePercent, Clock3, IndianRupee, ShieldCheck, WalletCards } from "lucide-react";

import { generateWhatsAppLink } from "@/lib/whatsapp";

function getCountdownParts(target: number) {
  const remaining = Math.max(0, target - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

export function DigiWalletOfferBanner() {
  const target = useMemo(() => Date.now() + 3 * 24 * 60 * 60 * 1000, []);
  const [countdown, setCountdown] = useState(() => getCountdownParts(target));

  useEffect(() => {
    const interval = window.setInterval(() => setCountdown(getCountdownParts(target)), 1000);
    return () => window.clearInterval(interval);
  }, [target]);

  return (
    <section className="px-0 pb-6 md:pb-10">
      <div className="container-shell">
        <div className="glass-panel overflow-hidden rounded-[1.75rem] border border-white/10 p-4 shadow-liquid md:rounded-[2rem] md:p-6">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/90 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-orange-700">
                <BadgePercent className="h-4 w-4" />
                Limited Time Offer
              </div>
              <h2 className="mt-4 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">
                Cashback on ITR Filing and MSME Registration
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
                Complete the service and get 100% cashback credits in DigiWallet for future eligible services.
              </p>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {[
                  ["Days", countdown.days],
                  ["Hours", countdown.hours],
                  ["Min", countdown.minutes],
                  ["Sec", countdown.seconds],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/65 p-3 text-center">
                    <p className="text-xl font-extrabold text-blue-700">{String(value).padStart(2, "0")}</p>
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["ITR", "₹1499", "₹699"],
                ["MSME", "₹1499", "₹699"],
                ["COMBO", "₹2998", "₹699"],
              ].map(([title, oldPrice, price]) => (
                <div key={title} className="liquid-card rounded-[1.35rem] p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">{title}</p>
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="text-sm font-bold text-slate-400 line-through">{oldPrice}</span>
                    <span className="text-3xl font-extrabold text-orange-600">{price}</span>
                  </div>
                  <div className="mt-4 space-y-2 text-xs font-bold text-slate-700">
                    <p className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-blue-700" /> Cashback badge</p>
                    <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Refund safety</p>
                    <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-orange-600" /> Same day process</p>
                  </div>
                </div>
              ))}
              <div className="sm:col-span-3 grid gap-3 sm:grid-cols-2">
                <Link href="/services/itr-filing" className="premium-button premium-button-blue">
                  <IndianRupee className="h-4 w-4" />
                  Claim Offer
                </Link>
                <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="premium-button premium-button-whatsapp">
                  WhatsApp Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
