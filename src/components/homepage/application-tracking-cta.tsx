import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";
import { HomepageSection } from "@/components/homepage/ui";
import { HOMEPAGE_TRACKING_ILLUSTRATION } from "@/lib/homepage-visual-assets";

export function ApplicationTrackingCta() {
  return (
    <HomepageSection id="track" surface="blue">
      <div className="grid min-h-[240px] items-center gap-6 overflow-hidden rounded-[1.75rem] border border-white/20 bg-gradient-to-br from-[var(--dc-blue-700)] to-[var(--dc-navy-950)] p-6 md:min-h-[280px] md:grid-cols-[1.15fr_0.85fr] md:gap-8 md:p-9">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[var(--dc-orange-400)]">
            <Route className="h-4 w-4" aria-hidden="true" /> Application status
          </p>
          <h2 className="mt-3 text-[1.65rem] font-black tracking-tight text-white sm:text-[2rem] md:text-[2.25rem]">
            Track your application
          </h2>
          <p className="mt-3 max-w-xl text-[15px] font-semibold leading-relaxed text-white/92 sm:text-base">
            Sign in to view live status, missing-document requests and receipts. Public ID lookup is not offered here to
            protect customer privacy.
          </p>
          <div className="mt-6 flex w-full flex-col gap-3 sm:max-w-lg sm:flex-row">
            <Link
              href="/customer/dashboard?tab=applications"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--dc-orange-500)] px-5 text-[15px] font-black text-white transition hover:bg-[var(--dc-orange-600)]"
            >
              Open tracking
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-white/35 bg-white/10 px-5 text-[15px] font-bold text-white transition hover:bg-white/20"
            >
              Login / create account
            </Link>
          </div>
        </div>
        <div className="relative mx-auto aspect-[4/3] w-full max-w-sm">
          <Image
            src={HOMEPAGE_TRACKING_ILLUSTRATION}
            alt=""
            fill
            className="object-contain drop-shadow-xl"
            sizes="(max-width: 768px) 80vw, 360px"
          />
        </div>
      </div>
    </HomepageSection>
  );
}
