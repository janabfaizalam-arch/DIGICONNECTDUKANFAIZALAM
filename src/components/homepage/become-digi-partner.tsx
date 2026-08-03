import Image from "next/image";
import Link from "next/link";
import { Handshake, ArrowRight, LogIn, Check } from "lucide-react";

import { HomepageSection } from "@/components/homepage/ui";
import { HOMEPAGE_PARTNER_ILLUSTRATION } from "@/lib/homepage-visual-assets";

const benefits = [
  "Offer DigiConnect assistance services from your shop or desk",
  "Track partner applications in the Digi Partner portal",
  "Transparent commercial terms shared during onboarding",
];

export function BecomeDigiPartner() {
  return (
    <HomepageSection id="become-partner" surface="blue" aria-labelledby="partner-heading">
      <div className="grid items-center gap-8 overflow-hidden rounded-[1.75rem] border border-white/20 bg-gradient-to-br from-[var(--dc-blue-700)] via-[var(--dc-blue-800)] to-[var(--dc-navy-950)] p-6 md:grid-cols-[1.15fr_0.85fr] md:gap-10 md:p-10">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[var(--dc-orange-400)]">
            <Handshake className="h-4 w-4" aria-hidden="true" /> Partner with us
          </p>
          <h2
            id="partner-heading"
            className="mt-3 text-[1.65rem] font-black tracking-tight text-white sm:text-[2rem] md:text-[2.25rem]"
          >
            Become a Digi Partner
          </h2>
          <p className="mt-3 text-[15px] font-semibold leading-relaxed text-white/92 sm:text-base">
            Join DigiConnect Dukan&apos;s partner network to help customers with digital documentation assistance in your
            area.
          </p>
          <ul className="mt-6 space-y-3">
            {benefits.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[15px] font-semibold text-white/95">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dc-orange-400)]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm font-semibold text-white/75">
            Eligibility and commercial terms are shared during the partner application process. No invented commissions are
            shown here.
          </p>
          <div className="mt-6 flex w-full flex-col gap-3 sm:max-w-md sm:flex-row">
            <Link
              href="/digi-partner"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--dc-orange-500)] px-5 text-[15px] font-black text-white transition hover:bg-[var(--dc-orange-600)]"
            >
              Become a Digi Partner
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/ap/login"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-5 text-[15px] font-bold text-white transition hover:bg-white/20"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Partner login
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.5rem] border border-white/20 bg-white/10 p-5 md:p-6">
          <div className="relative mx-auto aspect-square max-w-[280px]">
            <Image
              src={HOMEPAGE_PARTNER_ILLUSTRATION}
              alt=""
              fill
              className="object-cover drop-shadow-xl"
              sizes="280px"
            />
          </div>
          <p className="mt-3 text-center text-sm font-bold text-white/85">
            Partner tools, support desk access and application workflows in one portal.
          </p>
        </div>
      </div>
    </HomepageSection>
  );
}
