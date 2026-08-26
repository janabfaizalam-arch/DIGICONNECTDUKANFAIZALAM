import Link from "next/link";
import { Handshake, ArrowRight, LogIn, Check, LayoutDashboard, LifeBuoy, Store } from "lucide-react";

import { DIGI_PARTNER_BECOME_CTA_LABEL, DIGI_PARTNER_LANDING_ROUTE } from "@/lib/auth/partner-access";
import { HomepageSection } from "@/components/homepage/ui";
import { PartnerIllustration } from "@/components/homepage/brand-illustration";

const BENEFITS = [
  "Offer DigiConnect assistance services from your shop or desk",
  "Track partner applications in the Digi Partner portal",
  "Transparent commercial terms shared during onboarding",
] as const;

/**
 * What a partner actually gets, as three named things rather than a paragraph.
 *
 * There are no numbers here on purpose. Commercials are agreed during
 * onboarding and differ by partner, so any margin or earning figure printed on
 * the homepage would be invented — and this is the one band on the page whose
 * whole job is persuading someone to enter a commercial relationship, which
 * makes it the worst possible place to be caught overstating.
 */
const CAPABILITIES = [
  { icon: Store, title: "Your own counter", text: "Serve walk-in customers under the DigiConnect catalogue." },
  { icon: LayoutDashboard, title: "Partner portal", text: "Submit, track and close applications in one place." },
  { icon: LifeBuoy, title: "Backed by the team", text: "Escalate a stuck case to the same experts we use." },
] as const;

/**
 * Become a Digi Partner.
 *
 * This is the page's second conversion, and it was reading as an afterthought:
 * one flat panel, a bullet list, two buttons and a floating picture. The
 * upgrade gives it the structure a flagship block needs — a numbered proof row
 * of what a partner receives, the artwork framed rather than floating loose on
 * the gradient, and a closing line about onboarding so the ask feels finite.
 *
 * The ornament is the same jaali and orb vocabulary as the hero, so the band
 * belongs to the page rather than looking like a pasted-in advertisement.
 */
export function BecomeDigiPartner() {
  return (
    <HomepageSection id="become-partner" surface="sky" wash="dual" aria-labelledby="partner-heading">
      <div
        className="relative overflow-hidden rounded-[2rem] p-6 md:p-10 lg:p-12"
        style={{ background: "var(--dc-grad-blue)" }}
      >
        {/* Ornament — the page's own vocabulary, not a second visual language */}
        <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
          <div className="dc-jaali absolute inset-0 opacity-[0.07]" />
          <div className="dc-orb dc-orb-flame lg-drift -right-[8%] -top-[45%] h-[32rem] w-[32rem] opacity-60" />
          <div className="dc-orb dc-orb-sky lg-drift-slow -bottom-[50%] -left-[10%] h-[28rem] w-[28rem] opacity-40" />
        </div>

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          <div>
            <p className="lg-pill-dark inline-flex items-center gap-2 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--dc-amber)]">
              <Handshake className="h-3.5 w-3.5" aria-hidden="true" />
              Partner with us
            </p>

            <h2
              id="partner-heading"
              className="mt-4 text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.028em] text-white sm:text-[2.2rem] md:text-[2.6rem]"
            >
              Apna DigiConnect counter{" "}
              <span className="dc-hero-accent dc-text-flame">shuru kijiye</span>
            </h2>

            <p className="mt-4 max-w-xl text-[15px] font-medium leading-relaxed text-white/78 sm:text-base">
              Aap already customers ko documents mein help karte hain. Digi Partner banne par wahi kaam DigiConnect
              ke catalogue, portal aur support team ke saath chalta hai.
            </p>

            {/* What you get — three named capabilities */}
            <ul className="mt-7 grid gap-3 sm:grid-cols-3">
              {CAPABILITIES.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="lg-card-dark p-4">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
                      style={{ background: "var(--dc-grad-flame)" }}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="mt-3 block text-[13.5px] font-extrabold text-white">{item.title}</span>
                    <span className="mt-1 block text-[12.5px] font-medium leading-snug text-white/70">
                      {item.text}
                    </span>
                  </li>
                );
              })}
            </ul>

            <ul className="mt-6 space-y-2.5">
              {BENEFITS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14.5px] font-medium text-white/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--dc-amber)]/20">
                    <Check className="h-3.5 w-3.5 text-[var(--dc-amber)]" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            {/* The row is sized to the longer label rather than split evenly: at
                max-w-md the primary button wrapped "Become a Digi Partner" onto
                two lines and spilled out of its own rounded corners. */}
            <div className="mt-8 flex w-full flex-col gap-3 sm:max-w-[34rem] sm:flex-row">
              <Link
                href={DIGI_PARTNER_LANDING_ROUTE}
                className="group inline-flex h-12 flex-[1.35] items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-[15px] font-extrabold text-white shadow-[0_14px_30px_-12px_rgba(247,74,1,0.95)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                style={{ background: "var(--dc-grad-flame)" }}
              >
                {DIGI_PARTNER_BECOME_CTA_LABEL}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/ap/login"
                className="lg-pill-dark lg-raise-dark inline-flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-[15px] font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Partner login
              </Link>
            </div>

            <p className="mt-4 text-[13px] font-medium leading-relaxed text-white/65">
              Eligibility and commercial terms are shared during the partner application process — no earnings or
              commission figures are quoted here, because they are agreed per partner.
            </p>
          </div>

          {/* Artwork, framed. It used to float unbounded on the gradient with a
              drop shadow, which left its rectangular edge visible against the
              orbs. In a glass frame the edge becomes deliberate. */}
          <div className="lg-card-dark lg-float overflow-hidden rounded-[1.6rem] p-5 md:p-6">
            <div className="mx-auto aspect-square max-w-[19rem]">
              <PartnerIllustration tone="onDark" />
            </div>
            <p className="mt-2 text-center text-[13.5px] font-bold leading-relaxed text-white/85">
              Partner tools, support desk access and application workflows in one portal.
            </p>
          </div>
        </div>
      </div>
    </HomepageSection>
  );
}
