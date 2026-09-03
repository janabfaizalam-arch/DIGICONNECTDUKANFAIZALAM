import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { AuthScene, GlassCard } from "@/components/auth/ui";
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

/**
 * Where somebody who already applied comes back to.
 *
 * Kept on the same scene as the application itself: a person who applied
 * yesterday and returns today should recognise the screen, not wonder whether
 * they are on the right site.
 */
export default async function PartnerApplicationStatusPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <AuthScene
      eyebrow="Digi Partner Network"
      kicker="Already applied"
      headline={
        <>
          We are reading
          <br />
          your application
        </>
      }
    >
      <GlassCard>
        <Link
          href="/digi-partner/apply"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] font-bold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to application
        </Link>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-[26px] font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-[28px]">
            Track your application
          </h1>
          <p className="text-sm font-medium leading-relaxed text-slate-500">
            Enter the tracking code you got when you applied.
          </p>
        </div>

        <PartnerApplicationStatusLookup initialCode={params?.code} />
      </GlassCard>
    </AuthScene>
  );
}
