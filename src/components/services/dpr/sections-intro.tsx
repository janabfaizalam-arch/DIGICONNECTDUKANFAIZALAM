"use client";

import Link from "next/link";
import { m } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Landmark,
  Lock,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from "lucide-react";

import { BrandWash } from "@/components/homepage/brand-backdrop";
import { DPR_LAUNCH_PRICE } from "@/lib/dpr/constants";
import type { DprBanner, DprSection } from "@/lib/dpr/types";
import {
  CtaButton,
  DprIcon,
  GlassCard,
  SectionBanners,
  SectionShell,
  type DprSectionContext,
} from "./shared";

type IntroProps = {
  section: DprSection;
  ctx: DprSectionContext;
  banners: DprBanner[];
  launchPrice?: number;
  videoUrl?: string | null;
};

/* ─────────────────────────────────────────────────────────────────────────
   Hero
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The page opener.
 *
 * Built on the same dark brand field as the homepage hero — the logo's blue
 * ramp, the jaali lattice, a flame orb — so a customer arriving here from the
 * services directory lands somewhere that plainly belongs to the same site.
 * The right-hand card is a preview of the artefact being sold: the document,
 * with its actual chapter names.
 */
export function DprHeroSection({ section, ctx, banners, launchPrice = DPR_LAUNCH_PRICE }: IntroProps) {
  const ctaLabel = section.ctaLabel || "Apply now";
  const ctaUrl = section.ctaUrl || ctx.applyUrl;

  const chapters = [
    { icon: FileText, title: "Cost of project & means of finance", sub: "The table the branch reads first" },
    { icon: TrendingUp, title: "Three-year projections", sub: "Sales, profit and repayment capacity" },
    { icon: BadgeCheck, title: "Scheme annexures", sub: "Aligned to PMEGP, Mudra and CM Yuva" },
  ];

  return (
    <section
      id="hero"
      className="dc-ambient relative isolate overflow-hidden text-white"
      style={{ background: "var(--dc-grad-blue)" }}
    >
      <div className="dc-ambient-layer" aria-hidden="true">
        <div className="dc-jaali absolute inset-0 opacity-[0.07]" />
        <div className="dc-orb dc-orb-flame lg-drift-slow -right-[14%] -top-[36%] h-[36rem] w-[36rem] opacity-55" />
      </div>

      <div className="relative mx-auto w-full max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] py-10 sm:px-6 sm:py-16 md:px-8 lg:py-20">
        <SectionBanners banners={banners} lazy={false} />

        <div className="grid items-center gap-9 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-white/55">
                <li>
                  <Link href="/" className="transition hover:text-white">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/services" className="transition hover:text-white">
                    Services
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-white/80">Detailed Project Report</li>
              </ol>
            </nav>

            <m.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg-pill-dark lg-raise-dark inline-flex max-w-full items-center gap-2 py-1.5 pl-2 pr-4 text-[11px] font-bold sm:text-xs"
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--dc-grad-flame)" }}
              >
                <Landmark className="h-3 w-3 text-white" aria-hidden="true" />
              </span>
              <span className="truncate">Bank-ready DPR for PMEGP, Mudra, CM Yuva &amp; MSME</span>
            </m.span>

            <m.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="mt-4 text-balance text-[1.95rem] font-extrabold leading-[1.06] tracking-[-0.028em] sm:mt-6 sm:text-[3rem] lg:text-[3.6rem]"
            >
              {section.heading || "Detailed Project Report"}
            </m.h1>

            {section.description ? (
              <m.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.14 }}
                className="mt-3 max-w-[56ch] text-pretty text-[13.5px] font-medium leading-[1.6] text-white/72 sm:mt-5 sm:text-[17px]"
              >
                {section.description}
              </m.p>
            ) : null}

            <m.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="lg-card-dark mt-5 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[1.25rem] px-4 py-3 sm:mt-7"
            >
              <span className="text-[1.6rem] font-extrabold leading-none sm:text-[2rem]">
                ₹{launchPrice.toLocaleString("en-IN")}
              </span>
              <span className="text-[13px] font-bold text-white/45 line-through">₹999</span>
              <span
                className="rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-white"
                style={{ background: "var(--dc-grad-flame)" }}
              >
                Launch offer
              </span>
              <span className="w-full text-[12px] font-medium text-white/60">
                Scheme-aligned report, delivered through your portal
              </span>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.26 }}
              className="mt-5 flex flex-row gap-2 sm:mt-8 sm:gap-3"
            >
              <CtaButton href={ctaUrl} label={ctaLabel} variant="primary" className="flex-1 sm:flex-none" />
              <CtaButton
                href={ctx.whatsappUrl}
                label="Talk to an expert"
                variant="ghostDark"
                external
                className="flex-1 whitespace-nowrap sm:flex-none"
              />
            </m.div>
          </div>

          {/* The document, previewed. */}
          <div className="lg:col-span-5">
            <m.div
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="lg-card-dark mx-auto flex w-full max-w-[420px] flex-col gap-4 rounded-[1.6rem] p-4 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/12 pb-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-extrabold text-white"
                    style={{ background: "var(--dc-grad-flame)" }}
                  >
                    DPR
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/45">
                      Loan-ready
                    </span>
                    <span className="block truncate text-[13px] font-bold">Project Report</span>
                  </span>
                </div>
                <span className="lg-pill-dark shrink-0 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/75">
                  Draft
                </span>
              </div>

              <ul className="space-y-2.5">
                {chapters.map((chapter, index) => (
                  <m.li
                    key={chapter.title}
                    animate={ctx.reduceMotion ? undefined : { y: [0, index % 2 === 0 ? -3 : 3, 0] }}
                    transition={
                      ctx.reduceMotion
                        ? undefined
                        : { repeat: Infinity, duration: 4 + index, ease: "easeInOut" }
                    }
                    className="flex items-center gap-3 rounded-[1.1rem] bg-white/[0.07] p-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[var(--dc-amber)]">
                      <chapter.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-bold leading-tight">{chapter.title}</span>
                      <span className="block text-[11px] font-medium leading-tight text-white/55">{chapter.sub}</span>
                    </span>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--dc-amber)]" aria-hidden="true" />
                  </m.li>
                ))}
              </ul>

              <p className="flex items-center justify-between gap-2 border-t border-white/12 pt-3 text-[10.5px] font-bold text-white/45">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3 w-3" aria-hidden="true" /> Secure document handling
                </span>
                <span className="text-white/70">DigiConnect Dukan</span>
              </p>
            </m.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Trust rail
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The strip directly under the hero.
 *
 * Statements about how the service works, not borrowed credibility: no press
 * logos, no awards, no counter. Each one is something a customer can hold the
 * company to.
 */
export function DprTrustSection({ section }: { section: DprSection }) {
  const items = [
    { icon: Landmark, label: "Scheme-aware drafting" },
    { icon: UserCheck, label: "Expert document review" },
    { icon: ShieldCheck, label: "Secure uploads & payments" },
    { icon: Clock, label: "24–72 hour turnaround" },
    { icon: Building2, label: "PAN India partner network" },
    { icon: BadgeCheck, label: "Transparent launch pricing" },
  ];

  return (
    <section
      id="trust"
      aria-label={section.heading || "Why customers choose this service"}
      className="dc-ambient relative overflow-hidden bg-[var(--dc-sky-soft)] px-[var(--mobile-page-gutter)] py-4 sm:px-6 sm:py-5 md:px-8"
    >
      <BrandWash variant="dual" />
      <ul className="relative mx-auto grid max-w-[var(--dc-max)] grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-5 sm:gap-y-3">
        {items.map((item) => (
          <li
            key={item.label}
            className="lg-card flex min-h-11 items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-bold text-[var(--dc-ink)] sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-[13px] sm:shadow-none sm:backdrop-blur-none"
          >
            <item.icon className="h-4 w-4 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
            <span className="min-w-0">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   What a DPR is
   ───────────────────────────────────────────────────────────────────────── */

export function DprWhatIsSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  const points = [
    {
      title: "The document the bank actually asks for",
      detail:
        "Branches and departments will not move a subsidy-linked file without a project report in their own format. This is that document.",
    },
    {
      title: "Your idea, written as numbers",
      detail:
        "Cost of project, means of finance, machinery schedule and three-year projections — the four tables an appraisal officer turns to first.",
    },
    {
      title: "Annexures matched to your scheme",
      detail:
        "PMEGP, Mudra, CM Yuva and PM Vishwakarma each expect different supporting notes. The report is drafted against the one you name.",
    },
    {
      title: "Fewer rounds of rework",
      detail:
        "A complete file moves. Most delays customers report are a missing table or an unexplained cost, both of which are handled before submission.",
    },
  ];

  return (
    <SectionShell section={section} surface="sky" center={false}>
      <SectionBanners banners={banners} />
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <GlassCard className="p-5 sm:p-7 lg:col-span-5" interactive={false}>
          <DprIcon tone="flame">
            <FileText className="h-[18px] w-[18px]" aria-hidden="true" />
          </DprIcon>
          <p className="mt-4 text-[14px] font-medium leading-[1.65] text-[var(--dc-body)] sm:text-[15px]">
            A Detailed Project Report is the structured business case a lender reads before approving a
            PMEGP, Mudra, CM Yuva or MSME-linked loan. It turns a plan — a unit, a machine list, a rough
            idea of turnover — into the costed, projected, annexure-backed document a credit officer can
            sign off on.
          </p>
          <p className="mt-3 text-[13.5px] font-medium leading-[1.65] text-[var(--dc-muted)] sm:text-[14.5px]">
            It is not a formality. It is the difference between a file that is appraised and a file that
            is returned.
          </p>
        </GlassCard>

        <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-2">
          {points.map((point) => (
            <li key={point.title}>
              <GlassCard className="h-full p-4 sm:p-5">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--dc-flame)]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <h3 className="text-[13.5px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[14.5px]">
                      {point.title}
                    </h3>
                    <p className="mt-1.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13.5px]">
                      {point.detail}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Video
   ───────────────────────────────────────────────────────────────────────── */

export function DprVideoSection({ section, ctx, banners, videoUrl }: IntroProps) {
  const embedUrl = videoUrl ? toEmbedUrl(videoUrl) : null;

  // Nothing to show and nothing to promise: the band is skipped entirely
  // rather than printing a "coming soon" placeholder on a sales page.
  if (!embedUrl) return null;

  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="mx-auto max-w-4xl">
        <GlassCard className="aspect-video" interactive={false}>
          <iframe
            src={embedUrl}
            title={section.heading || "How your DPR is prepared"}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </GlassCard>
        <p className="mt-4 text-center text-[13px] font-medium text-[var(--dc-muted)]">
          Prefer to ask directly?{" "}
          <a
            href={ctx.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-[var(--dc-blue-mid)] hover:underline"
          >
            Message us on WhatsApp <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </p>
      </div>
    </SectionShell>
  );
}

function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return url;
  } catch {
    return null;
  }
}
