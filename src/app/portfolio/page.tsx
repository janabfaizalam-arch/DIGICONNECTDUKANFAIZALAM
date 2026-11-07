import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, MessageCircle } from "lucide-react";

import { MarketingFooter } from "@/components/marketing-footer";
import { MotionRoot, Reveal, Stagger, StaggerItem } from "@/components/homepage/motion";
import { CapabilitiesExplorer } from "@/components/portfolio/capabilities-explorer";
import { BrowserFrame, PhoneFrame, conceptUrl } from "@/components/portfolio/frames";
import { CursorHalo, FadeUp, HeroStage, MagneticLink, RiseText } from "@/components/portfolio/interactive";
import { ProcessTimeline } from "@/components/portfolio/process-timeline";
import { ProjectCard, galleryCss } from "@/components/portfolio/project-card";
import { ProjectFilter } from "@/components/portfolio/project-filter";
import { Showcase } from "@/components/portfolio/showcase";
import { SiteMock } from "@/components/portfolio/site-mock";
import {
  CAPABILITIES,
  ONGOING_SERVICES,
  PORTFOLIO_WHATSAPP_MESSAGE,
  PROCESS,
  PROJECT_CATEGORIES,
  PROJECTS,
  SETUP_SERVICES,
  TECH_STACK,
  projectBySlug,
} from "@/lib/portfolio/content";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";

const TITLE = "Portfolio | RNOS Digital — Website & Digital Solutions";
const DESCRIPTION =
  "Explore RNOS Digital's website design concepts, e-commerce experiences, custom software interfaces and digital solutions for modern businesses.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/portfolio" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: `${siteUrl}/portfolio`,
    siteName: "RNOS India Pvt. Ltd.",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const whatsappUrl = buildWhatsAppUrl(PORTFOLIO_WHATSAPP_MESSAGE);

/* ───────────────────────── Small shared pieces ───────────────────────── */

function Eyebrow({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "dark" }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-[0.22em] ${tone === "dark" ? "text-[var(--dc-amber)]" : "text-[var(--dc-flame)]"}`}>{children}</p>
  );
}

function SectionTitle({ id, children, tone = "light", className = "" }: { id: string; children: React.ReactNode; tone?: "light" | "dark"; className?: string }) {
  return (
    <h2
      id={id}
      className={`mt-4 font-[family-name:var(--font-heading)] text-[clamp(2.1rem,4.6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.045em] ${tone === "dark" ? "text-white" : "text-[var(--dc-ink)]"} ${className}`}
    >
      {children}
    </h2>
  );
}

const Accent = ({ children }: { children: React.ReactNode }) => (
  <span className="font-[family-name:var(--font-display)] font-normal italic tracking-[-0.01em]">{children}</span>
);

const btnPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--dc-flame)] px-7 text-[15px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(247,74,1,0.7)] transition-[background-color,box-shadow] duration-300 hover:bg-[var(--dc-flame-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dc-blue-deep)]";
const btnGhostDark =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white/[0.06] px-7 text-[15px] font-bold text-white ring-1 ring-white/20 backdrop-blur transition-[background-color] duration-300 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

/* ───────────────────────── Page ───────────────────────── */

export default function PortfolioPage() {
  const heroBack = projectBySlug("meridian-advisory")!;
  const heroMain = projectBySlug("ledgerdesk-gst-billing")!;
  const heroPhone = projectBySlug("aangan-studio-handloom")!;
  const store = projectBySlug("kesar-kitchen-d2c-store")!;
  const resort = projectBySlug("vihaan-lake-resort")!;

  const counts = Object.fromEntries(PROJECT_CATEGORIES.map((category) => [category.id, PROJECTS.filter((p) => p.category === category.id).length]));

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Portfolio", item: `${siteUrl}/portfolio` },
    ],
  };
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "RNOS Digital Portfolio",
    description: DESCRIPTION,
    url: `${siteUrl}/portfolio`,
    publisher: { "@type": "Organization", name: "RNOS India Pvt. Ltd.", url: siteUrl },
    hasPart: PROJECTS.map((project) => ({
      "@type": "CreativeWork",
      name: `${project.name} (concept project)`,
      url: `${siteUrl}/portfolio/${project.slug}`,
      genre: project.industry,
    })),
  };

  const showcasePanels = [
    {
      id: "desktop",
      label: "Desktop",
      caption: "A resort website concept on a wide screen: availability first, rooms below.",
      node: (
        <div className="mx-auto max-w-5xl">
          <BrowserFrame url={conceptUrl(resort.slug)} tone="dark">
            <SiteMock project={resort} />
          </BrowserFrame>
        </div>
      ),
    },
    {
      id: "mobile",
      label: "Mobile",
      caption: "Three concepts as a customer sees them on a phone.",
      node: (
        <div className="mx-auto grid max-w-3xl grid-cols-3 items-end gap-4 sm:gap-8">
          {[store, heroMain, resort].map((project, index) => (
            <div key={project.slug} className={index === 1 ? "sm:-translate-y-8" : ""}>
              <PhoneFrame>
                <SiteMock project={project} device="mobile" />
              </PhoneFrame>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "product",
      label: "Product page",
      caption: "A store concept: product storytelling, prices and a two-step UPI checkout.",
      node: (
        <div className="mx-auto max-w-5xl">
          <BrowserFrame url={conceptUrl(store.slug)} tone="dark">
            <SiteMock project={store} />
          </BrowserFrame>
        </div>
      ),
    },
    {
      id: "dashboard",
      label: "Dashboard",
      caption: "A billing dashboard concept that leads with what needs attention today.",
      node: (
        <div className="mx-auto max-w-5xl">
          <BrowserFrame url={conceptUrl(heroMain.slug)} tone="dark">
            <SiteMock project={heroMain} />
          </BrowserFrame>
        </div>
      ),
    },
    {
      id: "responsive",
      label: "Responsive",
      caption: "One concept, designed for every screen it will meet.",
      node: (
        <div className="mx-auto grid max-w-5xl grid-cols-[1fr_0.26fr] items-end gap-4 sm:gap-8">
          <BrowserFrame url={conceptUrl(heroBack.slug)} tone="dark">
            <SiteMock project={heroBack} />
          </BrowserFrame>
          <PhoneFrame>
            <SiteMock project={heroBack} device="mobile" />
          </PhoneFrame>
        </div>
      ),
    },
  ];

  return (
    <MotionRoot>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <style dangerouslySetInnerHTML={{ __html: galleryCss() }} />
      <CursorHalo />

      <main id="main-content" className="overflow-x-clip bg-white">
        {/* ── A. Hero ─────────────────────────────────────────────── */}
        <section aria-labelledby="pf-hero-title" className="relative isolate overflow-hidden bg-[var(--dc-blue-deep)] text-white">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_78%_8%,rgba(17,112,221,0.55),transparent_62%),radial-gradient(45%_40%_at_8%_95%,rgba(247,74,1,0.22),transparent_70%),linear-gradient(180deg,#001536_0%,#012456_55%,#013a8e_100%)]" />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(80%_70%_at_50%_30%,black,transparent)]"
          />

          <div className="mx-auto max-w-[var(--dc-max)] px-4 pb-16 pt-8 sm:px-6 lg:px-10 lg:pb-24 lg:pt-12">
            <nav aria-label="Breadcrumb" className="text-xs font-medium text-white/55">
              <ol className="flex items-center gap-2">
                <li>
                  <Link href="/" className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-white/80">
                  Portfolio
                </li>
              </ol>
            </nav>

            <div className="mt-10 grid items-center gap-14 lg:mt-14 lg:grid-cols-[1fr_1.08fr] lg:gap-10">
              <div>
                <FadeUp>
                  <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-white/80 ring-1 ring-white/15">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--dc-amber)]" />
                    RNOS Digital · Portfolio
                  </p>
                </FadeUp>
                <h1 id="pf-hero-title" className="mt-7 font-[family-name:var(--font-heading)] text-[clamp(2.9rem,6.6vw,5.6rem)] font-semibold leading-[0.95] tracking-[-0.055em]">
                  <RiseText text="Your Vision." className="block" />
                  <span className="block bg-gradient-to-r from-[#ffb057] via-[var(--dc-amber)] to-[var(--dc-flame)] bg-clip-text pb-2 text-transparent">
                    <RiseText text="Our Digital Craft." className="font-[family-name:var(--font-display)] font-normal italic tracking-[-0.02em]" delay={0.18} />
                  </span>
                </h1>
                <FadeUp delay={0.45}>
                  <p className="mt-7 max-w-xl text-lg leading-8 text-white/75">
                    From powerful business websites to intelligent digital platforms, we transform ideas into exceptional digital experiences.
                  </p>
                </FadeUp>
                <FadeUp delay={0.6} className="mt-9 flex flex-wrap gap-3">
                  <MagneticLink href="#projects" className={btnPrimary}>
                    Explore Our Work
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </MagneticLink>
                  <MagneticLink href={whatsappUrl} external className={btnGhostDark} aria-label="Start your project on WhatsApp (opens in a new tab)">
                    Start Your Project
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </MagneticLink>
                </FadeUp>
              </div>

              <div className="relative mx-auto aspect-[1.18] w-full max-w-[680px]">
                <HeroStage
                  layers={[
                    {
                      depth: 0.6,
                      className: "left-[2%] top-[0%] w-[66%] opacity-80 [transform:translateZ(-80px)]",
                      node: (
                        <BrowserFrame url={conceptUrl(heroBack.slug)} tone="dark">
                          <SiteMock project={heroBack} />
                        </BrowserFrame>
                      ),
                    },
                    {
                      depth: 1.2,
                      className: "right-[0%] top-[20%] w-[80%]",
                      node: (
                        <BrowserFrame url={conceptUrl(heroMain.slug)}>
                          <SiteMock project={heroMain} />
                        </BrowserFrame>
                      ),
                    },
                    {
                      depth: 2,
                      className: "bottom-[0%] left-[6%] w-[24%] [transform:translateZ(60px)]",
                      node: (
                        <PhoneFrame>
                          <SiteMock project={heroPhone} device="mobile" />
                        </PhoneFrame>
                      ),
                    },
                  ]}
                />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-6 left-1/2 h-16 w-[80%] -translate-x-1/2 rounded-[100%] bg-black/40 blur-2xl" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Statement ─────────────────────────────────────────────── */}
        <section aria-labelledby="pf-statement" className="mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
          <Reveal>
            <Eyebrow>Digital experiences</Eyebrow>
            <h2 id="pf-statement" className="mt-5 max-w-5xl font-[family-name:var(--font-heading)] text-[clamp(2.2rem,5.4vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-[var(--dc-ink)]">
              Digital experiences that <Accent>move businesses</Accent> forward.
            </h2>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--dc-body)]">
              We design and build powerful digital experiences that help businesses establish their presence, connect with customers and grow.
            </p>
          </Reveal>
        </section>

        {/* ── B. Capabilities ───────────────────────────────────────── */}
        <section id="capabilities" aria-labelledby="pf-cap" className="scroll-mt-24 border-t border-slate-900/5 bg-[var(--dc-sky-soft)]">
          <div className="mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10 lg:py-28">
            <Reveal className="max-w-3xl">
              <Eyebrow>Capabilities</Eyebrow>
              <SectionTitle id="pf-cap">
                Everything a business needs <Accent>online.</Accent>
              </SectionTitle>
            </Reveal>
            <div className="mt-14">
              <CapabilitiesExplorer capabilities={CAPABILITIES} />
            </div>
          </div>
        </section>

        {/* ── C. Selected projects ──────────────────────────────────── */}
        <section id="projects" aria-labelledby="pf-projects" className="scroll-mt-24">
          <div className="mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
            <Reveal className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <Eyebrow>Selected work</Eyebrow>
                <SectionTitle id="pf-projects">
                  Concepts that show <Accent>what we build.</Accent>
                </SectionTitle>
              </div>
              <p className="max-w-sm text-sm leading-6 text-[var(--dc-muted)]">
                Every project below is a <strong className="font-semibold text-[var(--dc-ink)]">concept project</strong> designed by RNOS Digital to
                demonstrate our capabilities. None is presented as client work.
              </p>
            </Reveal>

            <div className="mt-10">
              <Suspense
                fallback={
                  <div className="pf-gallery mt-[4.5rem]" data-filter="all">
                    {PROJECTS.map((project, index) => (
                      <ProjectCard key={project.slug} project={project} wide={index % 3 === 0} flip={index % 6 === 3} />
                    ))}
                  </div>
                }
              >
                <ProjectFilter categories={PROJECT_CATEGORIES} counts={counts} total={PROJECTS.length}>
                  {PROJECTS.map((project, index) => (
                    <ProjectCard key={project.slug} project={project} wide={index % 3 === 0} flip={index % 6 === 3} />
                  ))}
                </ProjectFilter>
              </Suspense>
            </div>
          </div>
        </section>

        {/* ── D. Interactive showcase ───────────────────────────────── */}
        <section id="showcase" aria-labelledby="pf-showcase" className="relative isolate scroll-mt-24 overflow-hidden bg-[#020d24] text-white">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(1,89,199,0.45),transparent_70%),radial-gradient(40%_40%_at_100%_100%,rgba(247,74,1,0.15),transparent_70%)]" />
          <div className="mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
            <Reveal className="mx-auto max-w-3xl text-center">
              <Eyebrow tone="dark">Website showcase</Eyebrow>
              <SectionTitle id="pf-showcase" tone="dark">
                See the craft, <Accent>screen by screen.</Accent>
              </SectionTitle>
            </Reveal>
            <div className="mt-12">
              <Showcase panels={showcasePanels} />
            </div>
          </div>
        </section>

        {/* ── E. Technology stack ───────────────────────────────────── */}
        <section aria-labelledby="pf-stack" className="mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <Reveal>
              <Eyebrow>Technology</Eyebrow>
              <SectionTitle id="pf-stack">
                Built on a <Accent>modern stack.</Accent>
              </SectionTitle>
              <p className="mt-6 max-w-md text-[15px] leading-7 text-[var(--dc-body)]">
                The same tools this website runs on: fast to load, secure by default and ready to scale when the business does.
              </p>
            </Reveal>
            <Stagger as="ul" className="grid grid-cols-2 gap-px overflow-hidden rounded-[24px] bg-slate-900/10 ring-1 ring-slate-900/10 sm:grid-cols-3">
              {TECH_STACK.map((tech) => (
                <StaggerItem as="li" key={tech.name} className="group bg-white p-5 transition-colors duration-300 hover:bg-[var(--dc-sky-soft)] sm:p-6">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--dc-ink)] font-[family-name:var(--font-heading)] text-sm font-bold text-white transition-transform duration-300 group-hover:-translate-y-0.5"
                  >
                    {tech.name.replace(/[^A-Za-z]/g, "").slice(0, 2)}
                  </span>
                  <p className="mt-4 font-[family-name:var(--font-heading)] text-base font-semibold tracking-[-0.02em] text-[var(--dc-ink)]">{tech.name}</p>
                  <p className="mt-0.5 text-sm text-[var(--dc-muted)]">{tech.role}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ── F. Process ────────────────────────────────────────────── */}
        <section aria-labelledby="pf-process" className="border-y border-slate-900/5 bg-[var(--dc-cream)]">
          <div className="mx-auto grid max-w-[var(--dc-max)] gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-10 lg:py-32">
            <Reveal className="lg:sticky lg:top-28 lg:self-start">
              <Eyebrow>Our process</Eyebrow>
              <SectionTitle id="pf-process">
                From first call <Accent>to growth.</Accent>
              </SectionTitle>
              <p className="mt-6 max-w-md text-[15px] leading-7 text-[var(--dc-body)]">
                Six clear stages, so you always know what is happening, what comes next and what we need from you.
              </p>
            </Reveal>
            <ProcessTimeline steps={PROCESS} />
          </div>
        </section>

        {/* ── G. Growth & support ───────────────────────────────────── */}
        <section id="growth" aria-labelledby="pf-growth" className="scroll-mt-24 mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
          <Reveal className="max-w-3xl">
            <Eyebrow>Beyond launch</Eyebrow>
            <SectionTitle id="pf-growth">
              A website is the start, <Accent>not the finish.</Accent>
            </SectionTitle>
            <p className="mt-6 max-w-2xl text-[15px] leading-7 text-[var(--dc-body)]">
              Tracking and integrations are set up once, as part of the build. Maintenance, SEO and marketing are separate, ongoing services you can add when you need them.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <Reveal className="rounded-[28px] bg-[var(--dc-sky-soft)] p-7 ring-1 ring-slate-900/5 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--dc-blue-bright)]">Set up at launch · one-time</p>
              <h3 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-[-0.03em] text-[var(--dc-ink)]">Technical setup</h3>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {SETUP_SERVICES.map((item) => (
                  <li key={item.title}>
                    <p className="font-semibold text-[var(--dc-ink)]">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--dc-body)]">{item.text}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.08} className="rounded-[28px] bg-[var(--dc-ink)] p-7 text-white sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--dc-amber)]">Ongoing services · monthly</p>
              <h3 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-[-0.03em]">Growth & support</h3>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {ONGOING_SERVICES.map((item) => (
                  <li key={item.title}>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/70">{item.text}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ── H. Final conversion ───────────────────────────────────── */}
        <section aria-labelledby="pf-cta" className="px-4 pb-20 sm:px-6 lg:px-10">
          <Reveal>
            <div className="relative isolate mx-auto max-w-[var(--dc-max)] overflow-hidden rounded-[36px] bg-[var(--dc-blue-deep)] px-6 py-20 text-center text-white sm:px-12 lg:py-28">
              <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(17,112,221,0.6),transparent_70%),radial-gradient(40%_50%_at_50%_120%,rgba(247,74,1,0.35),transparent_70%)]" />
              <h2 id="pf-cta" className="mx-auto max-w-4xl font-[family-name:var(--font-heading)] text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
                Let&apos;s build something <Accent>exceptional.</Accent>
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/75">
                Have an idea, a business or a vision? Let&apos;s turn it into a digital experience that makes a difference.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <MagneticLink href={whatsappUrl} external className={btnPrimary} aria-label="Start your project on WhatsApp (opens in a new tab)">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Start Your Project
                </MagneticLink>
                <MagneticLink href="#capabilities" className={btnGhostDark}>
                  Explore Our Services
                </MagneticLink>
                <MagneticLink href="/contact" className={btnGhostDark}>
                  Contact RNOS
                </MagneticLink>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <MarketingFooter />
    </MotionRoot>
  );
}
