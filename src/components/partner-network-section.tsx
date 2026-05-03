"use client";

import Link from "next/link";
import { MapPin, MessageCircle, Search, Store, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { generateWhatsAppLink } from "@/lib/whatsapp";

const partners = [
  { name: "AMIL", city: "KOTRA", district: "JALAUN", shopName: "MUHAMMAD AMIL JAN SEWA KENDRA" },
  { name: "ANEESS", city: "KALPI", district: "JALAUN", shopName: "SURE SUCCESS INTERNET POINT" },
  { name: "ABHISHEK SINGH", city: "ORAI", district: "JALAUN", shopName: "CYBER CAFE" },
  { name: "SADDAM", city: "KANPUR", district: "KANPUR", shopName: "CYBER CAFE" },
  { name: "RAJENDRA", city: "ATTA", district: "JALAUN", shopName: "Himanshu PhotoCopy" },
  { name: "Gajendra", city: "ORAI", district: "JALAUN", shopName: "GAJENDRA CYBER CAFE" },
  { name: "BHUVNENDRA SINGH", city: "ORAI", district: "JALAUN", shopName: "QUICK SERVICE LOAN" },
  { name: "BALENDRA KUMAR", city: "ORAI", district: "JALAUN", shopName: "SHIVASH ENTERPRISES" },
  { name: "FAISAL", city: "DELHI", district: "DELHI", shopName: "Partner Service Point" },
  { name: "SUBHAN", city: "MOTH", district: "JHANSI", shopName: "SUBHAN CYBER CAFE" },
  { name: "ANOOP KHARE", city: "KONCH", district: "JALAUN", shopName: "ANOOP CYBER CAFE" },
  { name: "AFROZ", city: "ORAI", district: "JALAUN", shopName: "DIGI CONNECT DUKAN" },
  { name: "ADIL", city: "ORAI", district: "JALAUN", shopName: "UP ONLINE" },
  { name: "NIHAL", city: "ORAI", district: "JALAUN", shopName: "DIGI CONNECT DUKAN" },
  { name: "ANKUR AGNIHOTRI", city: "KANPUR", district: "KANPUR", shopName: "A Square Placement" },
  { name: "SUNDRAM VISHWAKARAM", city: "ORAI", district: "JALAUN", shopName: "Ganesh Computer" },
  { name: "VISHAL KHANNA", city: "KANPUR", district: "KANPUR", shopName: "BABA FINANCIAL SERVICES" },
  { name: "SHAHE ALAM PASHA", city: "MORADABAD", district: "MORADABAD", shopName: "PASHA INTERNET SEVA" },
];

export function PartnerNetworkSection() {
  const [query, setQuery] = useState("");

  const filteredPartners = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return partners;
    }

    return partners.filter((partner) => {
      return [partner.city, partner.shopName].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [query]);

  return (
    <section id="partner-network" className="section-pad bg-white/30">
      <div className="container-shell space-y-8 md:space-y-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Partner Network</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">Our Partner Network</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Trusted digital service partners helping customers access DigiConnect services across India.
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          <label className="relative block">
            <span className="sr-only">Search partners by city or shop name</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by city or shop name"
              className="liquid-card h-14 w-full rounded-full border-white/70 pl-12 pr-5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/15"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPartners.map((partner) => (
            <article key={`${partner.name}-${partner.city}-${partner.shopName}`} className="liquid-card rounded-[1.5rem] p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/20">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold leading-tight text-slate-950">{partner.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>
                      {partner.city}, {partner.district}
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-white/70 bg-white/45 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <Store className="h-4 w-4" />
                  Shop Name
                </p>
                <p className="mt-2 text-base font-bold leading-snug text-slate-950">{partner.shopName}</p>
              </div>
            </article>
          ))}
        </div>

        {filteredPartners.length === 0 ? (
          <div className="liquid-card mx-auto max-w-xl rounded-[1.5rem] p-6 text-center text-sm font-semibold text-slate-600">
            No partner found for this city or shop name.
          </div>
        ) : null}

        <div className="liquid-card mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-[1.75rem] p-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h3 className="text-2xl font-bold text-slate-950">Want to become a DigiConnect Partner?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Join the network and serve customers with trusted digital support.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/login" className="premium-button premium-button-blue">
              Login
            </Link>
            <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="premium-button premium-button-whatsapp">
              <MessageCircle className="h-5 w-5" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
