"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

import {
  ServiceCard,
  ServiceCounter,
  ServiceCta,
  ServiceIcon,
  ServiceSection,
  WhatsAppIcon,
} from "@/components/services/shell";
import type { HomepageSurface } from "@/components/homepage/ui";
import { cn } from "@/lib/utils";
import type { DprBanner, DprSection } from "@/lib/dpr/types";

/**
 * The DPR page's chrome.
 *
 * Everything visual now comes from `@/components/services/shell`, which the CM
 * YUVA page reads too — one card, one section rhythm, one button across both
 * dedicated service pages rather than each inventing its own. What stays here
 * is the part that is genuinely this page's: components shaped around a
 * `DprSection` row from the CMS, so a band's heading, description and artwork
 * are whatever an administrator put in them.
 */

export type DprSectionContext = {
  applyUrl: string;
  whatsappUrl: string;
  supportPhone: string;
  reduceMotion: boolean;
};

export { WhatsAppIcon };

/** Icon disc in one of the two logo ramps. */
export const DprIcon = ServiceIcon;

/** The one card surface, shared with the homepage. */
export const GlassCard = ServiceCard;

/** A number that counts up once, when it first comes into view. */
export const Counter = ServiceCounter;

/** The page's action button. */
export const CtaButton = ServiceCta;

/**
 * One band of the page, driven by a CMS row.
 *
 * The heading and description come from the admin and are rendered by the
 * shared section header, so editing the copy still gets the site's typography.
 */
export function SectionShell({
  section,
  id,
  className,
  children,
  surface = "white",
  eager,
  center = true,
  wash = "blue",
}: {
  section: DprSection;
  id?: string;
  className?: string;
  children: React.ReactNode;
  surface?: HomepageSurface;
  eager?: boolean;
  center?: boolean;
  wash?: "blue" | "flame" | "dual" | "none";
}) {
  return (
    <ServiceSection
      id={id ?? section.sectionKey}
      title={section.heading}
      description={section.description}
      surface={surface}
      eager={eager}
      center={center}
      wash={wash}
      className={className}
    >
      {children}
    </ServiceSection>
  );
}

/** Admin-uploaded artwork for a section. Nothing renders when none is set. */
export function SectionBanners({
  banners,
  lazy = true,
  className,
}: {
  banners: DprBanner[];
  lazy?: boolean;
  className?: string;
}) {
  if (!banners.length) return null;
  return (
    <div className={cn("mb-6 space-y-3 sm:mb-8 sm:space-y-4", className)}>
      {banners.map((banner) => (
        <BannerBlock key={banner.id} banner={banner} lazy={lazy} />
      ))}
    </div>
  );
}

function BannerBlock({ banner, lazy }: { banner: DprBanner; lazy: boolean }) {
  const href = banner.buttonUrl || undefined;
  const content = (
    <div className="lg-card relative aspect-[7/3] w-full overflow-hidden md:aspect-[21/6]">
      <Image
        src={banner.mobileImageUrl || banner.imageUrl}
        alt={banner.altText || banner.title || "Detailed Project Report"}
        fill
        className="object-cover md:hidden"
        sizes="(max-width: 768px) 100vw, 0px"
        loading={lazy ? "lazy" : undefined}
        priority={!lazy}
      />
      <Image
        src={banner.imageUrl}
        alt={banner.altText || banner.title || "Detailed Project Report"}
        fill
        className="hidden object-cover md:block"
        sizes="(min-width: 768px) 100vw, 0px"
        loading={lazy ? "lazy" : undefined}
        priority={!lazy}
      />
      {banner.title || banner.description || banner.buttonText ? (
        <div className="absolute inset-0 flex items-end bg-gradient-to-r from-[rgba(1,17,54,0.72)] via-[rgba(1,17,54,0.28)] to-transparent p-4 sm:p-6 md:p-8">
          <div className="max-w-lg space-y-1.5 text-white">
            {banner.title ? <p className="text-base font-extrabold sm:text-lg md:text-xl">{banner.title}</p> : null}
            {banner.description ? (
              <p className="text-[13px] font-medium text-white/80 sm:text-sm">{banner.description}</p>
            ) : null}
            {banner.buttonText ? (
              <span className="lg-pill-dark mt-2 inline-flex px-3.5 py-1.5 text-[13px] font-bold text-white">
                {banner.buttonText}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block">
        {content}
      </Link>
    );
  }
  return content;
}
