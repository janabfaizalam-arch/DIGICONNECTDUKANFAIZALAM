import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";
import { BrowserFrame, conceptUrl } from "@/components/portfolio/frames";
import { SiteMock } from "@/components/portfolio/site-mock";
import { HOMEPAGE_PROJECT_SLUGS, PROJECT_KIND_LABEL, projectBySlug, type Project } from "@/lib/portfolio/content";

/**
 * "Explore What We Create" — a short window into the RNOS Digital portfolio.
 *
 * Four concept projects, drawn in markup (no images, so nothing shifts while
 * it loads), each labelled as a concept so none reads as client work. The full
 * gallery lives at /portfolio.
 */
export function PortfolioShowcase() {
  const projects = HOMEPAGE_PROJECT_SLUGS.map(projectBySlug).filter((p): p is Project => Boolean(p));

  return (
    <HomepageSection id="portfolio" surface="white">
      <HomepageSectionHeader
        eyebrow="RNOS Digital"
        title="Explore What We Create"
        description="Discover how technology, creativity and strategy come together to build powerful digital experiences."
        actionHref="/portfolio"
        actionLabel="View All Projects"
        />

      <ul className="-mx-[var(--mobile-page-gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--mobile-page-gutter)] pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {projects.map((project) => (
          <li key={project.slug} className="w-[78%] shrink-0 snap-start sm:w-auto sm:min-w-0">
            <Link
              href={`/portfolio/${project.slug}`}
              className="group block h-full rounded-[22px] bg-gradient-to-br from-[var(--dc-blue-soft)] via-white to-[var(--dc-orange-soft)] p-3 ring-1 ring-slate-900/5 transition-shadow duration-300 hover:shadow-[0_24px_50px_-28px_rgba(1,29,95,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-bright)] sm:p-4"
            >
              <div className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none">
                <BrowserFrame url={conceptUrl(project.slug)}>
                  <SiteMock project={project} />
                </BrowserFrame>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3 px-1 pb-1">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-flame-deep)]">{PROJECT_KIND_LABEL[project.kind]}</p>
                  <h3 className="mt-1 truncate text-base font-extrabold tracking-[-0.02em] text-[var(--dc-ink)]">{project.name}</h3>
                  <p className="truncate text-[13px] font-medium text-[var(--dc-muted)]">{project.industry}</p>
                </div>
                <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-[var(--dc-blue-bright)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
            </Link>
          </li>
        ))}
      </ul>

    </HomepageSection>
  );
}
