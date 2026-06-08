import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Landmark, Briefcase, FileCheck, Check } from "lucide-react";
import { getPublicServices } from "@/lib/services";
import { type ServiceItem } from "@/lib/services-data";

interface SchemeFallback {
  slug: string;
  title: string;
  category: string;
  description: string;
  priceLabel: string;
  benefits: string[];
}

const fallbackSchemes: SchemeFallback[] = [
  {
    slug: "pm-vishwakarma-yojana",
    title: "PM Vishwakarma Yojana",
    category: "Artisan & Skill Subsidy",
    description: "Verify your traditional craft profile, secure training stipends, certificates, and project toolkit files.",
    priceLabel: "₹250 Support Fee",
    benefits: ["₹15,000 Toolkit Incentive support", "Official Skill Certificate & ID Card", "Interest-free business loan eligibility"]
  },
  {
    slug: "mudra-loan",
    title: "Mudra Loan Assistance",
    category: "Micro Business Funding",
    description: "Documentation file preparation for Shishu, Kishor, and Tarun micro bank loans up to ₹10 Lakhs.",
    priceLabel: "Enquiry Now",
    benefits: ["Collateral-free business credit support", "Subsidized interest rate files", "Verified project report formats"]
  },
  {
    slug: "startup-india-assistance",
    title: "Startup India Registration",
    category: "DPIIT Certification",
    description: "Get DPIIT tax exemptions, priority patent filings, and register under the official Startup India hub.",
    priceLabel: "Enquiry Now",
    benefits: ["3-year Income Tax exemption file", "Government funding portal access", "Self-compliance certifications"]
  },
  {
    slug: "msme-registration",
    title: "MSME / Udyam Registration",
    category: "Business Subventions",
    description: "Fast-track certificate issuance to claim priority sector interest rates and public subsidies.",
    priceLabel: "₹699 Service Fee",
    benefits: ["Priority lending rates under RBI rules", "Government subsidy schemes eligibility", "ISO certification discounts"]
  },
  {
    slug: "cm-yuva-entrepreneur-loan-assistance",
    title: "CM YUVA Yojana (UP)",
    category: "Youth Self-Employment Support",
    description: "Interest-free loan advisory files up to ₹5 Lakhs for service setups and retail stores.",
    priceLabel: "₹13,499 Advisory",
    benefits: ["Interest-free principal liability files", "Margin money support of 10%", "Detailed Project Report preparation"]
  }
];

function getSchemeIcon(slug: string) {
  switch (slug) {
    case "pm-vishwakarma-yojana": return ShieldCheck;
    case "mudra-loan": return Landmark;
    case "startup-india-assistance": return Briefcase;
    case "msme-registration": return FileCheck;
    default: return ShieldCheck;
  }
}

export async function GovernmentSchemesHub() {
  let dbServices: ServiceItem[] = [];
  try {
    dbServices = await getPublicServices();
  } catch (err) {
    console.warn("[government-schemes-hub] Failed to retrieve dynamic services:", err);
  }

  // Resolve matching scheme services, or fallback to mock models
  const schemesList = fallbackSchemes.map(fallback => {
    const matched = dbServices.find(s => s.slug === fallback.slug);
    return {
      slug: fallback.slug,
      title: matched?.title || fallback.title,
      category: matched?.category || fallback.category,
      description: matched?.shortDescription || fallback.description,
      priceLabel: matched?.priceLabel || fallback.priceLabel,
      benefits: matched?.benefits?.slice(0, 3) || fallback.benefits,
      icon: getSchemeIcon(fallback.slug)
    };
  });

  return (
    <section id="schemes" className="bg-white py-12 px-4 relative overflow-hidden">
      {/* Drifting decoration bubble */}
      <div className="absolute top-1/2 left-1/4 w-96 h-96 rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none -translate-y-1/2" />

      <div className="container-shell max-w-[1600px] mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Government Initiatives
          </p>
          <h2 className="mt-1.5 text-xl md:text-2xl font-black tracking-tight text-slate-800 leading-tight">
            Government Schemes Hub
          </h2>
          <p className="mt-2 text-xs font-semibold text-slate-450 leading-relaxed max-w-sm mx-auto">
            Apply online for national business subsidies, artisan stipends, mudra loans, and startup certificates.
          </p>
        </div>

        {/* Schemes Bento Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto items-stretch">
          {schemesList.map((scheme) => {
            const IconComponent = scheme.icon;
            
            return (
              <div 
                key={scheme.slug}
                className="glass-liquid-premium rounded-3xl p-6 flex flex-col justify-between border-white/50 hover:border-emerald-300/40"
              >
                <div>
                  {/* Category & Badge */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      {scheme.category}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[8.5px] font-black text-emerald-600 bg-emerald-50/50 px-2 py-0.5 rounded-md border border-emerald-100/30 leading-none">
                      Gov Scheme
                    </span>
                  </div>

                  {/* Icon & Title */}
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50/50 text-emerald-600">
                      <IconComponent className="h-5.5 w-5.5 stroke-[2]" />
                    </div>
                    <h3 className="text-base font-black text-slate-800 tracking-tight leading-snug">
                      {scheme.title}
                    </h3>
                  </div>

                  {/* Summary */}
                  <p className="mt-3 text-xs leading-relaxed text-slate-450 font-semibold">
                    {scheme.description}
                  </p>

                  {/* Benefits */}
                  <ul className="mt-5 space-y-2">
                    {scheme.benefits.map((benefit, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2 text-xs font-semibold text-slate-500">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5 stroke-[3]" />
                        <span className="leading-snug">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer Price & Apply */}
                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[8.5px] font-bold text-slate-400 uppercase block leading-none">Support Cost</span>
                    <span className="text-xs font-black text-slate-800 block mt-1.5 leading-none">
                      {scheme.priceLabel}
                    </span>
                  </div>
                  <Link
                    href={`/services/${scheme.slug}`}
                    className="h-9 rounded-xl bg-slate-900 hover:bg-slate-850 px-3.5 text-xs font-black text-white transition-all active:scale-[0.96] flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    Apply Now
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
