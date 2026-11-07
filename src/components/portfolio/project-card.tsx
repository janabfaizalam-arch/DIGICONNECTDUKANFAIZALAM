import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { BrowserFrame, PhoneFrame, conceptUrl } from "@/components/portfolio/frames";
import { SiteMock } from "@/components/portfolio/site-mock";
import { PROJECT_CATEGORIES, PROJECT_KIND_LABEL, type Project } from "@/lib/portfolio/content";
import { cn } from "@/lib/utils";

const categoryLabel = (id: string) => PROJECT_CATEGORIES.find((category) => category.id === id)?.label ?? id;

export function KindBadge({ project, tone = "light" }: { project: Project; tone?: "light" | "dark" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]",
        tone === "dark" ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-[var(--dc-orange-soft)] text-[var(--dc-flame-deep)] ring-1 ring-[var(--dc-flame)]/15",
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--dc-flame)]" />
      {PROJECT_KIND_LABEL[project.kind]}
    </span>
  );
}

/**
 * A project in the gallery. `wide` cards pair the desktop mockup with a phone
 * and put the text beside them; standard cards stack. The whole card is one
 * link (the heading's link stretched over it), so it is a single tab stop.
 */
export function ProjectCard({ project, wide = false, flip = false, headingLevel = 3 }: { project: Project; wide?: boolean; flip?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article
      data-category={project.category}
      data-wide={wide ? "true" : undefined}
      data-cursor="View"
      className={cn(
        "pf-card group relative isolate",
        wide ? "grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12" : "flex flex-col gap-6",
      )}
    >
      <figure
        className={cn(
          "relative min-w-0 overflow-hidden rounded-[26px] bg-gradient-to-br from-[var(--dc-blue-soft)] via-white to-[var(--dc-orange-soft)] p-5 ring-1 ring-slate-900/5 sm:p-8",
          wide ? cn("lg:col-span-8", flip && "lg:order-2") : "",
        )}
      >
        <div className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1.5 group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:transform-none">
          <BrowserFrame url={conceptUrl(project.slug)}>
            <SiteMock project={project} />
          </BrowserFrame>
        </div>
        {wide ? (
          <div className="absolute bottom-4 right-4 hidden w-[22%] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-3 sm:block motion-reduce:transition-none motion-reduce:group-hover:transform-none">
            <PhoneFrame>
              <SiteMock project={project} device="mobile" />
            </PhoneFrame>
          </div>
        ) : null}
        <figcaption className="sr-only">
          {PROJECT_KIND_LABEL[project.kind]}: {project.name}, a {project.industry.toLowerCase()} website concept. {project.summary}
        </figcaption>
      </figure>

      <div className={cn("min-w-0", wide && cn("lg:col-span-4", flip && "lg:order-1"))}>
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge project={project} />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--dc-muted)]">{categoryLabel(project.category)}</span>
        </div>
        <Heading className={cn("mt-4 font-[family-name:var(--font-heading)] font-semibold tracking-[-0.035em] text-[var(--dc-ink)]", wide ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl")}>
          <Link
            href={`/portfolio/${project.slug}`}
            className="outline-none after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:underline focus-visible:decoration-[var(--dc-blue-bright)] focus-visible:decoration-2 focus-visible:underline-offset-4"
          >
            {project.name}
          </Link>
        </Heading>
        <p className="mt-1 text-sm font-medium text-[var(--dc-muted)]">{project.industry}</p>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-[var(--dc-body)]">{project.summary}</p>
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
          {project.stack.slice(0, wide ? 5 : 4).map((tech) => (
            <li key={tech} className="rounded-md bg-slate-900/[0.04] px-2 py-1 text-xs font-medium text-[var(--dc-body)]">
              {tech}
            </li>
          ))}
        </ul>
        <span aria-hidden="true" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--dc-blue-bright)]">
          View project
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}

/**
 * Gallery CSS: which cards show for each filter, and the layout. Written from
 * the category list so a new category needs no CSS edit.
 */
export function galleryCss() {
  const hide = PROJECT_CATEGORIES.map(
    (category) => `.pf-gallery[data-filter="${category.id}"] > .pf-card:not([data-category="${category.id}"]){display:none}`,
  ).join("");
  return `
.pf-gallery{display:grid;grid-template-columns:minmax(0,1fr);gap:4.5rem 2.5rem}
@media (min-width:768px){.pf-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}.pf-gallery>.pf-card[data-wide]{grid-column:1/-1}}
.pf-gallery:not([data-filter="all"])>.pf-card{grid-column:1/-1}
.pf-gallery>.pf-card{animation:pf-in .6s cubic-bezier(.22,1,.36,1) both}
@keyframes pf-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.pf-gallery>.pf-card{animation:none}}
${hide}`;
}
