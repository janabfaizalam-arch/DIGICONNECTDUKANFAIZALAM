import { ClipboardCheck, FileUp, BadgeCheck, CreditCard, MapPinned } from "lucide-react";

import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";
import { Stagger, StaggerItem } from "@/components/homepage/motion";

const STEPS = [
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

/**
 * The five-step journey, on the dark brand field.
 *
 * The connecting rail is drawn as a dashed line that animates its offset —
 * the same "data in transit" idea as the hero's mesh, and the reason the two
 * dark bands on the page read as the same place. It is a stroke-dashoffset
 * animation on a border-less element, so it costs one composited layer and
 * stops entirely under prefers-reduced-motion.
 */
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
      <div className="relative hidden lg:block">
        <svg
          className="pointer-events-none absolute left-[10%] right-[10%] top-[2.7rem] h-1 w-[80%]"
          viewBox="0 0 1000 2"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line x1="0" y1="1" x2="1000" y2="1" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
          <line
            x1="0"
            y1="1"
            x2="1000"
            y2="1"
            stroke="var(--dc-amber)"
            strokeWidth="2"
            strokeLinecap="round"
            className="lg-dash"
          />
        </svg>

        <Stagger as="ol" className="grid grid-cols-5 gap-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <StaggerItem as="li" key={step.title} className="relative flex flex-col items-center px-2 text-center">
                <span className="lg-card-dark relative z-10 flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-[1.5rem]">
                  <span
                    className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold text-white shadow-[0_6px_14px_-6px_rgba(247,74,1,0.9)]"
                    style={{ background: "var(--dc-grad-flame)" }}
                  >
                    {index + 1}
                  </span>
                  <Icon className="h-7 w-7 text-[var(--dc-amber)]" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-base font-extrabold text-white md:text-lg">{step.title}</h3>
                <p className="mt-2 text-[15px] font-medium leading-relaxed text-white/75">{step.description}</p>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>

      {/* Mobile vertical timeline */}
      <ol className="relative space-y-0 lg:hidden">
        <div
          className="pointer-events-none absolute bottom-5 left-[1.4rem] top-5 w-0.5 rounded-full"
          style={{ background: "linear-gradient(to bottom, var(--dc-amber), rgba(255,255,255,0.2), var(--dc-flame))" }}
          aria-hidden="true"
        />
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="relative flex gap-4 py-3.5 pl-1">
              <span
                className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(247,74,1,0.9)]"
                style={{ background: "var(--dc-grad-flame)" }}
              >
                {index + 1}
              </span>
              <div className="lg-card-dark min-w-0 flex-1 p-4">
                <div className="flex items-center gap-2.5">
                  <Icon className="h-5 w-5 shrink-0 text-[var(--dc-amber)]" aria-hidden="true" />
                  <h3 className="text-base font-extrabold text-white">{step.title}</h3>
                </div>
                <p className="mt-2 text-[15px] font-medium leading-relaxed text-white/78">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </HomepageSection>
  );
}
