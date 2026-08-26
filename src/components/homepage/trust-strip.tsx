import Image from "next/image";
import { ShieldCheck, Headphones, Globe, CheckCircle2, Route, FileLock2 } from "lucide-react";

import { BrandIcon, HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";
import { Stagger, StaggerItem } from "@/components/homepage/motion";
import { HOMEPAGE_TRUST_ILLUSTRATION } from "@/lib/homepage-visual-assets";

const PRIMARY = [
  {
    label: "Secure Razorpay payments",
    text: "UPI, cards and net banking when checkout is enabled.",
    icon: ShieldCheck,
  },
  {
    label: "Private document handling",
    text: "Uploaded files are handled carefully for assistance only.",
    icon: FileLock2,
  },
  {
    label: "Expert verification",
    text: "Document checks before submission support continues.",
    icon: CheckCircle2,
  },
  {
    label: "Application tracking",
    text: "Live status updates inside your customer dashboard.",
    icon: Route,
  },
] as const;

const CHIPS = [
  "PAN India online assistance",
  "WhatsApp & call support",
  "Private platform — not a government portal",
] as const;

/**
 * Why this platform, stated only in things that are checkable.
 *
 * Every claim here maps to something the product actually does. There is no
 * customer count, no success rate and no certification badge, because none of
 * those exist to be verified — and on a page whose entire job is persuading
 * someone to hand over identity documents, one unverifiable number undoes the
 * four honest claims next to it.
 */
export function TrustStrip() {
  return (
    <HomepageSection id="trust" surface="sky" wash="dual">
      <HomepageSectionHeader
        eyebrow="Why DigiConnect"
        title="Built for secure digital assistance"
        description="Verified benefits only — no fabricated customer counts, success rates or certifications."
      />

      <div className="grid items-center gap-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
        <div className="lg-card p-5 md:p-7">
          <div className="relative mx-auto aspect-[4/3] max-w-md">
            <Image
              src={HOMEPAGE_TRUST_ILLUSTRATION}
              alt=""
              fill
              loading="lazy"
              className="object-contain"
              sizes="(max-width: 1024px) 90vw, 480px"
            />
          </div>
          {/* The disclaimer is the most important sentence on the page and it
              is given the strongest surface on the section rather than being
              set as fine print. */}
          <p
            className="mt-4 rounded-2xl px-4 py-3.5 text-[15px] font-bold leading-relaxed text-white"
            style={{ background: "var(--dc-grad-blue)" }}
          >
            DigiConnect Dukan is a private assistance platform by RNOS India Pvt Ltd — not an official government portal.
          </p>
        </div>

        <div>
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2">
            {PRIMARY.map((item, index) => {
              const Icon = item.icon;
              return (
                <StaggerItem as="li" key={item.label} className="lg-card lg-raise lg-sheen p-5">
                  <BrandIcon tone={index === 0 ? "flame" : "blue"} className="h-12 w-12 rounded-2xl">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </BrandIcon>
                  <h3 className="mt-4 text-base font-extrabold text-[var(--dc-ink)] md:text-lg">{item.label}</h3>
                  <p className="mt-2 text-[15px] font-medium leading-relaxed text-[var(--dc-body)]">{item.text}</p>
                </StaggerItem>
              );
            })}
          </Stagger>

          <ul className="mt-5 flex flex-wrap gap-2.5">
            {CHIPS.map((chip) => (
              <li key={chip} className="lg-pill inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-[var(--dc-ink)]">
                {chip.includes("WhatsApp") ? (
                  <Headphones className="h-3.5 w-3.5 text-[var(--dc-flame)]" aria-hidden="true" />
                ) : (
                  <Globe className="h-3.5 w-3.5 text-[var(--dc-blue-bright)]" aria-hidden="true" />
                )}
                {chip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </HomepageSection>
  );
}
