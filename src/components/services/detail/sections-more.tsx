"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Info } from "lucide-react";

import { ServiceCard, ServiceSection } from "@/components/services/shell";
import type { ServiceDetail } from "@/lib/services/detail-blueprint";

/* ─────────────────────────────────────────────────────────────────────────
   18 — Important information
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The long-form guide, where a service has one.
 *
 * Rendered as plain text with the line breaks kept, never as HTML. The content
 * comes from a database field an administrator edits, and interpreting that as
 * markup would make the service editor an unrestricted way to inject script
 * into a public page.
 */
export function ServiceImportantInfoSection({ detail }: { detail: ServiceDetail }) {
  const slot = detail.importantInfo;
  if (!slot) return null;

  return (
    <ServiceSection id="important-info" surface="white" eyebrow="Read this" title={slot.title} center={false}>
      <ServiceCard className="p-5 sm:p-7" interactive={false}>
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
          <div className="min-w-0 whitespace-pre-line text-[13.5px] font-medium leading-[1.75] text-[var(--dc-body)] sm:text-[15px]">
            {slot.text}
          </div>
        </div>
      </ServiceCard>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   19 — FAQs
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Questions, one open at a time.
 *
 * The old page printed every answer expanded, which on a phone turned twelve
 * questions into four screens of scrolling nobody read. A `<details>` element
 * rather than a hand-rolled disclosure: it opens without JavaScript, it is
 * findable with the browser's own in-page search, and screen readers already
 * know what it is.
 */
export function ServiceFaqSection({ detail }: { detail: ServiceDetail }) {
  const [open, setOpen] = useState<string | null>(detail.faqs[0]?.question ?? null);
  if (!detail.faqs.length) return null;

  return (
    <ServiceSection id="faq" surface="sky" eyebrow="Questions" title="Frequently asked questions">
      <div className="mx-auto max-w-3xl space-y-2.5">
        {detail.faqs.map((faq) => {
          const isOpen = open === faq.question;

          return (
            <details
              key={faq.question}
              open={isOpen}
              onToggle={(event) => {
                if ((event.currentTarget as HTMLDetailsElement).open) setOpen(faq.question);
                else if (isOpen) setOpen(null);
              }}
              className="lg-card group overflow-hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 text-[13.5px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[15px]">
                  {faq.question}
                </span>
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-[var(--dc-blue-mid)] transition-transform duration-300 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="border-t border-[var(--dc-ink)]/8 px-4 py-3.5 text-[13px] font-medium leading-[1.7] text-[var(--dc-body)] sm:px-5 sm:text-[14px]">
                {faq.answer}
              </p>
            </details>
          );
        })}
      </div>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   20 — Related blogs
   ───────────────────────────────────────────────────────────────────────── */

export function ServiceRelatedBlogsSection({ detail }: { detail: ServiceDetail }) {
  if (!detail.blogs.length) return null;

  return (
    <ServiceSection
      id="blogs"
      surface="white"
      eyebrow="Reading"
      title="Guides on this subject"
      description="Written for people filing it themselves as much as for people asking us to."
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {detail.blogs.map((blog) => (
          <li key={blog.slug}>
            <Link href={`/blog/${blog.slug}`} className="group block h-full">
              <ServiceCard className="flex h-full flex-col">
                {blog.imageUrl ? (
                  <span className="relative block aspect-[16/9] w-full overflow-hidden">
                    <Image
                      src={blog.imageUrl}
                      alt={blog.title}
                      fill
                      loading="lazy"
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </span>
                ) : null}
                <span className="flex grow flex-col p-4 sm:p-5">
                  {blog.category ? (
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--dc-flame)]">
                      {blog.category}
                    </span>
                  ) : null}
                  <span className="mt-1.5 text-[14px] font-extrabold leading-snug text-[var(--dc-ink)]">
                    {blog.title}
                  </span>
                  {blog.excerpt ? (
                    <span className="mt-1.5 line-clamp-3 text-[12.5px] font-medium leading-[1.55] text-[var(--dc-body)]">
                      {blog.excerpt}
                    </span>
                  ) : null}
                  <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold text-[var(--dc-blue-mid)]">
                    Read the guide
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </span>
              </ServiceCard>
            </Link>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   21 — Related services
   ───────────────────────────────────────────────────────────────────────── */

export function ServiceRelatedServicesSection({ detail }: { detail: ServiceDetail }) {
  if (!detail.related.length) return null;

  return (
    <ServiceSection
      id="related"
      surface="sky"
      eyebrow="Also in this category"
      title="Other things we file"
      description={`More from ${detail.service.category}.`}
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {detail.related.map((item) => (
          <li key={item.slug}>
            <Link href={`/services/${item.slug}`} className="group block h-full">
              <ServiceCard className="flex h-full flex-col p-4 sm:p-5">
                <h3 className="text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[15px]">
                  {item.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 grow text-[12.5px] font-medium leading-[1.55] text-[var(--dc-body)]">
                  {item.description}
                </p>
                <p className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">{item.priceLabel}</span>
                  <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[var(--dc-blue-mid)]">
                    View
                    <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </p>
              </ServiceCard>
            </Link>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}
