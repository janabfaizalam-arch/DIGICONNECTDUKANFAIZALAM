import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { MarketingFooter } from "@/components/marketing-footer";
import { PartnerApplicationForm } from "@/components/partner/partner-application-form";
import { DIGI_PARTNER_LANDING_ROUTE } from "@/lib/auth/partner-access";

export const metadata: Metadata = {
  title: "Become a Digi Partner | DigiConnect Dukan",
  description:
    "Apply to become a DigiConnect Digi Partner. Serve customers, earn commission on every completed service, and manage everything from your partner panel.",
  alternates: { canonical: "/digi-partner/apply" },
};

export default function PartnerApplyPage() {
  return (
    <>
      <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          <Link
            href={DIGI_PARTNER_LANDING_ROUTE}
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Digi Partner
          </Link>

          <header className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-600">
              Digi Partner Network
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              Become a Digi Partner
            </h1>
            <p className="max-w-2xl text-base font-medium text-slate-600">
              Tell us about yourself. We review every application and get in touch on WhatsApp. Once
              approved you get a partner login, the full service catalogue, and commission credited
              to your wallet on every completed service.
            </p>
          </header>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <PartnerApplicationForm />
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
