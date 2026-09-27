import Link from "next/link";
import type { ReactNode } from "react";

import { MarketingFooter } from "@/components/marketing-footer";
import { LEGAL_LAST_UPDATED, business, legalLinks } from "@/lib/compliance/config";

type LegalSection = { id: string; title: string; body: ReactNode };

/**
 * Shared frame for every policy page: one heading, the date it last changed,
 * a contents list that doubles as skip-links, and the note that these pages
 * still need a lawyer's review before anyone relies on them as final.
 */
export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
  currentHref,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  currentHref: string;
}) {
  return (
    <>
      <main id="main-content" className="min-h-screen px-4 py-10 md:px-8 md:py-14">
        <article className="mx-auto max-w-3xl rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-liquid md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">{title}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Last updated: <time>{LEGAL_LAST_UPDATED}</time> · {business.brand}, powered by {business.legalEntity}
          </p>

          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700 md:text-base md:leading-8">{intro}</div>

          <nav aria-label="On this page" className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-bold text-slate-900">On this page</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="font-semibold text-blue-800 underline-offset-2 hover:underline">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-8 space-y-10">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-24">
                <h2 id={`${section.id}-heading`} className="text-xl font-bold text-slate-950 md:text-2xl">
                  {index + 1}. {section.title}
                </h2>
                <div className="legal-prose mt-3 space-y-3 text-sm leading-7 text-slate-700 md:text-base md:leading-8">
                  {section.body}
                </div>
              </section>
            ))}
          </div>

          <aside className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p>
              <strong>Note:</strong> This document explains how {business.brand} works in plain language. It has been
              prepared for review by a qualified legal professional and should not be treated as final legal advice.
            </p>
          </aside>

          <nav aria-label="Other policies" className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-sm font-bold text-slate-900">Other policies</h2>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {legalLinks
                .filter((link) => link.href !== currentHref)
                .map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="inline-flex min-h-11 items-center font-semibold text-blue-800 underline-offset-2 hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </article>
      </main>
      <MarketingFooter />
    </>
  );
}

/** Styled external/inline link for use inside policy text. */
export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  const className = "font-semibold text-blue-800 underline underline-offset-2";
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
