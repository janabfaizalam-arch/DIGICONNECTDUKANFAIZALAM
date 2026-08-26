"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CornerDownRight,
  Gift,
  HelpCircle,
  History,
  LoaderCircle,
  Printer,
  Search,
  Sparkles,
  UserRound,
  X,
  Zap,
} from "lucide-react";

import {
  fallbackCatalog,
  normalizeQuery,
  rankServices,
  serviceHref,
  serviceSearchHref,
  suggestSpelling,
  type SearchCatalogItem,
} from "@/lib/search/service-search";

const RECENT_SEARCHES_KEY = "pvc-recent-searches";
const MAX_RECENT = 5;
const MAX_RESULTS = 6;

/**
 * Destinations that are not services but are what the customer meant.
 * Every href is a route that exists in this app.
 */
const QUICK_ACTIONS = [
  {
    title: "Track application",
    href: "/track-application",
    description: "Check where your file has reached",
    icon: CornerDownRight,
    terms: ["track", "status", "check", "arn", "progress", "application"],
  },
  {
    title: "Smart Print",
    href: "/print",
    description: "Upload, print and collect PVC cards",
    icon: Printer,
    terms: ["print", "pvc", "plastic", "smart card", "upload pdf"],
  },
  {
    title: "Wallet & cashback",
    href: "/customer/dashboard?tab=wallet",
    description: "Balance, rewards and transactions",
    icon: Sparkles,
    terms: ["wallet", "balance", "cashback", "passbook", "ledger", "rewards"],
  },
  {
    title: "Refer & earn",
    href: "/customer/dashboard?tab=referral",
    description: "Invite friends and earn rewards",
    icon: Gift,
    terms: ["refer", "referral", "earn", "invite", "bonus"],
  },
  {
    title: "My profile & KYC",
    href: "/customer/dashboard?tab=profile",
    description: "Contact details, address and documents",
    icon: UserRound,
    terms: ["profile", "account", "kyc", "address", "password", "setting"],
  },
  {
    title: "Help & support",
    href: "/customer/dashboard?tab=support",
    description: "Talk to the team about any application",
    icon: HelpCircle,
    terms: ["support", "help", "contact", "call", "whatsapp", "care"],
  },
  {
    title: "Browse all services",
    href: "/services",
    description: "The full catalogue, by category",
    icon: Zap,
    terms: ["all", "services", "catalog", "catalogue", "browse", "apply"],
  },
] as const;

const POPULAR_SEARCHES = ["GST Registration", "ITR Filing", "Passport", "Driving Licence", "Insurance"];

/** Wraps the matched span so the customer can see why a row is in the list. */
function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;

  const escaped = needle.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === needle.toLowerCase() ? (
          <mark key={index} className="rounded-[3px] bg-[var(--dc-orange-soft)] px-0.5 font-extrabold text-[var(--dc-orange-700)]">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

type HeroServiceSearchProps = {
  /** Live catalogue from the server. Falls back to the bundled list. */
  catalog?: SearchCatalogItem[];
};

/**
 * The hero search.
 *
 * It searches the site's real service catalogue — the same rows the /services
 * directory renders — through the shared ranking in @/lib/search/service-search,
 * so a result is never a link to a page that does not exist.
 */
export function HeroServiceSearch({ catalog }: HeroServiceSearchProps) {
  const router = useRouter();
  const listboxId = useId();
  const inputId = useId();

  const searchCatalog = useMemo<SearchCatalogItem[]>(
    () => (catalog && catalog.length ? catalog : fallbackCatalog()),
    [catalog],
  );

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmed = query.trim();
  const hasQuery = normalizeQuery(query).length > 0;

  const services = useMemo(
    () => (hasQuery ? rankServices(searchCatalog, query).slice(0, MAX_RESULTS) : []),
    [hasQuery, query, searchCatalog],
  );

  const actions = useMemo(() => {
    if (!hasQuery) return [];
    const q = normalizeQuery(query);
    return QUICK_ACTIONS.filter(
      (action) =>
        action.title.toLowerCase().includes(q) ||
        action.description.toLowerCase().includes(q) ||
        action.terms.some((term) => term.includes(q) || q.includes(term)),
    ).slice(0, 3);
  }, [hasQuery, query]);

  const suggestion = useMemo(
    () => (hasQuery && services.length === 0 && actions.length === 0 ? suggestSpelling(query) : null),
    [hasQuery, services.length, actions.length, query],
  );

  /** Flat list the arrow keys walk, in the order the rows are painted. */
  const options = useMemo(
    () => [
      ...actions.map((action) => ({ key: `action-${action.title}`, label: action.title, href: action.href })),
      ...services.map((service) => ({
        key: `service-${service.slug}`,
        label: service.title,
        href: serviceHref(service.slug),
      })),
    ],
    [actions, services],
  );

  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecent(parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT));
        }
      }
    } catch {
      /* a corrupt entry is not worth reporting to the customer */
    }
  }, []);

  /**
   * Close on an outside click or Escape.
   *
   * Listening on the document rather than rendering a backdrop keeps this
   * independent of paint order — a backdrop inside this component's own
   * stacking context can be painted over, which once left the panel stuck open.
   */
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  function remember(term: string) {
    const clean = term.trim().slice(0, 40);
    if (!clean) return;
    setRecent((prev) => {
      const next = [clean, ...prev.filter((item) => item !== clean)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {
        /* private mode — the search still works, it just does not remember */
      }
      return next;
    });
  }

  function go(href: string, label: string) {
    remember(label);
    setIsOpen(false);
    setIsNavigating(true);
    router.push(href);
  }

  /** The button and a bare Enter both resolve to the best available match. */
  function submit() {
    if (!trimmed) {
      inputRef.current?.focus();
      setIsOpen(true);
      return;
    }
    const best = services[0];
    if (best) {
      go(serviceHref(best.slug), best.title);
      return;
    }
    go(serviceSearchHref(trimmed), trimmed);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!options.length) return;
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => {
        const step = event.key === "ArrowDown" ? 1 : -1;
        return (prev + step + options.length) % options.length;
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const active = activeIndex >= 0 ? options[activeIndex] : null;
      if (active) {
        go(active.href, active.label);
        return;
      }
      submit();
    }
  }

  const activeOptionId = activeIndex >= 0 && options[activeIndex] ? `${listboxId}-${activeIndex}` : undefined;

  return (
    <div ref={rootRef} className="relative w-full">
      <div
        className="flex items-center gap-1.5 rounded-[1.5rem] border border-white/70 bg-white p-1.5 shadow-[0_18px_44px_-22px_rgba(0,10,40,0.55)] transition duration-300 focus-within:border-white focus-within:shadow-[0_24px_60px_-20px_rgba(0,10,40,0.7)] focus-within:ring-2 focus-within:ring-[var(--dc-amber)]/45 sm:rounded-full sm:p-2"
      >
        <Search className="ml-3 h-[18px] w-[18px] shrink-0 text-slate-400 sm:ml-4" aria-hidden="true" />

        <label htmlFor={inputId} className="sr-only">
          Search DigiConnect Dukan services
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          // Escape closes the panel but leaves focus on the input, so a second
          // click fires no focus event. Without this the box looks dead.
          onClick={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search GST, ITR, Passport, Driving Licence..."
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          // The native search-cancel glyph would sit beside our own clear
          // button and read as two crosses doing the same job.
          className="min-w-0 flex-1 bg-transparent py-2.5 text-base font-semibold text-[var(--dc-ink)] outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:appearance-none sm:py-3 sm:text-[15px]"
        />

        {trimmed ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-600)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={isNavigating}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(247,74,1,0.9)] transition duration-300 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-flame)] disabled:opacity-70 sm:h-12 sm:px-6"
          style={{ background: "var(--dc-grad-flame)" }}
        >
          {isNavigating ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4 sm:hidden" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">Search Services</span>
          <span className="sr-only sm:hidden">Search Services</span>
        </button>
      </div>

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Service suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-2.5 max-h-[min(58vh,420px)] space-y-3 overflow-y-auto overflow-x-hidden rounded-2xl border border-[var(--dc-blue-bright)]/12 bg-white p-3 text-left shadow-[0_28px_64px_-24px_rgba(0,10,40,0.55)] sm:p-4"
        >
          {!hasQuery ? (
            <>
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Popular searches</p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setQuery(term);
                        inputRef.current?.focus();
                      }}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {recent.length ? (
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Recent</p>
                  <div className="space-y-0.5">
                    {recent.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setQuery(term);
                          inputRef.current?.focus();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        <History className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
                        <span className="truncate">{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {actions.length ? (
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Quick actions</p>
                  <div className="space-y-1">
                    {actions.map((action, index) => {
                      const Icon = action.icon;
                      const isActive = index === activeIndex;
                      return (
                        <Link
                          key={action.title}
                          id={`${listboxId}-${index}`}
                          role="option"
                          aria-selected={isActive}
                          href={action.href}
                          onClick={() => remember(action.title)}
                          className={`flex items-center justify-between gap-3 rounded-xl p-2 transition ${
                            isActive ? "bg-[var(--dc-blue-700)] text-white" : "hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                isActive ? "bg-white/20 text-white" : "bg-[var(--dc-blue-soft)] text-[var(--dc-blue-700)]"
                              }`}
                            >
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                              <span className={`block truncate text-xs font-bold ${isActive ? "text-white" : "text-[var(--dc-ink)]"}`}>
                                {action.title}
                              </span>
                              <span className={`mt-0.5 block truncate text-[10.5px] font-semibold ${isActive ? "text-white/80" : "text-slate-400"}`}>
                                {action.description}
                              </span>
                            </span>
                          </span>
                          <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-white" : "text-slate-300"}`} aria-hidden="true" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {services.length ? (
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Services</p>
                  <div className="space-y-1">
                    {services.map((service, index) => {
                      const optionIndex = actions.length + index;
                      const isActive = optionIndex === activeIndex;
                      return (
                        <Link
                          key={service.slug}
                          id={`${listboxId}-${optionIndex}`}
                          role="option"
                          aria-selected={isActive}
                          href={serviceHref(service.slug)}
                          onClick={() => remember(service.title)}
                          className={`flex items-center justify-between gap-3 rounded-xl p-2 transition ${
                            isActive ? "bg-[var(--dc-blue-700)] text-white" : "hover:bg-slate-50"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className={`block truncate text-[13px] font-bold ${isActive ? "text-white" : "text-[var(--dc-ink)]"}`}>
                              <Highlight text={service.title} query={trimmed} />
                            </span>
                            <span className={`mt-0.5 block truncate text-[11px] font-semibold ${isActive ? "text-white/80" : "text-slate-400"}`}>
                              {service.shortDescription}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-black ${
                              isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {service.priceLabel}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {!services.length && !actions.length ? (
                <div className="px-2 py-5 text-center">
                  <p className="text-sm font-bold text-[var(--dc-ink)]">No service matches “{trimmed}”</p>
                  {suggestion ? (
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Did you mean{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="font-bold text-[var(--dc-blue-700)] underline"
                      >
                        {suggestion}
                      </button>
                      ?
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Try a shorter word, or browse the full catalogue.
                    </p>
                  )}
                  <Link
                    href={serviceSearchHref(trimmed)}
                    onClick={() => remember(trimmed)}
                    className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--dc-blue-700)] px-4 text-xs font-bold text-white transition hover:bg-[var(--dc-blue-600)]"
                  >
                    Browse all services
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
