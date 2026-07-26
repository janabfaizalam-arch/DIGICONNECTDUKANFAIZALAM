"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import type { DprBanner, DprSection } from "@/lib/dpr/types";
import { cardReveal, staticVariants } from "@/components/auth/ui/motion";

export type DprSectionContext = {
  applyUrl: string;
  whatsappUrl: string;
  supportPhone: string;
  reduceMotion: boolean;
};

export function useDprMotion() {
  const reduceMotion = useReducedMotion();
  return {
    reduceMotion: Boolean(reduceMotion),
    variants: reduceMotion ? staticVariants : cardReveal,
    initial: reduceMotion ? false : "hidden",
    whileInView: reduceMotion ? undefined : "visible",
    viewport: { once: true, margin: "-80px" as const },
  };
}

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.705 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function SectionShell({
  section,
  id,
  className = "",
  children,
  altBg = false,
}: {
  section: DprSection;
  id?: string;
  className?: string;
  children: React.ReactNode;
  altBg?: boolean;
}) {
  const motionProps = useDprMotion();
  return (
    <section
      id={id ?? section.sectionKey}
      className={`py-16 md:py-20 ${altBg ? "bg-slate-50/60" : "bg-white"} ${className}`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <motion.div
          variants={motionProps.variants}
          initial={motionProps.initial}
          whileInView={motionProps.whileInView}
          viewport={motionProps.viewport}
          className="space-y-10 md:space-y-12"
        >
          {(section.heading || section.description) && (
            <div className="max-w-3xl mx-auto text-center space-y-3">
              {section.heading && (
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 tracking-tight">
                  {section.heading}
                </h2>
              )}
              {section.description && (
                <p className="text-slate-500 text-base md:text-lg leading-relaxed">{section.description}</p>
              )}
            </div>
          )}
          {children}
        </motion.div>
      </div>
    </section>
  );
}

export function GlassCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-[22px] border border-slate-100/80 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgba(15,23,42,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionBanners({
  banners,
  lazy = true,
}: {
  banners: DprBanner[];
  lazy?: boolean;
}) {
  if (!banners.length) return null;
  return (
    <div className="space-y-4 mb-8 md:mb-10">
      {banners.map((banner) => (
        <BannerBlock key={banner.id} banner={banner} lazy={lazy} />
      ))}
    </div>
  );
}

function BannerBlock({ banner, lazy }: { banner: DprBanner; lazy: boolean }) {
  const href = banner.buttonUrl || undefined;
  const content = (
    <div className="relative w-full overflow-hidden rounded-[24px] border border-slate-100 shadow-[0_12px_40px_rgba(15,23,42,0.06)] aspect-[7/3] md:aspect-[21/6]">
      <Image
        src={banner.mobileImageUrl || banner.imageUrl}
        alt={banner.altText || banner.title || "DPR service banner"}
        fill
        className="object-cover md:hidden"
        sizes="(max-width: 768px) 100vw, 0px"
        loading={lazy ? "lazy" : undefined}
        priority={!lazy}
      />
      <Image
        src={banner.imageUrl}
        alt={banner.altText || banner.title || "DPR service banner"}
        fill
        className="object-cover hidden md:block"
        sizes="(min-width: 768px) 100vw, 0px"
        loading={lazy ? "lazy" : undefined}
        priority={!lazy}
      />
      {(banner.title || banner.description || banner.buttonText) && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/50 via-slate-900/20 to-transparent flex items-end p-5 md:p-8">
          <div className="max-w-lg space-y-2 text-white">
            {banner.title && <p className="text-lg md:text-xl font-bold">{banner.title}</p>}
            {banner.description && <p className="text-sm text-white/85">{banner.description}</p>}
            {banner.buttonText && (
              <span className="inline-flex mt-2 px-4 py-2 rounded-full bg-white/95 text-slate-900 text-sm font-semibold">
                {banner.buttonText}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block group">
        {content}
      </Link>
    );
  }
  return content;
}

export function Counter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!isInView) return;
    const end = value;
    const steps = 50;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = progress * (2 - progress);
      const next = end * eased;
      setCount(decimals > 0 ? Number(next.toFixed(decimals)) : Math.floor(next));
      if (step >= steps) {
        clearInterval(timer);
        setCount(end);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [isInView, value, decimals]);

  const display = decimals > 0 ? count.toFixed(decimals) : count;
  return (
    <span ref={ref} className="font-heading font-bold tabular-nums">
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

export function CtaButton({
  href,
  label,
  variant = "primary",
  className = "",
}: {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const base =
    "inline-flex h-11 md:h-12 items-center justify-center gap-2 px-6 md:px-8 rounded-full font-semibold text-[15px] transition-all duration-200 active:scale-[0.99]";
  const styles =
    variant === "primary"
      ? "bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-500/15"
      : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700";
  return (
    <Link href={href} className={`${base} ${styles} ${className}`}>
      {label}
    </Link>
  );
}
