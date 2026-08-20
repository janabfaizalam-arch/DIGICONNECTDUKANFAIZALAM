import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { MarketingFooter } from "@/components/marketing-footer";
import { PartnerApplicationStatusLookup } from "@/components/partner/partner-application-status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track your Digi Partner application | DigiConnect Dukan",
  description: "Check the status of your DigiConnect Digi Partner application with your tracking code.",
  alternates: { canonical: "/digi-partner/apply/status" },
};

type PageProps = {
  searchParams?: Promise<{ code?: string }>;
};

export default async function PartnerApplicationStatusPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <>
      <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link
            href="/digi-partner/apply"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to application
          </Link>

          <header className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-600">
              Digi Partner Network
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Track your application
            </h1>
            <p className="text-base font-medium text-slate-600">
              Enter the tracking code you received when you applied.
            </p>
          </header>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <PartnerApplicationStatusLookup initialCode={params?.code} />
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
