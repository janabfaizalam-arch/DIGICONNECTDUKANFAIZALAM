import Image from "next/image";
import { ShieldCheck, Headphones, Globe, CheckCircle2, Route } from "lucide-react";
import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";
import { HOMEPAGE_TRUST_ILLUSTRATION } from "@/lib/homepage-visual-assets";

const primary = [
  {
    label: "Secure Razorpay payments",
    text: "UPI, cards and net banking when checkout is enabled.",
    icon: ShieldCheck,
  },
  {
    label: "Private document handling",
    text: "Uploaded files are handled carefully for assistance only.",
    icon: CheckCircle2,
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
];

const chips = ["PAN India online assistance", "WhatsApp & call support", "Private platform — not a government portal"];

export function TrustStrip() {
  return (
    <HomepageSection id="trust" surface="aqua">
      <HomepageSectionHeader
        eyebrow="Why DigiConnect"
        title="Built for secure digital assistance"
        description="Verified benefits only — no fabricated customer counts, success rates or certifications."
      />

      <div className="grid items-center gap-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
        <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-white to-[var(--dc-teal-soft)] p-5 shadow-[0_16px_40px_rgba(7,31,77,0.06)] md:p-7">
          <div className="relative mx-auto aspect-[4/3] max-w-md">
            <Image
              src={HOMEPAGE_TRUST_ILLUSTRATION}
              alt=""
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 90vw, 480px"
            />
          </div>
          <p className="mt-4 rounded-2xl bg-[var(--dc-navy-950)] px-4 py-3.5 text-[15px] font-bold leading-relaxed text-white">
            DigiConnect Dukan is a private assistance platform by RNOS India Pvt Ltd — not an official government portal.
          </p>
        </div>

        <div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {primary.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.label}
                  className="rounded-[1.35rem] border border-[var(--dc-cyan)]/15 bg-white p-5 shadow-[0_8px_24px_rgba(7,31,77,0.04)]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--dc-teal-soft)] text-[var(--dc-teal)]">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-extrabold text-[var(--dc-ink)] md:text-lg">{item.label}</h3>
                  <p className="mt-2 text-[15px] font-semibold leading-relaxed text-[var(--dc-body)]">{item.text}</p>
                </li>
              );
            })}
          </ul>

          <ul className="mt-5 flex flex-wrap gap-2.5">
            {chips.map((chip) => (
              <li
                key={chip}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--dc-teal)]/20 bg-white px-3.5 py-2 text-sm font-bold text-[var(--dc-ink)]"
              >
                {chip.includes("WhatsApp") ? (
                  <Headphones className="h-3.5 w-3.5 text-[var(--dc-teal)]" aria-hidden="true" />
                ) : (
                  <Globe className="h-3.5 w-3.5 text-[var(--dc-teal)]" aria-hidden="true" />
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
