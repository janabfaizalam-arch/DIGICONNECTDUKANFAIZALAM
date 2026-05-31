"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BadgeIndianRupee,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CarFront,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  FileText,
  Fingerprint,
  HandCoins,
  IdCard,
  Landmark,
  PiggyBank,
  ReceiptText,
  Search,
  ShieldCheck,
  Store,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

/* ─── Approved service catalog (23 services) ─── */

type CuratedService = {
  title: string;
  slug: string;
  shortDescription: string;
  icon: LucideIcon;
  badge?: string;
  gradient: string;
  theme: "blue" | "orange";
};

type ServiceCategory = {
  id: string;
  title: string;
  chipLabel: string;
  services: CuratedService[];
};

const categories: ServiceCategory[] = [
  {
    id: "cards",
    title: "Cards & PVC Printing",
    chipLabel: "Cards",
    services: [
      { title: "PVC Card", slug: "pvc-card", shortDescription: "Premium waterproof smart card printing with glossy finish.", icon: CreditCard, badge: "Popular", gradient: "from-blue-500 to-indigo-600", theme: "blue" },
      { title: "Voter ID", slug: "voter-id", shortDescription: "Voter card correction, new application & print support.", icon: IdCard, badge: "New", gradient: "from-indigo-500 to-purple-600", theme: "blue" },
      { title: "eShram Card", slug: "eshram-card", shortDescription: "eShram worker registration and UAN card downloads.", icon: ClipboardCheck, gradient: "from-teal-500 to-emerald-600", theme: "blue" },
      { title: "Labour Card", slug: "labour-card", shortDescription: "Labour card registration assistance and benefit filing.", icon: FileText, badge: "Popular", gradient: "from-orange-500 to-amber-600", theme: "orange" },
    ],
  },
  {
    id: "loans",
    title: "Loans & Government Schemes",
    chipLabel: "Loans",
    services: [
      { title: "PMEGP Loan", slug: "pmegp-loan", shortDescription: "PMEGP subsidy business loans file preparation assistance.", icon: HandCoins, badge: "Popular", gradient: "from-orange-500 to-red-600", theme: "orange" },
      { title: "Mudra Loan", slug: "mudra-loan", shortDescription: "Mudra business loan file guidance for micro enterprises.", icon: HandCoins, badge: "Popular", gradient: "from-blue-500 to-indigo-600", theme: "blue" },
      { title: "PM Vishwakarma Yojana", slug: "pm-vishwakarma-yojana", shortDescription: "Government scheme registration support for traditional artisans.", icon: Landmark, badge: "Popular", gradient: "from-amber-500 to-orange-650", theme: "orange" },
      { title: "Startup India Assistance", slug: "startup-india-assistance", shortDescription: "DPIIT registration, tax exemption and business profiling.", icon: BriefcaseBusiness, badge: "Business", gradient: "from-indigo-500 to-blue-650", theme: "blue" },
    ],
  },
  {
    id: "banking",
    title: "Banking & Credit",
    chipLabel: "Banking",
    services: [
      { title: "Credit Cards", slug: "credit-cards", shortDescription: "Multi-bank credit card applications with eligibility checking.", icon: CreditCard, badge: "Popular", gradient: "from-blue-600 to-indigo-700", theme: "blue" },
      { title: "Saving Account Opening", slug: "saving-account-opening", shortDescription: "KYC assisted savings account opening guide in top banks.", icon: PiggyBank, gradient: "from-emerald-500 to-teal-650", theme: "blue" },
      { title: "Current Account Opening", slug: "current-account-opening", shortDescription: "Current account opening assistance for business owners.", icon: Banknote, gradient: "from-cyan-500 to-blue-600", theme: "blue" },
      { title: "CIBIL Report & Increase", slug: "cibil-report-increase", shortDescription: "CIBIL score health monitoring, negative remark disputing.", icon: BadgeIndianRupee, badge: "Business", gradient: "from-purple-500 to-indigo-650", theme: "blue" },
    ],
  },
  {
    id: "licence",
    title: "Passport & Licence",
    chipLabel: "Licence",
    services: [
      { title: "Passport", slug: "passport", shortDescription: "Fresh/Reissue passport application and slot scheduling.", icon: Fingerprint, badge: "Popular", gradient: "from-rose-500 to-pink-600", theme: "orange" },
      { title: "Learning Driving License", slug: "learning-driving-license", shortDescription: "Learner driving licence online filing and slot processing.", icon: CarFront, badge: "Popular", gradient: "from-orange-500 to-amber-600", theme: "orange" },
    ],
  },
  {
    id: "tax",
    title: "Tax & GST",
    chipLabel: "Tax",
    services: [
      { title: "GST Registration & Filing", slug: "gst-registration-filing", shortDescription: "GST certificate registration and GSTR tax return support.", icon: Store, badge: "Popular", gradient: "from-emerald-500 to-teal-600", theme: "blue" },
      { title: "ITR Filing", slug: "itr-filing", shortDescription: "Income tax return filing for individuals and firms.", icon: ReceiptText, badge: "Popular", gradient: "from-blue-500 to-indigo-600", theme: "blue" },
    ],
  },
  {
    id: "company",
    title: "Company Registration & Compliance",
    chipLabel: "Company",
    services: [
      { title: "Private Limited Registration", slug: "private-limited-registration", shortDescription: "Pvt Ltd company incorporation, DIN, and DSC guide.", icon: Building2, badge: "Business", gradient: "from-slate-700 to-slate-850", theme: "blue" },
      { title: "Private Limited Compliance", slug: "private-limited-compliance", shortDescription: "Annual ROC compliance filing, KYC and audit checklists.", icon: FileCheck2, gradient: "from-indigo-500 to-blue-600", theme: "blue" },
      { title: "OPC Registration", slug: "opc-registration", shortDescription: "One Person Company registration assistance with full legal compliance.", icon: BriefcaseBusiness, gradient: "from-violet-500 to-purple-600", theme: "blue" },
      { title: "DSC", slug: "dsc", shortDescription: "Class 3 digital signature certificate with token setup.", icon: BadgeCheck, gradient: "from-cyan-500 to-teal-600", theme: "blue" },
      { title: "MSME Registration", slug: "msme-registration", shortDescription: "Udyam registration to avail corporate banking privileges.", icon: Store, badge: "Popular", gradient: "from-emerald-500 to-green-600", theme: "blue" },
      { title: "ISO Certification", slug: "iso-certification", shortDescription: "ISO standard certificate guidance for security audits.", icon: ShieldCheck, badge: "Business", gradient: "from-amber-500 to-orange-600", theme: "orange" },
    ],
  },
  {
    id: "insurance",
    title: "Insurance",
    chipLabel: "Insurance",
    services: [
      { title: "Insurance", slug: "insurance", shortDescription: "Two-wheeler, car, and commercial vehicle insurance quotes and renewals.", icon: ShieldCheck, badge: "Popular", gradient: "from-rose-500 to-red-600", theme: "orange" },
    ],
  },
];

const allChips = [
  { id: "all", label: "All" },
  ...categories.map((cat) => ({ id: cat.id, label: cat.chipLabel })),
];

const trustBadges = [
  { label: "Secure Process", icon: ShieldCheck },
  { label: "Verified Assistance", icon: BadgeCheck },
  { label: "Online Support", icon: UsersRound },
];

/* ─── Component ─── */

export function ServicesDirectoryClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState("all");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const [chipsSticky, setChipsSticky] = useState(false);

  // Sticky chips observer
  useEffect(() => {
    const sentinel = document.getElementById("chips-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setChipsSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Fade-up observer
  useEffect(() => {
    const cards = document.querySelectorAll("[data-reveal]");
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("reveal-on-scroll");
            (entry.target as HTMLElement).style.opacity = "1";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [searchQuery, activeChip]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return categories
      .filter((cat) => activeChip === "all" || cat.id === activeChip)
      .map((cat) => ({
        ...cat,
        services: q
          ? cat.services.filter(
              (s) =>
                s.title.toLowerCase().includes(q) ||
                s.shortDescription.toLowerCase().includes(q)
            )
          : cat.services,
      }))
      .filter((cat) => cat.services.length > 0);
  }, [searchQuery, activeChip]);

  const handleChipClick = useCallback((chipId: string) => {
    setActiveChip(chipId);
    setSearchQuery("");

    if (chipId !== "all") {
      requestAnimationFrame(() => {
        const el = sectionRefs.current[chipId];
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 110;
          window.scrollTo({ top, behavior: "smooth" });
        }
      });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return (
    <div className="pb-[calc(var(--bottom-nav-height)+2rem+env(safe-area-inset-bottom))]">
      {/* Premium Header Section */}
      <section className="px-4 pt-6 pb-3 md:px-8 md:pt-10">
        <div className="mx-auto max-w-7xl">
          <div className="glass-panel overflow-hidden rounded-[24px] px-5 py-6 md:p-8">
            <div className="relative z-10 max-w-3xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/50 bg-blue-50/50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-blue-700 shadow-sm">
                <BadgeCheck className="h-3.5 w-3.5 text-orange-500" />
                DigiConnect Dukan Directory
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 md:text-4xl">
                All Digital Services
              </h1>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500 md:text-sm md:max-w-xl">
                Apply online with guided support and verified assistance. Fast digital documentation assistance across India.
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-orange-500/5 pointer-events-none -z-10" />
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="px-4 pt-2 pb-1 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-11 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                aria-label="Clear search"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Sentinel for sticky detection */}
      <div id="chips-sentinel" className="h-px" />

      {/* Category Chips - iOS Sticky Style */}
      <section
        ref={chipsRef}
        className={`sticky top-[3.5rem] z-30 bg-white/90 backdrop-blur-md transition-shadow duration-300 md:top-[4.25rem] ${
          chipsSticky ? "shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-b border-slate-100" : ""
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-2.5 md:px-8">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
            {allChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleChipClick(chip.id)}
                className={`inline-flex h-9 shrink-0 items-center rounded-full px-4.5 text-xs font-bold transition-all duration-150 active:scale-[0.96] ${
                  activeChip === chip.id
                    ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/10"
                    : "border border-slate-200/80 bg-white text-slate-550 hover:border-slate-350 hover:text-slate-900"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="px-4 pt-3 pb-1 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-blue-50/50 via-white to-orange-50/50 border border-slate-100 px-4 py-2.5">
            {trustBadges.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Icon className="h-3 w-3" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-slate-650 tracking-wider uppercase md:text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Directory Grid */}
      <section className="px-4 pt-4 md:px-8">
        <div className="mx-auto max-w-7xl space-y-7">
          {filteredCategories.length ? (
            filteredCategories.map((cat) => (
              <div
                key={cat.id}
                ref={(el) => {
                  sectionRefs.current[cat.id] = el;
                }}
                className="scroll-mt-36"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3.5">
                  <h2 className="text-sm font-black tracking-wider uppercase text-slate-900 md:text-base">
                    {cat.title}
                  </h2>
                  <span className="rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-450">
                    {cat.services.length} {cat.services.length === 1 ? "Service" : "Services"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 md:gap-4">
                  {cat.services.map((service, idx) => (
                    <ServiceGridCard
                      key={service.slug}
                      service={service}
                      index={idx}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
              <p className="text-base font-bold text-slate-800">
                No service found
              </p>
              <p className="mt-1.5 text-xs text-slate-500">
                Try a different search term or check another category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveChip("all");
                }}
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-900 px-4 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ─── Service Card Component ─── */

function ServiceGridCard({
  service,
  index,
}: {
  service: CuratedService;
  index: number;
}) {
  const Icon = service.icon;

  return (
    <Link
      href={`/services/${service.slug}`}
      data-reveal
      style={{ animationDelay: `${index * 40}ms` }}
      className="group flex min-h-[11rem] flex-col rounded-[22px] border border-white/20 bg-white/70 p-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.02)] transition duration-200 active:scale-[0.96] md:min-h-[12.5rem] md:p-5 md:hover:-translate-y-1 md:hover:border-blue-100 md:hover:shadow-[0_12px_28px_rgba(37,99,235,0.08)] opacity-0 relative overflow-hidden"
    >
      {/* Background Liquid Glass Glows */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-50/40 via-white/50 to-white/90 pointer-events-none -z-10" />
      
      <div className="flex items-start justify-between gap-1">
        {/* Consistent circular gradient background */}
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-250 group-hover:scale-105 ${
            service.theme === "orange"
              ? "bg-gradient-to-tr from-orange-500/10 to-amber-500/5 border border-orange-100 text-orange-650"
              : "bg-gradient-to-tr from-blue-500/10 to-indigo-500/5 border border-blue-100 text-blue-650"
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        {service.badge ? (
          <span className="rounded-full bg-slate-100/80 border border-slate-200/50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-600 leading-none">
            {service.badge}
          </span>
        ) : null}
      </div>

      <h3 className="mt-3.5 text-xs font-black leading-snug text-slate-900 md:text-sm tracking-tight">
        {service.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-slate-500 md:text-xs">
        {service.shortDescription}
      </p>

      <div className="mt-auto pt-3.5 min-h-[44px]">
        {/* Click target minimum of 44px */}
        <span className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-full border border-slate-100 bg-slate-50/50 text-[11px] font-extrabold text-slate-700 transition duration-150 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600">
          Apply Now
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
