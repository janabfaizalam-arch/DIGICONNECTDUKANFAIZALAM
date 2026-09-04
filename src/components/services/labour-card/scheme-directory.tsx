"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ChevronDown, ExternalLink, Search, ShieldCheck } from "lucide-react";

import { BenefitLegend, BenefitRow } from "@/components/services/labour-card/benefit-line";
import { CATEGORY_LABEL, type LabourScheme, type SchemeCategory } from "@/lib/labour/types";
import { cn } from "@/lib/utils";

/**
 * The scheme directory: search, filter, and the full detail in the page.
 *
 * Details expand in place rather than opening a modal. That is partly for
 * keyboard and screen-reader users, who lose their place in a dialog, and
 * partly because the content is the reason anybody finds this page at all —
 * text inside a modal that only mounts on click is text a search engine and a
 * reader with JavaScript off never see.
 */

const ALL = "all" as const;

export function SchemeDirectory({ schemes }: { schemes: LabourScheme[] }) {
  const [category, setCategory] = useState<SchemeCategory | typeof ALL>(ALL);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const still = useReducedMotion();

  /** Only categories that actually have a scheme — no empty filter buttons. */
  const categories = useMemo(() => {
    const present = new Set(schemes.map((scheme) => scheme.category));
    return (Object.keys(CATEGORY_LABEL) as SchemeCategory[]).filter((key) => present.has(key));
  }, [schemes]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return schemes.filter((scheme) => {
      if (category !== ALL && scheme.category !== category) return false;
      if (!needle) return true;
      // Searching the benefit labels too: people look for "beti", "cycle",
      // "pension" — words that live in the lines, not in the scheme's name.
      const haystack = [
        scheme.name,
        scheme.nameHi ?? "",
        scheme.summary,
        ...scheme.benefits.map((benefit) => benefit.label),
        ...scheme.eligibility,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [schemes, category, query]);

  const benefitCount = schemes.reduce((total, scheme) => total + scheme.benefits.length, 0);

  return (
    <section id="schemes" className="scroll-mt-24">
      <div className="mb-3">
        <h2 className="text-[1.35rem] font-extrabold tracking-tight text-[var(--dc-ink)] sm:text-[1.75rem]">
          {benefitCount}+ Labour Card benefits aur welfare provisions
        </h2>
        <p className="mt-1 text-[13px] font-medium leading-snug text-[var(--dc-body)] sm:text-[14px]">
          {schemes.length} scheme/programme, inke andar {benefitCount} alag-alag benefit. Har ek ke saath
          shartein aur documents diye hain.
        </p>
      </div>

      <div className="mb-3 rounded-2xl bg-[var(--dc-sky-soft)] p-3">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--dc-body)]">
          Paisa kis tarah milta hai
        </p>
        <BenefitLegend />
      </div>

      {/* ── Search and filter ─────────────────────────────────────────── */}
      <div className="sticky top-[64px] z-20 -mx-1 mb-3 rounded-2xl bg-white/85 px-1 py-2 backdrop-blur-xl">
        <label className="relative block">
          <span className="sr-only">Scheme ka naam search karein</span>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Scheme ka naam search karein…"
            className="h-12 w-full rounded-xl border border-[var(--dc-ink)]/10 bg-white pl-10 pr-3 text-[15px] font-semibold text-[var(--dc-ink)] outline-none transition focus:border-[var(--dc-blue-deep)] focus:ring-4 focus:ring-[var(--dc-blue-deep)]/10"
          />
        </label>

        <div
          role="tablist"
          aria-label="Scheme category"
          className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {[ALL, ...categories].map((key) => {
            const on = category === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setCategory(key as SchemeCategory | typeof ALL)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-3.5 text-[12.5px] font-bold transition",
                  on
                    ? "text-white"
                    : "border border-[var(--dc-ink)]/10 bg-white text-[var(--dc-body)] hover:text-[var(--dc-ink)]",
                )}
                style={on ? { background: "var(--dc-grad-blue)" } : undefined}
              >
                {key === ALL ? "Sabhi" : CATEGORY_LABEL[key as SchemeCategory]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Cards ─────────────────────────────────────────────────────── */}
      {visible.length ? (
        <ul className="space-y-3">
          {visible.map((scheme, index) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              index={index}
              expanded={open === scheme.id}
              onToggle={() => setOpen(open === scheme.id ? null : scheme.id)}
              still={Boolean(still)}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-[var(--dc-ink)]/15 px-4 py-10 text-center text-[13px] font-semibold text-[var(--dc-body)]">
          &ldquo;{query}&rdquo; se koi scheme nahi mili. Doosra shabd try kijiye.
        </p>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   One scheme
   ───────────────────────────────────────────────────────────────────────── */

function SchemeCard({
  scheme,
  index,
  expanded,
  onToggle,
  still,
}: {
  scheme: LabourScheme;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  still: boolean;
}) {
  const conditions = scheme.keyConditions;
  const chips = [
    conditions.membershipDays ? `${Math.round(conditions.membershipDays / 365)} saal membership` : null,
    conditions.workDaysLast12Months ? `${conditions.workDaysLast12Months} din kaam` : null,
    conditions.childLimit !== undefined ? `Adhiktam ${conditions.childLimit} bachche` : null,
    conditions.minAge !== undefined || conditions.maxAge !== undefined
      ? `Umar ${conditions.minAge ?? ""}${conditions.maxAge !== undefined ? `–${conditions.maxAge}` : "+"} saal`
      : null,
    conditions.applicationWindow ? conditions.applicationWindow : null,
  ].filter(Boolean) as string[];

  return (
    <motion.li
      id={`scheme-${scheme.slug}`}
      initial={still ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: still ? 0 : Math.min(index, 6) * 0.03 }}
      className="lg-card scroll-mt-28 overflow-hidden"
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-[var(--dc-sky-soft)] px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-wide text-[var(--dc-blue-deep)]">
              {CATEGORY_LABEL[scheme.category]}
            </span>
            <h3 className="mt-1.5 text-[15.5px] font-extrabold leading-tight text-[var(--dc-ink)] sm:text-[17px]">
              {scheme.name}
            </h3>
            {scheme.nameHi ? (
              <p className="text-[12.5px] font-bold text-[var(--dc-body)]">{scheme.nameHi}</p>
            ) : null}
          </div>
          <VerificationBadge scheme={scheme} />
        </div>

        <p className="mt-2 text-[13px] font-medium leading-relaxed text-[var(--dc-body)]">{scheme.summary}</p>

        {chips.length ? (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <li
                key={chip}
                className="rounded-lg bg-[var(--dc-flame)]/10 px-2 py-1 text-[11px] font-bold text-[#c9430a]"
              >
                {chip}
              </li>
            ))}
          </ul>
        ) : null}

        {/*
          Warnings are not footnotes. "This is not a lump sum", "do not add the
          cash and the deposit", "this is an awareness programme, not money" —
          each one exists because the opposite belief costs somebody something.
        */}
        {scheme.warnings?.length ? (
          <ul className="mt-2.5 space-y-1.5 rounded-xl border-l-4 border-l-[var(--dc-flame)] bg-orange-50/70 px-3 py-2.5">
            {scheme.warnings.map((warning) => (
              <li key={warning} className="flex gap-2 text-[12px] font-bold leading-snug text-[#c9430a]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {warning}
              </li>
            ))}
          </ul>
        ) : null}

        <ul className="mt-3 space-y-2">
          {scheme.benefits.slice(0, expanded ? undefined : 3).map((benefit) => (
            <BenefitRow key={benefit.label} benefit={benefit} />
          ))}
        </ul>

        {!expanded && scheme.benefits.length > 3 ? (
          <p className="mt-1.5 text-[11.5px] font-bold text-[var(--dc-body)]">
            +{scheme.benefits.length - 3} aur benefit
          </p>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`detail-${scheme.slug}`}
          className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-xl border border-[var(--dc-ink)]/12 bg-white px-4 text-[13px] font-bold text-[var(--dc-ink)] transition hover:border-[var(--dc-blue-deep)]/40"
        >
          {expanded ? "Kam dikhaiye" : "Poori jankari"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            id={`detail-${scheme.slug}`}
            initial={still ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={still ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="overflow-hidden border-t border-[var(--dc-ink)]/8 bg-[var(--dc-sky-soft)]/50"
          >
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <DetailList title="Kisko milega" items={scheme.beneficiaries} />
              <DetailList title="Patrata (eligibility)" items={scheme.eligibility} />
              <DetailList title="Documents" items={scheme.documents} />
              <DetailList title="Process" items={scheme.process} ordered />
              {scheme.paymentMethod ? (
                <div className="sm:col-span-2">
                  <Heading>Paisa kaise milega</Heading>
                  <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-[var(--dc-body)]">
                    {scheme.paymentMethod}
                  </p>
                </div>
              ) : null}
              <SourceNote scheme={scheme} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--dc-body)]">{children}</p>
  );
}

function DetailList({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  if (!items.length) return null;
  const List = ordered ? "ol" : "ul";
  return (
    <div>
      <Heading>{title}</Heading>
      <List className={cn("mt-1.5 space-y-1", ordered && "list-inside list-decimal")}>
        {items.map((item) => (
          <li
            key={item}
            className={cn(
              "text-[12.5px] font-semibold leading-snug text-[var(--dc-body)]",
              !ordered && "flex gap-1.5",
            )}
          >
            {ordered ? null : <span aria-hidden="true" className="text-[var(--dc-blue-mid)]">•</span>}
            {item}
          </li>
        ))}
      </List>
    </div>
  );
}

/**
 * Where the figure came from, on the card rather than in a policy page.
 *
 * The status is read off the record, never assumed. A scheme nobody has
 * re-checked says so, and one with an unresolved question shows the question.
 */
function VerificationBadge({ scheme }: { scheme: LabourScheme }) {
  const { status } = scheme.verification;
  const verified = status === "verified";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wide",
        verified ? "bg-[#0f9d58]/12 text-[#0b7742]" : "bg-amber-500/15 text-amber-800",
      )}
    >
      {verified ? (
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {verified ? "Verified" : "Needs review"}
    </span>
  );
}

function SourceNote({ scheme }: { scheme: LabourScheme }) {
  const { providedBy, verifiedOn, sourceUrl, sourceTitle, caveat } = scheme.verification;
  return (
    <div className="sm:col-span-2 rounded-xl border border-[var(--dc-ink)]/10 bg-white p-3">
      <Heading>Jankari ka source</Heading>
      <p className="mt-1 text-[12px] font-semibold leading-snug text-[var(--dc-body)]">
        {sourceTitle}
        {providedBy ? ` · ${providedBy} dwara di gayi` : ""}
        {verifiedOn ? ` · last verified ${verifiedOn}` : ""}
      </p>
      {caveat ? (
        <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11.5px] font-bold leading-snug text-amber-800">
          {caveat}
        </p>
      ) : null}
      <p className="mt-1.5 text-[11.5px] font-medium leading-snug text-[var(--dc-body)]">
        Sarkari yojanaon ke niyam aur rakam samay-samay par badal sakti hain. Aakhri faisla vibhag ka hota hai —
        latest official notification zaroor dekh lijiye.
      </p>
      <a
        href={sourceUrl ?? "https://upbocw.in/"}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-[12.5px] font-bold text-[var(--dc-blue-deep)] ring-1 ring-[var(--dc-blue-deep)]/20 transition hover:ring-[var(--dc-blue-deep)]/50"
      >
        {sourceUrl ? "Official source" : "UPBOCW official portal"}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}
