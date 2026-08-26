import Image from "next/image";
import Link from "next/link";
import { BookOpen, ArrowRight, Calendar } from "lucide-react";

import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";
import { getPublishedArticles, type Article } from "@/lib/articles";

function readingMinutes(article: Article) {
  const text = `${article.excerpt || ""} ${article.content || ""}`.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Knowledge Center — published CMS articles only. Hidden when none exist. */
export async function KnowledgeCenter() {
  let articles: Article[] = [];
  try {
    articles = await getPublishedArticles();
  } catch (err) {
    console.warn("[knowledge-center] Failed to retrieve articles:", err);
  }

  const display = articles.slice(0, 4);
  if (!display.length) return null;

  const [featured, ...rest] = display;

  return (
    <HomepageSection id="blog" surface="white" wash="blue">
      <HomepageSectionHeader
        eyebrow="Guides & updates"
        title="Knowledge Center"
        description="Guides and updates from published DigiConnect articles."
        actionHref="/blog"
        actionLabel="All articles"
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Link
          href={`/blog/${featured.slug}`}
          className="lg-card lg-raise lg-sheen group overflow-hidden rounded-[1.75rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
        >
          <div className="relative aspect-[16/9] bg-[var(--dc-blue-soft)]">
            {featured.featured_image_url ? (
              <Image
                src={featured.featured_image_url}
                alt=""
                fill
                className="object-cover transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                sizes="(max-width: 1024px) 100vw, 720px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--dc-blue-700)]">
                <BookOpen className="h-10 w-10" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="p-5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--dc-blue-600)]">
              {featured.category || "Resources"}
            </span>
            <h3 className="mt-1 text-xl font-extrabold tracking-[-0.02em] text-[var(--dc-ink)] transition-colors group-hover:text-[var(--dc-blue-mid)]">
              {featured.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm font-semibold text-[var(--dc-body)]">
              {featured.excerpt ||
                (featured.content ? `${featured.content.replace(/<[^>]+>/g, "").slice(0, 140)}…` : "Read the full guide.")}
            </p>
            <span className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-[var(--dc-muted)]">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Updated{" "}
              {new Date(featured.updated_at || featured.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              <span>· {readingMinutes(featured)} min read</span>
            </span>
          </div>
        </Link>

        <ul className="flex flex-col gap-3">
          {rest.map((art) => {
            const excerpt =
              art.excerpt ||
              (art.content ? `${art.content.replace(/<[^>]+>/g, "").slice(0, 100)}…` : "Read the full guide.");
            const date = new Date(art.updated_at || art.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <li key={art.id || art.slug}>
                <Link
                  href={`/blog/${art.slug}`}
                  className="lg-card lg-raise group flex gap-3 rounded-2xl p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
                >
                  <span className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--dc-blue-soft)]">
                    {art.featured_image_url ? (
                      <Image src={art.featured_image_url} alt="" fill loading="lazy" className="object-cover" sizes="96px" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[var(--dc-blue-700)]">
                        <BookOpen className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--dc-blue-600)]">
                      {art.category || "Resources"}
                    </span>
                    <span className="mt-0.5 block text-sm font-extrabold leading-snug text-[var(--dc-ink)] group-hover:text-[var(--dc-blue-700)]">
                      {art.title}
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs font-semibold text-[var(--dc-body)]">{excerpt}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--dc-muted)]">
                      {date} · {readingMinutes(art)} min
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </HomepageSection>
  );
}
