import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";
import { HomepageSection } from "@/components/homepage/ui";
import { HOMEPAGE_TRACKING_ILLUSTRATION } from "@/lib/homepage-visual-assets";

export function ApplicationTrackingCta() {
  return (
    <HomepageSection id="track" surface="sky" wash="dual">
      <div className="relative grid min-h-[240px] items-center gap-6 overflow-hidden rounded-[1.75rem] p-6 md:min-h-[280px] md:grid-cols-[1.15fr_0.85fr] md:gap-8 md:p-9"
        style={{ background: "var(--dc-grad-blue)" }}>
        <div>
          <p className="relative inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--dc-amber)]">
            <Route className="h-4 w-4" aria-hidden="true" /> Application status
          </p>
          <h2 className="relative mt-3 text-[1.65rem] font-extrabold tracking-[-0.025em] text-white sm:text-[2rem] md:text-[2.25rem]">
            Track your application
          </h2>
          <p className="relative mt-3 max-w-xl text-[15px] font-medium leading-relaxed text-white/80 sm:text-base">
            Sign in to view live status, missing-document requests and receipts. Public ID lookup is not offered here to
            protect customer privacy.
          </p>
          <div className="relative mt-6 flex w-full flex-col gap-3 sm:max-w-lg sm:flex-row">
            <Link
              href="/customer/dashboard?tab=applications"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-extrabold text-white shadow-[0_12px_26px_-12px_rgba(247,74,1,0.95)] transition duration-300 hover:brightness-110"
              style={{ background: "var(--dc-grad-flame)" }}
            >
              Open tracking
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="lg-pill-dark lg-raise-dark inline-flex h-12 flex-1 items-center justify-center rounded-xl px-5 text-[15px] font-bold text-white"
            >
              Login / create account
            </Link>
          </div>
        </div>
        <div className="lg-card-dark lg-float relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-[1.35rem]">
          <Image
            src={HOMEPAGE_TRACKING_ILLUSTRATION}
            alt=""
            fill
            loading="lazy"
            className="object-contain drop-shadow-xl"
            sizes="(max-width: 768px) 80vw, 360px"
          />
        </div>
      </div>
    </HomepageSection>
  );
}
