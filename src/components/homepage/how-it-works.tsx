import { ClipboardCheck, FileUp, BadgeCheck, CreditCard, MapPinned } from "lucide-react";

import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";

const steps = [
  {
    title: "Choose service",
    description: "Browse the live catalog and select the digital assistance you need.",
    icon: ClipboardCheck,
  },
  {
    title: "Submit details",
    description: "Share required details and upload documents through a secure flow.",
    icon: FileUp,
  },
  {
    title: "Expert verification",
    description: "Our team reviews documents before further processing support begins.",
    icon: BadgeCheck,
  },
  {
    title: "Secure payment",
    description: "Pay online via Razorpay when your assistance fee is confirmed.",
    icon: CreditCard,
  },
  {
    title: "Track completion",
    description: "Follow progress in your dashboard and receive support updates.",
    icon: MapPinned,
  },
] as const;

export function HowItWorks() {
  return (
    <HomepageSection id="how-it-works" surface="navy">
      <HomepageSectionHeader
        eyebrow="Simple process"
        title="How it works"
        description="A clear private-assistance journey — DigiConnect Dukan is not an official government portal."
        light
      />

      {/* Desktop connected journey */}
      <ol className="relative hidden lg:grid lg:grid-cols-5 lg:gap-4">
        <div
          className="pointer-events-none absolute left-[8%] right-[8%] top-[2.65rem] h-1 rounded-full bg-gradient-to-r from-[var(--dc-orange-500)] via-white/35 to-[var(--dc-orange-500)]"
          aria-hidden="true"
        />
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="relative flex flex-col items-center px-2 text-center">
              <span className="relative z-10 flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-[1.35rem] border border-white/20 bg-[var(--dc-navy-900)] shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
                <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dc-orange-500)] text-sm font-black text-white">
                  {index + 1}
                </span>
                <Icon className="h-7 w-7 text-[var(--dc-orange-400)]" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-base font-extrabold text-white md:text-lg">{step.title}</h3>
              <p className="mt-2 text-[15px] font-semibold leading-relaxed text-white/85">{step.description}</p>
            </li>
          );
        })}
      </ol>

      {/* Mobile vertical connected timeline */}
      <ol className="relative space-y-0 lg:hidden">
        <div
          className="pointer-events-none absolute bottom-5 left-[1.4rem] top-5 w-1 rounded-full bg-gradient-to-b from-[var(--dc-orange-500)] via-white/35 to-[var(--dc-orange-500)]"
          aria-hidden="true"
        />
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="relative flex gap-4 py-3.5 pl-1">
              <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--dc-orange-500)] text-base font-black text-white shadow-md">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="flex items-center gap-2.5">
                  <Icon className="h-5 w-5 text-[var(--dc-orange-400)]" aria-hidden="true" />
                  <h3 className="text-base font-extrabold text-white">{step.title}</h3>
                </div>
                <p className="mt-2 text-[15px] font-semibold leading-relaxed text-white/88">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </HomepageSection>
  );
}
