"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Landmark, Sparkles } from "lucide-react";

import { DIGI_PARTNER_BECOME_CTA_LABEL, DIGI_PARTNER_LANDING_ROUTE } from "@/lib/auth/partner-access";
import { NAV_CATEGORIES, NAV_POPULAR, NAV_SCHEMES } from "@/lib/nav-menu";
import { cn } from "@/lib/utils";

type MenuKey = "services" | "schemes";

/**
 * Primary header navigation.
 *
 * Two of the items open a menu; the rest are plain links. The interaction has
 * to work for three different input methods, and each one wants something
 * slightly different:
 *
 *   mouse    — opens on hover after a short intent delay, so dragging the
 *              pointer across the bar on the way somewhere else does not fire
 *              three menus in a row. Closing has a longer grace period than
 *              opening has a delay, because the pointer travels diagonally
 *              from the trigger to the far corner of the panel and would
 *              otherwise leave the hit area mid-journey.
 *   keyboard — Enter/Space toggles, Escape closes and returns focus to the
 *              trigger, and Tab out of the panel closes it. Hover intent is
 *              never involved.
 *   touch    — tap toggles. `pointerType` is checked rather than a hover
 *              media query because hybrid laptops report both.
 *
 * The open/close handlers sit on a wrapper that contains the trigger *and* the
 * panel, so moving onto the panel is never a "leave".
 */
export function HeaderNav({ isHome, isLoggedIn }: { isHome: boolean; isLoggedIn: boolean }) {
  const [open, setOpen] = useState<MenuKey | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const hoverOpen = (key: MenuKey) => (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(key), 90);
  };

  const hoverClose = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(null), 180);
  };

  // Escape closes from anywhere inside, and a click outside dismisses.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(null);
        rootRef.current?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${open}"]`)?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const linkClass =
    "rounded-lg px-2.5 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 xl:px-3 xl:text-xs";

  const triggerClass = (key: MenuKey) =>
    cn(
      "inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 xl:px-3 xl:text-xs",
      open === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    );

  return (
    <div ref={rootRef} className="relative" onPointerLeave={hoverClose}>
      <nav aria-label="Primary" className="flex max-w-full items-center justify-center gap-0.5">
        {/* Services — mega menu */}
        <div onPointerEnter={hoverOpen("services")}>
          <button
            type="button"
            data-menu-trigger="services"
            aria-expanded={open === "services"}
            aria-controls={`${baseId}-services`}
            aria-haspopup="true"
            onClick={() => setOpen(open === "services" ? null : "services")}
            className={triggerClass("services")}
          >
            Services
            <ChevronDown
              className={cn("h-3 w-3 transition-transform duration-200", open === "services" && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </div>

        <Link href={isHome ? "#categories" : "/services"} className={linkClass}>
          Categories
        </Link>

        {/* Schemes — compact menu */}
        <div onPointerEnter={hoverOpen("schemes")}>
          <button
            type="button"
            data-menu-trigger="schemes"
            aria-expanded={open === "schemes"}
            aria-controls={`${baseId}-schemes`}
            aria-haspopup="true"
            onClick={() => setOpen(open === "schemes" ? null : "schemes")}
            className={triggerClass("schemes")}
          >
            Schemes
            <ChevronDown
              className={cn("h-3 w-3 transition-transform duration-200", open === "schemes" && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </div>

        <Link href="/print" className={linkClass} onPointerEnter={hoverClose}>
          Smart Print
        </Link>
        <Link href="/track-application" className={linkClass} onPointerEnter={hoverClose}>
          Track
        </Link>
        <Link href={isHome ? "#support" : "/#support"} className={linkClass} onPointerEnter={hoverClose}>
          Help
        </Link>
        {!isLoggedIn ? (
          <Link href={DIGI_PARTNER_LANDING_ROUTE} className={linkClass} onPointerEnter={hoverClose}>
            {DIGI_PARTNER_BECOME_CTA_LABEL}
          </Link>
        ) : null}
      </nav>

      {/* ── Services mega menu ─────────────────────────────────────────── */}
      <MenuPanel id={`${baseId}-services`} open={open === "services"} className="w-[min(64rem,calc(100vw-3rem))]">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <p className="dc-eyebrow-rule-start inline-flex items-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--dc-flame)]">
              Browse by category
            </p>
            <ul className="mt-3 grid gap-1 sm:grid-cols-2">
              {NAV_CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <li key={category.slug}>
                    <Link
                      href={`/services/${category.slug}`}
                      onClick={() => setOpen(null)}
                      className="group flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[var(--dc-blue-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
                    >
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ background: "var(--dc-grad-blue)" }}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-extrabold text-[var(--dc-ink)]">
                          {category.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-medium leading-snug text-[var(--dc-muted)]">
                          {category.blurb}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="lg:border-l lg:border-slate-200/70 lg:pl-6">
            <p className="dc-eyebrow-rule-start inline-flex items-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--dc-flame)]">
              Popular right now
            </p>
            <ul className="mt-3 space-y-0.5">
              {NAV_POPULAR.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/services/${item.slug}`}
                    onClick={() => setOpen(null)}
                    className="group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-bold text-[var(--dc-ink)] transition hover:bg-[var(--dc-blue-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--dc-amber)]" aria-hidden="true" />
                      {item.label}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--dc-blue-bright)]"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href="/services"
              onClick={() => setOpen(null)}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-[12.5px] font-extrabold text-white transition hover:brightness-110"
              style={{ background: "var(--dc-grad-flame)" }}
            >
              See all services
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </MenuPanel>

      {/* ── Schemes menu ───────────────────────────────────────────────── */}
      <MenuPanel id={`${baseId}-schemes`} open={open === "schemes"} className="w-[min(30rem,calc(100vw-3rem))]">
        <p className="dc-eyebrow-rule-start inline-flex items-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--dc-flame)]">
          Government scheme assistance
        </p>
        <ul className="mt-3 grid gap-0.5 sm:grid-cols-2">
          {NAV_SCHEMES.map((scheme) => (
            <li key={scheme.slug}>
              <Link
                href={`/services/${scheme.slug}`}
                onClick={() => setOpen(null)}
                className="flex items-start gap-2.5 rounded-xl p-2.5 transition hover:bg-[var(--dc-blue-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
              >
                <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dc-blue-mid)]" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-extrabold text-[var(--dc-ink)]">{scheme.label}</span>
                  <span className="mt-0.5 block text-[11px] font-medium leading-snug text-[var(--dc-muted)]">
                    {scheme.blurb}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-xl bg-[var(--dc-blue-soft)] px-3 py-2 text-[11px] font-bold leading-snug text-[var(--dc-blue-mid)]">
          Private documentation assistance only — DigiConnect is not a government portal and claims no affiliation.
        </p>
      </MenuPanel>
    </div>
  );
}

/**
 * The dropped panel.
 *
 * Kept mounted and hidden rather than unmounted, so the open/close transition
 * has something to animate and the menu's links stay in the document for
 * crawlers. `inert` is what actually takes the hidden panel out of the tab
 * order — `pointer-events-none` alone would leave six invisible focus stops in
 * the header on every page.
 */
function MenuPanel({
  id,
  open,
  className,
  children,
}: {
  id: string;
  open: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      inert={!open}
      className={cn(
        "absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        className,
        open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
      )}
    >
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_28px_64px_-24px_rgba(0,10,40,0.45)] backdrop-blur-xl md:p-5">
        {children}
      </div>
    </div>
  );
}
