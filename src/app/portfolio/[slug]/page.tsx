import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Info, MessageCircle } from "lucide-react";

import { MarketingFooter } from "@/components/marketing-footer";
import { MotionRoot, Reveal } from "@/components/homepage/motion";
import { BrowserFrame, PhoneFrame, conceptUrl } from "@/components/portfolio/frames";
import { FadeUp, MagneticLink, RiseText } from "@/components/portfolio/interactive";
import { KindBadge, ProjectCard } from "@/components/portfolio/project-card";
import { SiteMock } from "@/components/portfolio/site-mock";
import { PROJECT_CATEGORIES, PROJECT_KIND_LABEL, PROJECTS, projectBySlug } from "@/lib/portfolio/content";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";

export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) return {};
  const title = `${project.name} — ${PROJECT_KIND_LABEL[project.kind]} | RNOS Digital`;
  return {
    title,
    description: `${project.summary} A ${PROJECT_KIND_LABEL[project.kind].toLowerCase()} by RNOS Digital.`,
    alternates: { canonical: `/portfolio/${project.slug}` },
    openGraph: { title, description: project.summary, type: "article", url: `${siteUrl}/portfolio/${project.slug}`, siteName: "RNOS India Pvt. Ltd.", locale: "en_IN" },
    twitter: { card: "summary_large_image", title, description: project.summary },
  };
}

export default async function PortfolioProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) notFound();

  const category = PROJECT_CATEGORIES.find((c) => c.id === project.category)?.label ?? project.category;
  const related = PROJECTS.filter((p) => p.slug !== project.slug).slice(0, 2);
  const whatsappUrl = buildWhatsAppUrl(`Hello RNOS Digital, I saw the ${project.name} concept on your portfolio and would like a similar ${project.industry.toLowerCase()} website.`);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Portfolio", item: `${siteUrl}/portfolio` },
      { "@type": "ListItem", position: 3, name: project.name, item: `${siteUrl}/portfolio/${project.slug}` },
    ],
  };

  return (
    <MotionRoot>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <main id="main-content" className="overflow-x-clip bg-white">
        <section aria-labelledby="pj-title" className="relative isolate overflow-hidden bg-[var(--dc-blue-deep)] text-white">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_80%_0%,rgba(17,112,221,0.5),transparent_62%),linear-gradient(180deg,#001536_0%,#012456_60%,#013a8e_100%)]" />
          <div className="mx-auto max-w-[var(--dc-max)] px-4 pb-16 pt-8 sm:px-6 lg:px-10 lg:pb-20">
            <nav aria-label="Breadcrumb" className="text-xs font-medium text-white/55">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-white">Home</Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/portfolio" className="hover:text-white">Portfolio</Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-white/80">{project.name}</li>
              </ol>
            </nav>
            <div className="mt-10 max-w-4xl">
              <FadeUp className="flex flex-wrap items-center gap-2">
                <KindBadge project={project} tone="dark" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">{category} · {project.industry}</span>
              </FadeUp>
              <h1 id="pj-title" className="mt-6 font-[family-name:var(--font-heading)] text-[clamp(2.6rem,6vw,5rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
                <RiseText text={project.name} />
              </h1>
              <FadeUp delay={0.3}>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">{project.summary}</p>
              </FadeUp>
            </div>
            <FadeUp delay={0.45} className="relative mt-12 grid grid-cols-[minmax(0,1fr)_minmax(0,0.24fr)] items-end gap-4 sm:gap-8">
              <BrowserFrame url={conceptUrl(project.slug)} tone="dark">
                <SiteMock project={project} />
              </BrowserFrame>
              <PhoneFrame>
                <SiteMock project={project} device="mobile" />
              </PhoneFrame>
            </FadeUp>
          </div>
        </section>

        <section aria-labelledby="pj-brief" className="mx-auto grid max-w-[var(--dc-max)] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20 lg:px-10 lg:py-28">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--dc-flame)]">The brief</p>
            <h2 id="pj-brief" className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-[-0.04em] text-[var(--dc-ink)] sm:text-4xl">
              What this concept explores
            </h2>
            <p className="mt-6 text-lg leading-8 text-[var(--dc-body)]">{project.brief}</p>
            <h3 className="mt-10 font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--dc-ink)]">Key features</h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {project.features.map((feature) => (
                <li key={feature} className="flex gap-3 text-[15px] leading-6 text-[var(--dc-body)]">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dc-blue-bright)]" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.08} className="space-y-6">
            <div className="rounded-[24px] bg-[var(--dc-sky-soft)] p-7 ring-1 ring-slate-900/5">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--dc-muted)]">Technology</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {project.stack.map((tech) => (
                  <li key={tech} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[var(--dc-ink)] ring-1 ring-slate-900/10">{tech}</li>
                ))}
              </ul>
            </div>
            <div role="note" className="flex gap-3 rounded-[24px] bg-[var(--dc-orange-soft)] p-7 text-sm leading-6 text-[var(--dc-ink)] ring-1 ring-[var(--dc-flame)]/15">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
              <p>
                <strong>{PROJECT_KIND_LABEL[project.kind]}.</strong> {project.name} is a concept designed by RNOS Digital to show how we would approach a {project.industry.toLowerCase()} website. It is not a client project, and the business, names and figures shown are illustrative.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <MagneticLink href={whatsappUrl} external aria-label="Start a similar project on WhatsApp (opens in a new tab)" className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--dc-flame)] px-6 text-[15px] font-bold text-white transition-colors hover:bg-[var(--dc-flame-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-bright)] focus-visible:ring-offset-2">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Start a similar project
              </MagneticLink>
              <MagneticLink href="/portfolio#projects" className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-bold text-[var(--dc-ink)] ring-1 ring-slate-900/15 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-bright)]">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                All projects
              </MagneticLink>
            </div>
          </Reveal>
        </section>

        <section aria-labelledby="pj-more" className="border-t border-slate-900/5 bg-[var(--dc-sky-soft)]">
          <div className="mx-auto max-w-[var(--dc-max)] px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="pj-more" className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-[-0.04em] text-[var(--dc-ink)]">More concepts</h2>
              <Link href="/portfolio#projects" className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--dc-blue-bright)]">
                View all projects <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-16 md:grid-cols-2 md:gap-10">
              {related.map((item) => (
                <ProjectCard key={item.slug} project={item} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </MotionRoot>
  );
}
