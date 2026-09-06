"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Clock,
  Compass,
  Eye,
  FileCheck2,
  FileText,
  IdCard,
  Landmark,
  ClipboardCheck,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";

import { ApplyServiceTrigger } from "@/components/service-selection-modal";
import { ServiceCard } from "@/components/homepage/service-card";
import { BrandField, BrandWash } from "@/components/homepage/brand-backdrop";
import { Stagger, StaggerItem } from "@/components/homepage/motion";
import { resolveHomepageServiceImage } from "@/lib/homepage-visual-assets";
import { directoryMeta, processingDays } from "@/lib/services/directory-meta";
import { rankServices, type SearchCatalogItem } from "@/lib/search/service-search";
import { servicesData, type ServiceItem } from "@/lib/services-data";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────
   Categories
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Categories come from the catalogue, not from a list kept here.
 *
 * The previous version of this page held its own eight-entry category list and
 * a slug-to-category map beside it — twenty-five hand-written rows deciding
 * which bucket each service belonged to. Every service already carries a
 * `categorySlug` and the display name that its own card prints, so the map was
 * a second, quieter answer to a question the data had already answered: add a
 * service in the admin and it landed in "Tax & Business" whatever it actually
 * was, because that was the fallback.
 *
 * All that is kept here is presentation — an icon and a one-line blurb per
 * known category — and both degrade to something sensible for a category
 * nobody anticipated.
 */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  tax: ReceiptText,
  loans: ClipboardCheck,
  banking: Landmark,
  insurance: ShieldCheck,
  cards: IdCard,
  licence: Compass,
  company: FileCheck2,
};

const CATEGORY_BLURB: Record<string, string> = {
  tax: "GST registration, returns and income tax filing",
  loans: "Subsidy, artisan and entrepreneur schemes",
  banking: "Accounts, credit cards and CIBIL support",
  insurance: "Vehicle cover and renewals",
  cards: "PVC printing, Voter ID, eShram and labour cards",
  licence: "Passport and driving licence applications",
  company: "Private limited, OPC, MSME, ISO and DSC",
};

/** Preferred running order; anything unknown follows, alphabetically. */
const CATEGORY_ORDER = ["tax", "loans", "banking", "insurance", "cards", "licence", "company"];

type DirectoryCategory = {
  id: string;
  label: string;
  icon: LucideIcon;
  desc: string;
  count: number;
};

/* ─────────────────────────────────────────────────────────────────────────
   Sorting
   ───────────────────────────────────────────────────────────────────────── */

/**
 * "Top rated" is gone from this list on purpose. It sorted by a hand-typed
 * rating that no customer had ever given, which made the ordering itself a
 * fabrication rather than just the number beside it.
 */
const SORTS = [
  { id: "relevance", label: "Best match" },
  { id: "popular", label: "Most requested" },
  { id: "fastest", label: "Fastest turnaround" },
  { id: "price-low", label: "Price: low to high" },
  { id: "price-high", label: "Price: high to low" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

/* ─────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────── */

type Props = {
  initialServices?: Omit<ServiceItem, "icon">[];
  /** Query carried over from another search box, e.g. the homepage hero. */
  initialQuery?: string;
};

/**
 * The services directory.
 *
 * Three things changed beyond the surface treatment.
 *
 * **It searches the same way the rest of the site does.** This page carried its
 * own six-entry synonym table and its own edit-distance matcher, so a query
 * typed here behaved differently from the identical query typed into the
 * homepage hero — and none of the shared core's fixes reached it. It now calls
 * `rankServices`, which is the module that exists precisely so there is one
 * definition of what a query means.
 *
 * **It shows no invented numbers.** The star ratings, the review counts and the
 * "50,000+ happy customers" band are gone; see `directory-meta.ts`.
 *
 * **It is one card.** The directory drew its own service tile; it now uses the
 * same `ServiceCard` as the homepage, with a quick-view control layered over it
 * so the drawer survives without turning the card into a button inside a link.
 */
export function ServicesDirectoryClient({ initialServices, initialQuery }: Props) {
  const services = useMemo<ServiceItem[]>(() => {
    const base = initialServices?.length ? initialServices : servicesData;
    return base.map((s) => {
      const fallback = servicesData.find((f) => f.slug === s.slug);
      return { ...s, icon: fallback?.icon ?? FileText } as ServiceItem;
    });
  }, [initialServices]);

  const [query, setQuery] = useState(initialQuery ?? "");
  const [category, setCategory] = useState("all");
  /**
   * `null` means "whatever suits the current state" — best match while a query
   * is being typed, most requested when the box is empty. It only becomes a
   * fixed value once the customer picks one from the menu, and it goes back to
   * auto if their pick stops being offered. Without this, typing a query while
   * the list sat on "Most requested" threw the ranking away silently, and
   * clearing the query left the menu showing an option that no longer existed.
   */
  const [sortChoice, setSortChoice] = useState<SortId | null>(null);
  const [selected, setSelected] = useState<ServiceItem | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const searchId = useId();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("service_recent_searches");
      if (stored) setRecent(JSON.parse(stored));
    } catch {
      // A corrupt or unavailable store is not worth failing the page over.
    }
  }, []);

  const rememberSearch = useCallback((value: string) => {
    const clean = value.trim().slice(0, 40);
    if (!clean) return;
    setRecent((prev) => {
      const next = [clean, ...prev.filter((q) => q !== clean)].slice(0, 5);
      try {
        localStorage.setItem("service_recent_searches", JSON.stringify(next));
      } catch {
        // Ignore: a private window still gets a working search.
      }
      return next;
    });
  }, []);

  // The catalogue in the shape the shared ranker expects.
  const catalog = useMemo<SearchCatalogItem[]>(
    () =>
      services.map((s) => ({
        slug: s.slug,
        title: s.title,
        shortDescription: s.shortDescription,
        priceLabel: s.priceLabel,
        category: s.category,
        amount: s.amount,
      })),
    [services],
  );

  const searching = query.trim().length > 0;
  const sort: SortId =
    sortChoice && (sortChoice !== "relevance" || searching) ? sortChoice : searching ? "relevance" : "popular";

  const results = useMemo(() => {
    const trimmed = query.trim();
    let list: ServiceItem[];

    if (trimmed) {
      // rankServices returns best-first and drops the irrelevant tail, so the
      // order it produces *is* the relevance sort.
      const order = new Map(rankServices(catalog, trimmed).map((s, i) => [s.slug, i]));
      list = services.filter((s) => order.has(s.slug)).sort((a, b) => order.get(a.slug)! - order.get(b.slug)!);
    } else {
      list = [...services];
    }

    if (category !== "all") list = list.filter((s) => (s.categorySlug || "services") === category);

    // "relevance" is the order rankServices already produced, so it needs no
    // pass of its own.
    if (sort === "popular") {
      list = [...list].sort((a, b) => directoryMeta(b.slug).weight - directoryMeta(a.slug).weight);
    } else if (sort === "fastest") {
      list = [...list].sort((a, b) => processingDays(a.slug) - processingDays(b.slug));
    } else if (sort === "price-low") {
      // "Enquiry Now" services have amount 0; they belong at the end of a price
      // sort, not at the top of it, because they have no price at all.
      list = [...list].sort((a, b) => (a.amount || Infinity) - (b.amount || Infinity));
    } else if (sort === "price-high") {
      list = [...list].sort((a, b) => b.amount - a.amount);
    }

    return list;
  }, [services, catalog, query, category, sort]);

  /**
   * Which card gets a photograph.
   *
   * `resolveHomepageServiceImage` matches on a regex, and several of its rules
   * are broad on purpose — one picture answers for every loan and scheme, one
   * for every company filing. On the homepage that shows six services at a
   * time it goes unnoticed. In a grid of thirty-four it produces rows of
   * identical stock photographs beside different service names, which is the
   * exact thing that makes a catalogue look padded.
   *
   * So a photograph is used only where it belongs to one service and no other.
   * Everything else falls through to the card's drawn band, which is built
   * from the service's own subject and therefore differs card to card.
   */
  const imageBySlug = useMemo(() => {
    const resolved = new Map<string, string | null>();
    const uses = new Map<string, number>();

    for (const s of services) {
      const src = resolveHomepageServiceImage(s.slug, s.title, s.heroImageUrl);
      resolved.set(s.slug, src);
      if (src) uses.set(src, (uses.get(src) ?? 0) + 1);
    }

    const unique = new Map<string, string | null>();
    for (const [slug, src] of resolved) unique.set(slug, src && uses.get(src) === 1 ? src : null);
    return unique;
  }, [services]);

  /**
   * The category strip, built from whatever the catalogue actually contains —
   * so the counts are always right and a category added in the admin appears
   * here without anyone editing this file.
   */
  const categories = useMemo<DirectoryCategory[]>(() => {
    const found = new Map<string, { label: string; count: number }>();
    for (const s of services) {
      const id = s.categorySlug || "services";
      const existing = found.get(id);
      if (existing) existing.count += 1;
      else found.set(id, { label: s.category || id, count: 1 });
    }

    const ids = [...found.keys()].sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

    return [
      { id: "all", label: "All services", icon: Sparkles, desc: "Everything in the catalogue", count: services.length },
      ...ids.map((id) => ({
        id,
        label: found.get(id)!.label,
        icon: CATEGORY_ICON[id] ?? FileText,
        desc: CATEGORY_BLURB[id] ?? "",
        count: found.get(id)!.count,
      })),
    ];
  }, [services]);

  const activeCategory = categories.find((c) => c.id === category);

  // No LazyMotion here: the page wraps everything in `MotionRoot`, which is
  // the one place the domAnimation bundle is declared. Nesting a second
  // provider would work, but it would also mean two places to keep in step.
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden text-white">
        <BrandField />

        <div className="relative z-10 mx-auto w-full max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] pb-12 pt-14 text-center sm:px-6 sm:pb-14 sm:pt-16 md:px-8">
          <p className="lg-pill-dark dc-hero-rise inline-flex items-center gap-2 py-1.5 pl-2 pr-4 text-[11px] font-bold sm:text-xs">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--dc-grad-flame)" }}
            >
              <Compass className="h-3 w-3 text-white" aria-hidden="true" />
            </span>
            {services.length} services · one directory
          </p>

          <h1
            className="dc-hero-rise mt-5 text-balance text-[2.1rem] font-extrabold leading-[1.06] tracking-[-0.028em] sm:text-[3rem] lg:text-[3.6rem]"
            style={{ animationDelay: "80ms" }}
          >
            Har service, ek hi{" "}
            <span className="dc-hero-accent dc-text-flame">directory mein</span>
          </h1>

          <p
            className="dc-hero-rise mx-auto mt-4 max-w-[52ch] text-pretty text-[14.5px] font-medium leading-relaxed text-white/72 sm:text-[16.5px]"
            style={{ animationDelay: "150ms" }}
          >
            Naam se dhoondhiye ya category se browse kijiye. Har card par turnaround aur fees pehle se saaf.
          </p>

          {/* Search dock */}
          <div
            className="dc-hero-rise relative z-30 mx-auto mt-8 w-full max-w-2xl"
            style={{ animationDelay: "220ms" }}
          >
            <div className="lg-card-dark rounded-[1.85rem] p-1.5 sm:rounded-full sm:p-2.5">
              <div className="flex items-center gap-1.5 rounded-[1.5rem] border border-white/70 bg-white p-1.5 shadow-[0_18px_44px_-22px_rgba(0,10,40,0.55)] transition duration-300 focus-within:ring-2 focus-within:ring-[var(--dc-amber)]/45 sm:rounded-full sm:p-2">
                <Search className="ml-3 h-[18px] w-[18px] shrink-0 text-slate-400 sm:ml-4" aria-hidden="true" />
                <label htmlFor={searchId} className="sr-only">
                  Search services
                </label>
                <input
                  id={searchId}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onBlur={() => rememberSearch(query)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") rememberSearch(query);
                  }}
                  placeholder="GST, passport, licence, CIBIL…"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-base font-semibold text-[var(--dc-ink)] outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:appearance-none sm:py-3 sm:text-[15px]"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>

            {recent.length && !query ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">Recent</span>
                {recent.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="lg-pill-dark lg-raise-dark px-3 py-1.5 text-[12px] font-bold text-white/85"
                  >
                    {term}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Category browser ─────────────────────────────────────────── */}
      <section className="dc-ambient relative overflow-hidden bg-white px-[var(--mobile-page-gutter)] py-10 sm:px-6 md:px-8 md:py-14">
        <BrandWash variant="blue" />

        <div className="relative mx-auto w-full max-w-[var(--dc-max)]">
          <p className="dc-eyebrow-rule-start inline-flex items-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--dc-flame)]">
            Browse
          </p>
          <h2 className="mt-2.5 text-[1.6rem] font-extrabold leading-[1.12] tracking-[-0.025em] text-[var(--dc-ink)] sm:text-[2rem]">
            Pick a category
          </h2>

          <Stagger as="ul" className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
            {categories.map((cat, index) => {
              const Icon = cat.icon;
              const active = category === cat.id;
              const count = cat.count;
              return (
                <StaggerItem as="li" key={cat.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCategory(cat.id);
                      document.getElementById("directory")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    aria-pressed={active}
                    className={cn(
                      "lg-card lg-raise lg-sheen flex h-full w-full flex-col items-start gap-2.5 p-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)] sm:p-4",
                      active && "ring-2 ring-[var(--dc-flame)]/45",
                    )}
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] text-white shadow-[0_8px_18px_-8px_rgba(0,29,95,0.7)]"
                      style={{ background: index === 0 ? "var(--dc-grad-flame)" : "var(--dc-grad-blue)" }}
                    >
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-extrabold leading-tight text-[var(--dc-ink)]">
                        {cat.label}
                      </span>
                      <span className="mt-1 block text-[11.5px] font-medium leading-snug text-[var(--dc-body)]">
                        {cat.desc}
                      </span>
                    </span>
                    <span className="mt-auto inline-flex items-center rounded-full bg-[var(--dc-blue-soft)] px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--dc-blue-mid)]">
                      {count} service{count === 1 ? "" : "s"}
                    </span>
                  </button>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* ── Directory ────────────────────────────────────────────────── */}
      <section
        id="directory"
        className="dc-ambient relative scroll-mt-24 overflow-hidden bg-[var(--dc-sky-soft)] px-[var(--mobile-page-gutter)] py-10 sm:px-6 md:px-8 md:py-14"
      >
        <BrandWash variant="dual" />

        <div className="relative mx-auto w-full max-w-[var(--dc-max)]">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="dc-eyebrow-rule-start inline-flex items-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--dc-flame)]">
                Directory
              </p>
              <h2 className="mt-2.5 text-[1.6rem] font-extrabold leading-[1.12] tracking-[-0.025em] text-[var(--dc-ink)] sm:text-[2rem]">
                {results.length} service{results.length === 1 ? "" : "s"}
                {category !== "all" ? (
                  <span className="text-[var(--dc-blue-mid)]">
                    {" "}
                    in {activeCategory?.label}
                  </span>
                ) : null}
              </h2>
            </div>

            <label className="lg-card flex items-center gap-2 rounded-full px-4 py-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-muted)]">
                Sort
              </span>
              <select
                value={sort}
                onChange={(e) => setSortChoice(e.target.value as SortId)}
                className="cursor-pointer bg-transparent text-[13px] font-bold text-[var(--dc-ink)] outline-none"
              >
                {SORTS.filter((s) => s.id !== "relevance" || searching).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Active filter chips */}
          {category !== "all" || query.trim() ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {query.trim() ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="lg-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-bold text-[var(--dc-ink)]"
                >
                  “{query.trim()}”
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : null}
              {category !== "all" ? (
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  className="lg-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-bold text-[var(--dc-ink)]"
                >
                  {activeCategory?.label}
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ) : null}

          {results.length ? (
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((service) => (
                <li key={service.slug} className="relative">
                  <ServiceCard
                    service={service}
                    imageSrc={imageBySlug.get(service.slug) ?? null}
                    sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 300px"
                  />
                  {/*
                    Quick view sits over the card rather than inside it. The
                    card is a link end to end, and a button nested in an anchor
                    is invalid markup that browsers resolve inconsistently — so
                    the drawer trigger is layered above instead.

                    It loses its label below `sm`. The grid is two columns on a
                    390px phone, so a card is about 180px wide, and the pill
                    with its words in the corner opposite the badge landed on
                    top of it. The eye alone clears it, and the button keeps its
                    name for screen readers either way.
                  */}
                  <button
                    type="button"
                    onClick={() => setSelected(service)}
                    aria-label={`Quick view: ${service.title}`}
                    className="lg-pill lg-raise absolute right-2 top-2 z-10 inline-flex h-11 min-w-11 items-center justify-center gap-1.5 px-2.5 text-[11.5px] font-extrabold text-[var(--dc-blue-mid)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)] sm:px-3"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Quick view</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="lg-card mt-6 flex flex-col items-center gap-3 rounded-[1.5rem] px-6 py-14 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                style={{ background: "var(--dc-grad-blue)" }}
              >
                <Search className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-[17px] font-extrabold text-[var(--dc-ink)]">Kuch nahi mila</p>
              <p className="max-w-sm text-[14px] font-medium leading-relaxed text-[var(--dc-body)]">
                “{query.trim()}” se koi service match nahi hui. Doosre shabd try kijiye, ya poori list dekhiye.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
                className="mt-1 inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-extrabold text-white transition duration-300 hover:brightness-110"
                style={{ background: "var(--dc-grad-flame)" }}
              >
                Show all services
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </section>

      <ServiceDrawer service={selected} onClose={() => setSelected(null)} />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Quick-view drawer
   ───────────────────────────────────────────────────────────────────────── */

function ServiceDrawer({ service, onClose }: { service: ServiceItem | null; onClose: () => void }) {
  const reduced = useReducedMotion();

  // Escape closes, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!service) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [service, onClose]);

  const meta = service ? directoryMeta(service.slug) : null;
  const Icon = service?.icon ?? FileText;

  return (
    <AnimatePresence>
      {service && meta ? (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-[#00102c]/45 backdrop-blur-sm"
            aria-hidden="true"
          />

          <m.div
            role="dialog"
            aria-modal="true"
            aria-label={`${service.title} details`}
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={reduced ? { opacity: 1 } : { y: 0, x: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[60] flex h-[88vh] flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-[0_-8px_60px_rgba(0,10,40,0.25)] md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-full md:max-w-lg md:rounded-l-[2rem] md:rounded-tr-none"
          >
            {/* Header, on the brand ramp so the drawer belongs to the page */}
            <div className="relative shrink-0 overflow-hidden px-5 py-5" style={{ background: "var(--dc-grad-blue)" }}>
              <div className="dc-jaali pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden="true" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="lg-pill-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-amber)]">
                      {service.category}
                    </p>
                    <h2 className="mt-0.5 text-[17px] font-extrabold leading-tight text-white">{service.title}</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="lg-pill-dark lg-raise-dark flex h-9 w-9 shrink-0 items-center justify-center text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="relative mt-4 grid grid-cols-2 gap-2.5">
                <div className="lg-card-dark px-3.5 py-2.5">
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/55">
                    <Clock className="h-3 w-3" aria-hidden="true" /> Turnaround
                  </p>
                  <p className="mt-0.5 text-[14px] font-extrabold text-white">{meta.processingTime}</p>
                </div>
                <div className="lg-card-dark px-3.5 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/55">Assistance fee</p>
                  <p className="mt-0.5 text-[14px] font-extrabold text-white">{service.priceLabel}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <Block title="Overview">
                <p className="text-[14px] font-medium leading-relaxed text-[var(--dc-body)]">{service.overview}</p>
              </Block>

              {service.benefits?.length ? (
                <Block title="What you get">
                  <ul className="space-y-2">
                    {service.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-[13.5px] font-medium text-[var(--dc-body)]">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dc-teal)]" aria-hidden="true" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </Block>
              ) : null}

              {service.documents?.length ? (
                <Block title="Documents required">
                  <ul className="space-y-2">
                    {service.documents.map((d) => (
                      <li key={d} className="flex items-start gap-2.5 text-[13.5px] font-medium text-[var(--dc-body)]">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dc-blue-bright)]" aria-hidden="true" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </Block>
              ) : null}

              <Block title="Eligibility">
                <p className="lg-card rounded-xl p-3.5 text-[13.5px] font-bold leading-relaxed text-[var(--dc-ink)]">
                  {meta.eligibility}
                </p>
              </Block>

              {service.faqs?.length ? (
                <Block title="Common questions">
                  <div className="space-y-2.5">
                    {service.faqs.slice(0, 3).map((faq) => (
                      <div key={faq.question} className="lg-card rounded-xl p-3.5">
                        <p className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">{faq.question}</p>
                        <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-[var(--dc-body)]">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </Block>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-[var(--dc-blue-bright)]/12 bg-white p-4">
              <ApplyServiceTrigger
                serviceSlug={service.slug}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-extrabold text-white shadow-[0_12px_26px_-12px_rgba(247,74,1,0.95)] transition duration-300 hover:brightness-110"
              >
                {service.amount > 0 ? "Apply now" : "Get a quote"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ApplyServiceTrigger>
            </div>
          </m.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="dc-eyebrow-rule-start inline-flex items-center text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-[var(--dc-flame)]">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
