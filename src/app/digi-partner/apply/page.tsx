import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { AuthScene, GlassCard } from "@/components/auth/ui";
import { PartnerApplicationForm } from "@/components/partner/partner-application-form";
import { DIGI_PARTNER_LANDING_ROUTE } from "@/lib/auth/partner-access";

export const metadata: Metadata = {
  title: "Become a Digi Partner | DigiConnect Dukan",
  description:
    "Apply to become a DigiConnect Digi Partner. Serve customers, earn commission on every completed service, and manage everything from your partner panel.",
  alternates: { canonical: "/digi-partner/apply" },
};

/**
 * The page a shop owner lands on to join.
 *
 * It used to be a plain form in a narrow column on a white page, which at
 * desktop width left two-thirds of the screen empty and gave a stranger
 * nothing to believe in while they typed their mobile number into a site they
 * had just met. It now uses the same split-screen scene as the partner login
 * — brand on one side, one card on the other — so applying and signing in
 * look like the same product, and the reasons to bother are next to the form
 * rather than a page away.
 */
export default function PartnerApplyPage() {
  return (
    <AuthScene
      eyebrow="Digi Partner Network"
      kicker="Join the network"
      headline={
        <>
          Turn your shop into a
          <br />
          digital service centre
        </>
      }
    >
      <GlassCard>
        <Link
          href={DIGI_PARTNER_LANDING_ROUTE}
          className="inline-flex w-fit items-center gap-1.5 text-[13px] font-bold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-[26px] font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-[28px]">
            Become a Digi Partner
          </h1>
          <p className="text-sm font-medium leading-relaxed text-slate-500">
            Six things and you are done. We read every application and call you on WhatsApp. Once
            approved you get a partner login, the full service catalogue, and commission in your
            wallet on every completed service.
          </p>
        </div>

        <PartnerApplicationForm />
      </GlassCard>
    </AuthScene>
  );
}
