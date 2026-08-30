"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Factory,
  FileSignature,
  FileText,
  GraduationCap,
  HardHat,
  Landmark,
  Layers,
  Lock,
  MessageCircle,
  Minus,
  Monitor,
  Phone,
  Quote,
  ShieldCheck,
  Sprout,
  Stethoscope,
  UserCheck,
  Wheat,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

import { BrandWash } from "@/components/homepage/brand-backdrop";
import {
  ServiceCard,
  ServiceCounter,
  ServiceCta,
  ServiceIcon,
  ServiceSection,
  WhatsAppIcon,
} from "@/components/services/shell";
import {
  COMMON_REJECTIONS,
  COMPARISON_ROWS,
  COMPLIANCE_NOTE,
  DOCUMENTS_FOR_FILING,
  DOCUMENTS_TO_START,
  ELIGIBILITY,
  ELIGIBLE_SECTORS,
  FAQS,
  PROCESS_STAGES,
  RELATED_SERVICES,
  SCHEME_STATS,
  TRUST_BADGES,
  TRUST_POINTS,
  WHAT_WE_DO,
  type SectorIconKey,
} from "@/lib/cm-yuva/content";

export type CmYuvaCtx = {
  applyUrl: string;
  whatsappUrl: string;
  supportPhone: string;
};

export type CmYuvaArticle = {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  imageUrl: string | null;
};

const SECTOR_ICONS: Record<SectorIconKey, LucideIcon> = {
  factory: Factory,
  layers: Layers,
  wheat: Wheat,
  wrench: Wrench,
  activity: Activity,
  hardHat: HardHat,
  monitor: Monitor,
  stethoscope: Stethoscope,
  graduation: GraduationCap,
  sprout: Sprout,
  boxes: Boxes,
  briefcase: Briefcase,
};

const TRUST_ICONS: LucideIcon[] = [Lock, FileSignature, UserCheck, Briefcase, MessageCircle, BadgeCheck];
const WHAT_WE_DO_ICONS: LucideIcon[] = [
  FileText,
  BadgeCheck,
  ClipboardList,
  Landmark,
  Building2,
  MessageCircle,
];
const BADGE_ICONS: LucideIcon[] = [Lock, ShieldCheck, ClipboardList, Building2, BadgeCheck];

/* ─────────────────────────────────────────────────────────────────────────
   Hero
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaHero({
  ctx,
  terms,
  logo,
  poster,
}: {
  ctx: CmYuvaCtx;
  terms: readonly { label: string; value: string; note: string }[];
  logo: string;
  poster: string;
}) {
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
            <li className="text-white/80">CM YUVA</li>
          </ol>
        </nav>

        <div className="grid items-center gap-9 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center gap-2.5"
            >
              {/* The scheme's own mark sits on white.
                  The artwork is dark red and navy on a light ground, so the
                  glass plate the rest of the hero uses turned it into an
                  unreadable smudge. A government mark is not ours to restyle. */}
              <span className="relative flex h-11 w-[5.5rem] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-[0_8px_18px_-10px_rgba(0,10,40,0.8)]">
                <Image
                  src={logo}
                  alt="CM YUVA"
                  fill
                  sizes="88px"
                  priority
                  className="object-contain p-1.5"
                />
              </span>
              <span className="lg-pill-dark lg-raise-dark inline-flex items-center gap-2 py-1.5 pl-2 pr-4 text-[11px] font-bold sm:text-xs">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--dc-grad-flame)" }}
                >
                  <Award className="h-3 w-3 text-white" aria-hidden="true" />
                </span>
                Uttar Pradesh government scheme
              </span>
            </m.div>

            <m.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="mt-4 text-balance text-[1.95rem] font-extrabold leading-[1.06] tracking-[-0.028em] sm:mt-6 sm:text-[3rem] lg:text-[3.5rem]"
            >
              CM YUVA business loan, filed properly
            </m.h1>

            <m.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.14 }}
              className="mt-3 max-w-[58ch] text-pretty text-[13.5px] font-medium leading-[1.6] text-white/72 sm:mt-5 sm:text-[17px]"
            >
              Project report, MSME registration, document checking and the portal submission — handled end
              to end, so your file reaches the bank in the shape a credit officer expects.
            </m.p>

            {/* The scheme's four headline terms. */}
            <m.ul
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mt-5 grid grid-cols-2 gap-2 sm:mt-7 sm:gap-2.5"
            >
              {terms.map((term) => (
                <li key={term.label} className="lg-card-dark rounded-[1.1rem] px-3 py-2.5">
                  <span className="block text-[1.05rem] font-extrabold leading-none sm:text-[1.35rem]">
                    {term.value}
                  </span>
                  <span className="mt-1 block text-[10.5px] font-bold leading-tight text-white/55 sm:text-[11.5px]">
                    {term.label}
                  </span>
                </li>
              ))}
            </m.ul>

            <m.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.26 }}
              className="mt-5 flex flex-row gap-2 sm:mt-8 sm:gap-3"
            >
              <ServiceCta href={ctx.applyUrl} label="Apply now" variant="primary" className="flex-1 sm:flex-none" />
              <ServiceCta
                href={ctx.whatsappUrl}
                label="Ask an advisor"
                variant="ghostDark"
                external
                className="flex-1 whitespace-nowrap sm:flex-none"
              />
            </m.div>

            <p className="mt-4 text-[11.5px] font-medium leading-snug text-white/50">
              Approval is the bank&rsquo;s decision, not ours. What we guarantee is the paperwork.
            </p>
          </div>

          <div className="lg:col-span-5">
            <m.div
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="lg-card-dark mx-auto w-full max-w-[440px] overflow-hidden rounded-[1.6rem]"
            >
              <span className="relative block aspect-[4/3] w-full">
                <Image
                  src={poster}
                  alt="CM YUVA entrepreneur loan scheme"
                  fill
                  priority
                  sizes="(min-width: 1024px) 440px, 92vw"
                  className="object-cover"
                />
              </span>
              <ul className="space-y-2 p-4">
                {terms.slice(2).map((term) => (
                  <li key={term.label} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dc-amber)]"
                      aria-hidden="true"
                    />
                    <span className="text-[11.5px] font-medium leading-snug text-white/70">
                      <strong className="font-extrabold text-white">{term.value}</strong> — {term.note}
                    </span>
                  </li>
                ))}
              </ul>
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

export function CmYuvaTrustRail() {
  const items = [
    { icon: Landmark, label: "UP government scheme" },
    { icon: FileSignature, label: "Project report included" },
    { icon: BadgeCheck, label: "MSME filing included" },
    { icon: Building2, label: "DIC follow-up" },
    { icon: Lock, label: "Encrypted uploads" },
    { icon: MessageCircle, label: "WhatsApp status" },
  ];

  return (
    <section
      aria-label="What this service covers"
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
   About the scheme
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaAbout({
  terms,
  posters,
}: {
  terms: readonly { label: string; value: string; note: string }[];
  posters: { interestFree: string; subsidy: string };
}) {
  return (
    <ServiceSection
      id="about"
      surface="sky"
      center={false}
      eyebrow="The scheme"
      title="What CM YUVA actually offers"
      description="Mukhyamantri Yuva Udyami Vikas Abhiyan is Uttar Pradesh's scheme for first-time entrepreneurs. Here is what the terms mean in practice."
    >
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-7">
          <ul className="grid gap-3 sm:grid-cols-2">
            {terms.map((term, index) => (
              <li key={term.label}>
                <ServiceCard className="h-full p-4 sm:p-5">
                  <ServiceIcon tone={index % 2 === 0 ? "blue" : "flame"}>
                    <Award className="h-[18px] w-[18px]" aria-hidden="true" />
                  </ServiceIcon>
                  <p className="mt-3.5 text-[1.35rem] font-extrabold leading-none text-[var(--dc-ink)] sm:text-[1.6rem]">
                    {term.value}
                  </p>
                  <h3 className="mt-1.5 text-[13px] font-extrabold text-[var(--dc-ink)] sm:text-[14px]">
                    {term.label}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13px]">
                    {term.note}
                  </p>
                </ServiceCard>
              </li>
            ))}
          </ul>

          {/* The one thing people misread about this scheme. */}
          <ServiceCard className="mt-3 flex items-start gap-3 p-4 sm:mt-4 sm:p-5" interactive={false}>
            <AlertTriangle
              className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--dc-flame)]"
              aria-hidden="true"
            />
            <p className="text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13.5px]">
              <strong className="font-extrabold text-[var(--dc-ink)]">
                &ldquo;Interest-free&rdquo; means subvention, not a zero-interest loan.
              </strong>{" "}
              You repay the EMI to the bank as normal and the state credits the interest back to your
              account when repayment is prompt. Miss instalments and that reimbursement is what you lose.
            </p>
          </ServiceCard>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          <figure className="lg-card overflow-hidden">
            <span className="relative block aspect-[4/3] w-full">
              <Image
                src={posters.interestFree}
                alt="CM YUVA interest subvention explained"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                loading="lazy"
              />
            </span>
          </figure>
          <figure className="lg-card overflow-hidden">
            <span className="relative block aspect-[4/3] w-full">
              <Image
                src={posters.subsidy}
                alt="CM YUVA margin money subsidy explained"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                loading="lazy"
              />
            </span>
          </figure>
        </div>
      </div>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Eligibility
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaEligibility({ ctx }: { ctx: CmYuvaCtx }) {
  return (
    <ServiceSection
      id="eligibility"
      eyebrow="Before you apply"
      title="Check yourself against these six"
      description="Every one has to be true. If you are unsure about any of them, ask before paying — we would rather tell you no than take a fee for a file that cannot pass."
    >
      <ul className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {ELIGIBILITY.map((item) => (
          <li key={item.title}>
            <ServiceCard className="h-full p-4 sm:p-5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--dc-flame)]"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[14.5px]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13px]">
                    {item.detail}
                  </p>
                </div>
              </div>
            </ServiceCard>
          </li>
        ))}
      </ul>

      <div className="mt-5 text-center">
        <ServiceCta href={ctx.whatsappUrl} label="Not sure? Ask first" variant="ghost" icon={false} external />
      </div>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Eligible sectors
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaSectors() {
  return (
    <ServiceSection
      id="sectors"
      surface="sky"
      eyebrow="Sector rules"
      title="Twelve activities the scheme funds"
      description="Manufacturing and service enterprises qualify. Pure retail trading does not, however the shop is described on the form."
    >
      <ul className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {ELIGIBLE_SECTORS.map((sector, index) => {
          const Icon = SECTOR_ICONS[sector.icon];
          return (
            <li key={sector.title}>
              <ServiceCard className="h-full p-3.5 sm:p-4">
                <ServiceIcon tone={index % 4 === 0 ? "flame" : "blue"} className="h-9 w-9 sm:h-10 sm:w-10">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </ServiceIcon>
                <h3 className="mt-3 text-[13px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[14px]">
                  {sector.title}
                </h3>
                <p className="mt-1 text-[11.5px] font-medium leading-[1.55] text-[var(--dc-body)] sm:text-[12.5px]">
                  {sector.detail}
                </p>
              </ServiceCard>
            </li>
          );
        })}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   What DigiConnect does
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaWhatWeDo() {
  return (
    <ServiceSection
      id="what-we-do"
      eyebrow="The service"
      title="What you are paying for"
      description="Six pieces of work, all of them before the file leaves our hands."
    >
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {WHAT_WE_DO.map((item, index) => {
          const Icon = WHAT_WE_DO_ICONS[index % WHAT_WE_DO_ICONS.length];
          return (
            <li key={item.title}>
              <ServiceCard className="h-full p-4 sm:p-5">
                <ServiceIcon tone={index === 0 ? "flame" : "blue"}>
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </ServiceIcon>
                <h3 className="mt-3.5 text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[15px]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13.5px]">
                  {item.detail}
                </p>
              </ServiceCard>
            </li>
          );
        })}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Documents
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaDocuments() {
  return (
    <ServiceSection
      id="documents"
      surface="sky"
      center={false}
      eyebrow="Paperwork"
      title="What to keep ready"
      description="Four to start. The rest are needed before the file is submitted, and we will tell you when."
    >
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-5">
          <h3 className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-flame)]">
            To begin
          </h3>
          <ul className="mt-3 grid gap-2.5">
            {DOCUMENTS_TO_START.map((doc, index) => (
              <li key={doc.title}>
                <ServiceCard className="flex items-center gap-3 p-3.5 sm:p-4">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-extrabold text-white"
                    style={{ background: "var(--dc-grad-blue)" }}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-extrabold text-[var(--dc-ink)] sm:text-[14px]">
                      {doc.title}
                    </span>
                    <span className="block text-[11.5px] font-medium leading-snug text-[var(--dc-body)] sm:text-[12.5px]">
                      {doc.detail}
                    </span>
                  </span>
                </ServiceCard>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-7">
          <h3 className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-blue-mid)]">
            Before submission
          </h3>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {DOCUMENTS_FOR_FILING.map((doc) => (
              <li key={doc}>
                <ServiceCard className="flex h-full items-center gap-2.5 p-3.5">
                  <ClipboardList
                    className="h-[17px] w-[17px] shrink-0 text-[var(--dc-blue-mid)]"
                    aria-hidden="true"
                  />
                  <span className="text-[12.5px] font-bold leading-snug text-[var(--dc-ink)] sm:text-[13px]">
                    {doc}
                  </span>
                </ServiceCard>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Process
   ───────────────────────────────────────────────────────────────────────── */

const OWNER_TONE: Record<string, string> = {
  DigiConnect: "var(--dc-grad-flame)",
  Department: "var(--dc-grad-blue)",
  Bank: "var(--dc-grad-blue)",
};

/**
 * The ten stages, with who is acting at each.
 *
 * The honest shape of a progress tracker on a public page: it shows the route,
 * and it is explicit that DigiConnect controls the first six and nothing after
 * them. The earlier version hardcoded Completed / In Progress badges, so every
 * visitor saw fake progress on an application they had not made.
 */
export function CmYuvaProcess() {
  return (
    <ServiceSection
      id="process"
      eyebrow="The route"
      title="Ten stages, and who moves each one"
      description="We control the first six. The last four are the department's and the bank's — we follow up, but we do not decide."
    >
      <ol className="mx-auto grid max-w-5xl gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-2">
        {PROCESS_STAGES.map((stage) => (
          <li key={stage.step}>
            <ServiceCard className="flex h-full items-start gap-3 p-4 sm:p-5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white"
                style={{ background: OWNER_TONE[stage.owner] }}
                aria-hidden="true"
              >
                {stage.step}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="text-[13.5px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[14.5px]">
                    {stage.title}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.1em] ${
                      stage.owner === "DigiConnect"
                        ? "bg-[var(--dc-flame)]/10 text-[var(--dc-flame)]"
                        : "bg-black/[0.05] text-[var(--dc-muted)]"
                    }`}
                  >
                    {stage.owner}
                  </span>
                </div>
                <p className="mt-1.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13px]">
                  {stage.detail}
                </p>
              </div>
            </ServiceCard>
          </li>
        ))}
      </ol>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Common rejections
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaRejections() {
  return (
    <ServiceSection
      id="rejections"
      surface="sky"
      eyebrow="Worth knowing"
      title="Three reasons files come back"
      description="All three are avoidable, and all three are checked before your application is submitted."
    >
      <ul className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-3 sm:gap-4">
        {COMMON_REJECTIONS.map((item) => (
          <li key={item.title}>
            <ServiceCard className="h-full p-4 sm:p-5">
              <ServiceIcon tone="flame">
                <AlertTriangle className="h-[18px] w-[18px]" aria-hidden="true" />
              </ServiceIcon>
              <h3 className="mt-3.5 text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[15px]">
                {item.title}
              </h3>
              <p className="mt-1.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13.5px]">
                {item.detail}
              </p>
            </ServiceCard>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pricing
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaPricing({ ctx, price }: { ctx: CmYuvaCtx; price: number }) {
  const included = WHAT_WE_DO.map((item) => item.title);

  return (
    <ServiceSection
      id="pricing"
      eyebrow="Fee"
      title="One amount, paid once"
      description="Everything below is covered. Government and bank charges, where they apply, are paid to them directly and are not ours to collect."
    >
      <div className="mx-auto max-w-2xl">
        <div
          className="overflow-hidden rounded-[var(--lg-radius)] shadow-[0_22px_50px_-24px_rgba(1,36,86,0.85)] ring-1 ring-[var(--dc-amber)]/40"
          style={{ background: "var(--dc-grad-blue)" }}
        >
          <div className="p-5 sm:p-7">
            <span
              className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white"
              style={{ background: "var(--dc-grad-flame)" }}
            >
              Complete assistance
            </span>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="text-[2rem] font-extrabold leading-none text-white sm:text-[2.6rem]">
                ₹{price.toLocaleString("en-IN")}
              </span>
              <span className="text-[12.5px] font-bold text-white/55">one time</span>
            </p>

            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dc-amber)]" aria-hidden="true" />
                  <span className="text-[12.5px] font-medium leading-[1.5] text-white/80">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-row gap-2 sm:gap-3">
              <ServiceCta href={ctx.applyUrl} label="Start my application" variant="primary" className="flex-1" />
              <ServiceCta
                href={ctx.whatsappUrl}
                label="Ask first"
                variant="ghostDark"
                external
                className="shrink-0"
              />
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[12.5px] font-medium text-[var(--dc-muted)]">
          Nothing is charged before you see the summary, and wallet balance can be applied at checkout.
        </p>
      </div>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Comparison
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaComparison() {
  return (
    <ServiceSection
      id="comparison"
      surface="sky"
      eyebrow="Either way"
      title="Assisted filing, or on your own"
      description="Filing it yourself is allowed and free. This is what changes when someone does it with you."
    >
      {/* Phone: one card per row, because a table this wide is a scrollbar
          nobody finds. */}
      <ul className="grid gap-2.5 sm:hidden">
        {COMPARISON_ROWS.map((row) => (
          <li key={row.feature}>
            <ServiceCard className="p-3.5">
              <p className="text-[13px] font-extrabold text-[var(--dc-ink)]">{row.feature}</p>
              <dl className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/70 p-2.5">
                  <dt className="text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--dc-blue-mid)]">
                    With us
                  </dt>
                  <dd className="mt-1 flex items-start gap-1.5 text-[12px] font-bold leading-snug text-[var(--dc-ink)]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
                    {row.digiconnect}
                  </dd>
                </div>
                <div className="rounded-xl bg-black/[0.03] p-2.5">
                  <dt className="text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--dc-muted)]">
                    On your own
                  </dt>
                  <dd className="mt-1 flex items-start gap-1.5 text-[12px] font-medium leading-snug text-[var(--dc-muted)]">
                    <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {row.alone}
                  </dd>
                </div>
              </dl>
            </ServiceCard>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <ServiceCard interactive={false} className="min-w-[640px]">
          <table className="w-full text-left text-[13.5px]">
            <caption className="sr-only">Assisted filing compared with filing alone</caption>
            <thead>
              <tr className="bg-white/70">
                <th scope="col" className="p-4 font-extrabold text-[var(--dc-ink)]">
                  What it involves
                </th>
                <th scope="col" className="p-4 font-extrabold text-[var(--dc-blue-mid)]">
                  With DigiConnect
                </th>
                <th scope="col" className="p-4 font-extrabold text-[var(--dc-muted)]">
                  On your own
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="border-t border-black/5">
                  <th scope="row" className="p-4 text-left font-bold text-[var(--dc-ink)]">
                    {row.feature}
                  </th>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-2 font-bold text-[var(--dc-ink)]">
                      <Check className="h-4 w-4 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
                      {row.digiconnect}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-2 font-medium text-[var(--dc-muted)]">
                      <X className="h-4 w-4 shrink-0 opacity-40" aria-hidden="true" />
                      {row.alone}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ServiceCard>
      </div>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Trust
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaTrust() {
  return (
    <ServiceSection
      id="trust"
      eyebrow="How we work"
      title="Why applicants hand this over"
      description="Six things that are true of every file, and one that is true of none."
    >
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {TRUST_POINTS.map((item, index) => {
          const Icon = TRUST_ICONS[index % TRUST_ICONS.length];
          return (
            <li key={item.title}>
              <ServiceCard className="flex h-full items-start gap-3 p-4 sm:p-5">
                <ServiceIcon tone={index % 3 === 0 ? "flame" : "blue"}>
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </ServiceIcon>
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[14.5px]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13px]">
                    {item.detail}
                  </p>
                </div>
              </ServiceCard>
            </li>
          );
        })}
      </ul>

      {/* The one that is true of none: nobody can promise the sanction. */}
      <ServiceCard className="mt-4 flex items-start gap-3 p-4 sm:p-5" interactive={false}>
        <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--dc-blue-mid)]" aria-hidden="true" />
        <p className="text-[12.5px] font-medium leading-[1.65] text-[var(--dc-body)] sm:text-[13.5px]">
          {COMPLIANCE_NOTE}
        </p>
      </ServiceCard>
    </ServiceSection>
  );
}

export function CmYuvaTrustBadges() {
  return (
    <ServiceSection id="assurances" surface="sky" title="Secure and accountable">
      <ul className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2 sm:gap-3">
        {TRUST_BADGES.map((badge, index) => {
          const Icon = BADGE_ICONS[index % BADGE_ICONS.length];
          return (
            <li key={badge}>
              <span className="lg-pill lg-raise inline-flex min-h-10 items-center gap-2 px-3.5 text-[12px] font-bold text-[var(--dc-ink)] sm:text-[13px]">
                <Icon className="h-4 w-4 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
                {badge}
              </span>
            </li>
          );
        })}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Statistics
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaStats() {
  return (
    <ServiceSection
      id="numbers"
      eyebrow="At a glance"
      title="The scheme in four numbers"
      description="What it lends, what it grants, and how wide it reaches."
    >
      <ul className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {SCHEME_STATS.map((stat, index) => (
          <li key={stat.label}>
            <ServiceCard className="h-full p-4 text-center sm:p-5">
              <ServiceIcon tone={index % 2 === 0 ? "blue" : "flame"} className="mx-auto">
                <Landmark className="h-[18px] w-[18px]" aria-hidden="true" />
              </ServiceIcon>
              <p className="mt-3 text-[1.35rem] font-extrabold leading-none text-[var(--dc-ink)] sm:text-[1.75rem]">
                <ServiceCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </p>
              <p className="mt-1.5 text-[11.5px] font-semibold leading-snug text-[var(--dc-body)] sm:text-[12.5px]">
                {stat.label}
              </p>
            </ServiceCard>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Reviews
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A review, as the service row stores it.
 *
 * There is no rating column behind these, so no stars are drawn. Printing five
 * filled stars beside a quote that carries no score would be inventing the
 * score, which is the thing this page most has to avoid.
 */
export type CmYuvaReview = { name: string; location: string | null; text: string };

/**
 * Customer reviews.
 *
 * Driven entirely by reviews an administrator has entered. With none, the band
 * does not render — an invented testimonial on a page about a government loan
 * is worse than no testimonial, and the earlier version of this page shipped
 * none but did animate four invented counters instead.
 */
export function CmYuvaReviews({ reviews }: { reviews: CmYuvaReview[] }) {
  const [current, setCurrent] = useState(0);
  if (!reviews.length) return null;

  const review = reviews[Math.min(current, reviews.length - 1)];

  return (
    <ServiceSection id="reviews" surface="sky" eyebrow="In their words" title="Customer reviews">
      <div className="mx-auto max-w-3xl">
        <ServiceCard className="p-5 sm:p-8" interactive={false}>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
            style={{ background: "var(--dc-grad-flame)" }}
          >
            <Quote className="h-4 w-4" aria-hidden="true" />
          </span>

          <AnimatePresence mode="wait">
            <m.blockquote
              key={`${review.name}-${current}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <p className="mt-4 text-[14.5px] font-medium leading-[1.65] text-[var(--dc-ink)] sm:text-[17px]">
                {review.text}
              </p>
              <footer className="mt-5 flex items-center gap-3 border-t border-black/5 pt-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold text-white"
                  style={{ background: "var(--dc-grad-blue)" }}
                  aria-hidden="true"
                >
                  {review.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <cite className="block truncate text-[13.5px] font-extrabold not-italic text-[var(--dc-ink)]">
                    {review.name}
                  </cite>
                  {review.location ? (
                    <span className="block truncate text-[12px] font-medium text-[var(--dc-muted)]">
                      {review.location}
                    </span>
                  ) : null}
                </span>
              </footer>
            </m.blockquote>
          </AnimatePresence>

          {reviews.length > 1 ? (
            <div className="mt-5 flex gap-1.5">
              {reviews.map((item, index) => (
                <button
                  key={`${item.name}-${index}`}
                  type="button"
                  onClick={() => setCurrent(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === current ? "w-6 bg-[var(--dc-flame)]" : "w-2 bg-black/12"
                  }`}
                  aria-label={`Show review ${index + 1} of ${reviews.length}`}
                  aria-current={index === current}
                />
              ))}
            </div>
          ) : null}
        </ServiceCard>
      </div>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Articles
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaArticles({ articles }: { articles: CmYuvaArticle[] }) {
  if (!articles.length) return null;

  return (
    <ServiceSection
      id="guides"
      center={false}
      eyebrow="Read more"
      title="Guides & articles"
      description="Longer reads on the scheme, project costings and what a branch looks for in a loan file."
    >
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link href={`/blog/${article.slug}`} className="group block h-full focus-visible:outline-none">
              <ServiceCard className="flex h-full flex-col">
                {article.imageUrl ? (
                  <span className="relative block aspect-[16/9] w-full overflow-hidden">
                    <Image
                      src={article.imageUrl}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      loading="lazy"
                    />
                  </span>
                ) : (
                  <span
                    className="flex aspect-[16/9] w-full items-center justify-center"
                    style={{ background: "var(--dc-grad-blue)" }}
                    aria-hidden="true"
                  >
                    <BookOpen className="h-8 w-8 text-white/70" />
                  </span>
                )}

                <span className="flex flex-1 flex-col p-4 sm:p-5">
                  {article.category ? (
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-flame)]">
                      {article.category}
                    </span>
                  ) : null}
                  <h3 className="mt-1.5 line-clamp-2 text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] transition-colors group-hover:text-[var(--dc-blue-mid)] sm:text-[15px]">
                    {article.title}
                  </h3>
                  {article.excerpt ? (
                    <p className="mt-1.5 line-clamp-3 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13px]">
                      {article.excerpt}
                    </p>
                  ) : null}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-3.5 text-[12.5px] font-extrabold text-[var(--dc-blue-mid)]">
                    Read the guide
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </ServiceCard>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-5 text-center">
        <ServiceCta href="/blog" label="All guides & articles" variant="ghost" icon={false} />
      </div>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   FAQ
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <ServiceSection
      id="faq"
      surface="sky"
      eyebrow="Answers"
      title="Frequently asked questions"
      description="Twenty of them, including the ones people are reluctant to ask."
    >
      <ul className="mx-auto max-w-3xl space-y-2.5">
        {FAQS.map((faq, index) => {
          const isOpen = openIndex === index;
          const panelId = `cm-yuva-faq-panel-${index}`;
          const buttonId = `cm-yuva-faq-button-${index}`;
          return (
            <li key={faq.question}>
              <ServiceCard interactive={false}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left text-[13.5px] font-extrabold text-[var(--dc-ink)] transition-colors hover:text-[var(--dc-blue-mid)] sm:p-5 sm:text-[15px]"
                  >
                    <span className="min-w-0">{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[var(--dc-muted)] transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-[var(--dc-flame)]" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <m.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-black/5 px-4 pb-4 pt-3.5 text-[12.5px] font-medium leading-[1.65] text-[var(--dc-body)] sm:px-5 sm:pb-5 sm:text-[13.5px]">
                        {faq.answer}
                      </p>
                    </m.div>
                  ) : null}
                </AnimatePresence>
              </ServiceCard>
            </li>
          );
        })}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Closing CTA
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaCta({ ctx, price }: { ctx: CmYuvaCtx; price: number }) {
  return (
    <section
      id="cta"
      className="dc-ambient relative overflow-hidden px-[var(--mobile-page-gutter)] py-8 sm:px-6 sm:py-14 md:px-8 md:py-20"
      style={{ background: "var(--dc-grad-blue)" }}
      aria-labelledby="cm-yuva-cta-heading"
    >
      <div className="dc-ambient-layer" aria-hidden="true">
        <div className="dc-jaali absolute inset-0 opacity-[0.06]" />
        <div className="dc-orb dc-orb-flame lg-drift-slow -left-[10%] -top-[40%] h-[30rem] w-[30rem] opacity-50" />
      </div>

      <div className="relative mx-auto w-full max-w-[var(--dc-max)] text-center text-white">
        <h2
          id="cm-yuva-cta-heading"
          className="mx-auto max-w-[20ch] text-balance text-[1.35rem] font-extrabold leading-[1.15] tracking-[-0.025em] sm:text-[2rem] md:text-[2.3rem]"
        >
          Start your CM YUVA file today
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-[13.5px] font-medium leading-[1.6] text-white/72 sm:mt-3 sm:text-[15.5px]">
          The form saves as you go, so you can begin without every document in hand.
        </p>

        <div className="mt-5 flex flex-row justify-center gap-2 sm:mt-7 sm:gap-3">
          <ServiceCta href={ctx.applyUrl} label="Apply now" variant="primary" className="flex-1 sm:flex-none" />
          <ServiceCta
            href={ctx.whatsappUrl}
            label="WhatsApp"
            variant="ghostDark"
            external
            className="flex-1 sm:flex-none"
          />
        </div>

        <p className="mt-4 text-[12px] font-semibold text-white/55">
          ₹{price.toLocaleString("en-IN")} one time · secure payment · tracked in your portal
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Related & contact
   ───────────────────────────────────────────────────────────────────────── */

export function CmYuvaRelated() {
  return (
    <ServiceSection id="related" surface="sky" center={false} title="Related services">
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {RELATED_SERVICES.map((item) => (
          <li key={item.slug}>
            <Link href={`/services/${item.slug}`} className="group block h-full focus-visible:outline-none">
              <ServiceCard className="flex h-full flex-col p-4 sm:p-5">
                <h3 className="text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] transition-colors group-hover:text-[var(--dc-blue-mid)] sm:text-[15px]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13.5px]">
                  {item.detail}
                </p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-3.5 text-[12.5px] font-extrabold text-[var(--dc-blue-mid)]">
                  View service
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </ServiceCard>
            </Link>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}

export function CmYuvaContact({ ctx }: { ctx: CmYuvaCtx }) {
  return (
    <ServiceSection id="contact" title="Talk to an advisor" description="Before you pay, or at any point after.">
      <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2 sm:gap-4">
        <a href={ctx.whatsappUrl} target="_blank" rel="noopener noreferrer" className="group block">
          <ServiceCard className="flex h-full items-center gap-3.5 p-4 sm:p-5">
            <ServiceIcon tone="flame">
              <WhatsAppIcon className="h-[18px] w-[18px]" />
            </ServiceIcon>
            <span className="min-w-0">
              <span className="block text-[14px] font-extrabold text-[var(--dc-ink)] transition-colors group-hover:text-[var(--dc-blue-mid)] sm:text-[15px]">
                WhatsApp an advisor
              </span>
              <span className="block text-[12.5px] font-medium text-[var(--dc-body)]">
                Eligibility and sector questions, in your language
              </span>
            </span>
          </ServiceCard>
        </a>

        <a href={`tel:${ctx.supportPhone}`} className="group block">
          <ServiceCard className="flex h-full items-center gap-3.5 p-4 sm:p-5">
            <ServiceIcon>
              <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
            </ServiceIcon>
            <span className="min-w-0">
              <span className="block text-[14px] font-extrabold text-[var(--dc-ink)] transition-colors group-hover:text-[var(--dc-blue-mid)] sm:text-[15px]">
                Call the team
              </span>
              <span className="block truncate text-[12.5px] font-medium text-[var(--dc-body)]">
                {ctx.supportPhone}
              </span>
            </span>
          </ServiceCard>
        </a>
      </div>
    </ServiceSection>
  );
}
