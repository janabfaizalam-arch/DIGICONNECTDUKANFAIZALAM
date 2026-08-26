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
    <HomepageSection id="become-partner" surface="sky" wash="dual" aria-labelledby="partner-heading">
      <div className="relative grid items-center gap-8 overflow-hidden rounded-[1.75rem] p-6 md:grid-cols-[1.15fr_0.85fr] md:gap-10 md:p-10"
        style={{ background: "var(--dc-grad-blue)" }}>
        <div>
          <p className="relative inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--dc-amber)]">
            <Handshake className="h-4 w-4" aria-hidden="true" /> Partner with us
          </p>
          <h2
            id="partner-heading"
            className="relative mt-3 text-[1.65rem] font-extrabold tracking-[-0.025em] text-white sm:text-[2rem] md:text-[2.25rem]"
          >
            Become a Digi Partner
          </h2>
          <p className="relative mt-3 text-[15px] font-medium leading-relaxed text-white/80 sm:text-base">
            Join DigiConnect Dukan&apos;s partner network to help customers with digital documentation assistance in your
            area.
          </p>
          <ul className="relative mt-6 space-y-3">
            {benefits.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[15px] font-medium text-white/88">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dc-amber)]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <p className="relative mt-5 text-sm font-medium text-white/65">
            Eligibility and commercial terms are shared during the partner application process. No invented commissions are
            shown here.
          </p>
          <div className="relative mt-6 flex w-full flex-col gap-3 sm:max-w-md sm:flex-row">
            <Link
              href="/digi-partner"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-extrabold text-white shadow-[0_12px_26px_-12px_rgba(247,74,1,0.95)] transition duration-300 hover:brightness-110"
              style={{ background: "var(--dc-grad-flame)" }}
            >
              Become a Digi Partner
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/ap/login"
              className="lg-pill-dark lg-raise-dark inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-bold text-white"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Partner login
            </Link>
          </div>
        </div>

        <div className="lg-card-dark lg-float p-5 md:p-6">
          <div className="relative mx-auto aspect-square max-w-[280px]">
            <Image
              src={HOMEPAGE_PARTNER_ILLUSTRATION}
              alt=""
              fill
              loading="lazy"
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
