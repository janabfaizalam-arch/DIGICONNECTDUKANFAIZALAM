import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";

import { getPublishedArticles } from "@/lib/articles";

/**
 * Guides from the site's own blog, filtered to this subject.
 *
 * The design reference drew three article cards here. Rather than a second
 * article system for one page, this reads the `articles` table the admin panel
 * already writes to: give an article the category "labour-card" (or mention
 * the subject in its title) and it appears here, edited from the same screen
 * as every other article.
 *
 * If nothing matches, the section renders nothing at all. An empty "our
 * guides" heading over three placeholder boxes is worse than no section.
 */

const KEYWORDS = ["labour", "labor", "shramik", "श्रमिक", "लेबर", "upbocw", "मजदूर", "मज़दूर"];

export async function LabourArticles() {
  const articles = await getPublishedArticles();

  const relevant = articles
    .filter((article) => {
      const haystack = `${article.category ?? ""} ${article.title} ${article.slug}`.toLowerCase();
      return KEYWORDS.some((keyword) => haystack.includes(keyword));
    })
    .slice(0, 3);

  if (!relevant.length) return null;

  return (
    <section id="guides" className="scroll-mt-24">
      <p
        className="text-[11px] font-black uppercase tracking-[0.16em]"
        style={{ color: "var(--lc-saffron-deep)" }}
      >
        गाइड व लेख
      </p>
      <h2 className="mt-2 text-[1.35rem] font-extrabold sm:text-[1.75rem]" style={{ color: "var(--lc-navy)" }}>
        श्रमिक सहायता गाइड
      </h2>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {relevant.map((article) => (
          <li key={article.id} className="lc-card lc-lift overflow-hidden">
            <Link href={`/blog/${article.slug}`} className="block">
              {article.featured_image_url ? (
                <Image
                  src={article.featured_image_url}
                  alt={article.title}
                  width={800}
                  height={450}
                  sizes="(max-width: 640px) 100vw, 360px"
                  className="h-44 w-full object-cover"
                />
              ) : (
                /* No image on the record — a flat brand panel rather than a
                   broken frame or a stretched placeholder photograph. */
                <div
                  aria-hidden="true"
                  className="flex h-44 w-full items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #eef4fb, #fff7ed)" }}
                >
                  <Newspaper className="h-9 w-9" style={{ color: "var(--lc-navy-light)", opacity: 0.5 }} />
                </div>
              )}
              <div className="p-4.5">
                <h3 className="text-[15px] font-bold leading-snug" style={{ color: "var(--lc-navy)" }}>
                  {article.title}
                </h3>
                {article.excerpt ? (
                  <p
                    className="mt-1.5 line-clamp-3 text-[12.5px] font-medium leading-snug"
                    style={{ color: "var(--lc-muted)" }}
                  >
                    {article.excerpt}
                  </p>
                ) : null}
                <span
                  className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold"
                  style={{ color: "var(--lc-saffron-deep)" }}
                >
                  पूरा पढ़ें
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
