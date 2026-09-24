"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, X } from "lucide-react";

import { apDockItems, apNavGroups, isApNavItemActive } from "@/lib/ap/nav";
import { cn } from "@/lib/utils";

/**
 * The DC Partner dock, and the sheet that holds everything else.
 *
 * Four destinations sit in the dock and the fifth button opens the whole
 * panel. That is the fix for "kuchh dikh hi nahin rahe" on a phone: the dock
 * used to be five fixed links, and the other twenty screens had no way in at
 * all — no menu, no directory, nothing. Now every section is one tap away,
 * grouped and described, without a sixth tab making the dock unusable.
 *
 * Scroll-hide and keyboard-awareness stay here: this is the only thing that
 * floats over a partner's content, so it is the only thing that must get out
 * of the way while they read or type.
 */
export function ApMobileBottomNav({ canManageTeam = false }: { canManageTeam?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  /**
   * The tab the partner just tapped, highlighted before the route has settled.
   *
   * A dynamic route takes a round trip, and a dock that only lights up once
   * the server answers feels broken on a slow connection — people tap again.
   * This lights the tab on touch and hands over to the real pathname when it
   * arrives.
   */
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [navVisible, setNavVisible] = useState(true);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const lastScrollY = useRef(0);
  const rafId = useRef<number | null>(null);

  const dock = apDockItems();
  const groups = apNavGroups({ canManageTeam });

  useEffect(() => {
    setNavVisible(true);
    setSheetOpen(false);
    lastScrollY.current = typeof window !== "undefined" ? window.scrollY : 0;
  }, [pathname]);

  // A sheet over the page must not let the page behind it scroll away.
  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      if (rafId.current != null) return;
      rafId.current = window.requestAnimationFrame(() => {
        rafId.current = null;
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;

        if (currentY < 80) {
          setNavVisible(true);
          lastScrollY.current = currentY;
          return;
        }

        if (Math.abs(delta) < 8) return;

        setNavVisible(delta < 0);
        lastScrollY.current = currentY;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId.current != null) {
        window.cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, []);

  const show = (navVisible && !keyboardOpen) || sheetOpen;

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      const reduction = window.innerHeight - vv.height;
      setKeyboardOpen(reduction > 120);
    };

    handleResize();
    vv.addEventListener("resize", handleResize);
    vv.addEventListener("scroll", handleResize);
    return () => {
      vv.removeEventListener("resize", handleResize);
      vv.removeEventListener("scroll", handleResize);
    };
  }, []);

  return (
    <>
      {sheetOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="All sections">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 h-full w-full bg-[rgba(10,24,52,0.3)] backdrop-blur-sm"
          />

          <div
            className="absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto rounded-t-[24px] border-t border-white/60 bg-[rgba(246,249,255,0.94)] pb-[calc(106px+env(safe-area-inset-bottom))] shadow-[0_-16px_48px_-12px_rgba(10,24,52,0.35)] backdrop-blur-2xl"
            style={{ animation: "dc-sheet-up 220ms cubic-bezier(0.16,1,0.3,1)" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--dcp-line)] bg-[rgba(246,249,255,0.92)] px-4 py-3 backdrop-blur-xl">
              <div>
                <p className="text-[15px] font-bold text-[var(--dcp-ink)]">Sab kuch</p>
                <p className="text-[11.5px] font-medium text-[var(--dcp-ink-3)]">
                  Panel ka har section, ek jagah
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--dcp-ink-3)] transition active:scale-95 hover:bg-white hover:text-[var(--dcp-ink)]"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="space-y-5 px-4 pt-4">
              {groups.map((group) => (
                <section key={group.id}>
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-[var(--dcp-ink-4)]">
                    {group.label}
                  </p>
                  <ul className="mt-2 grid gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isApNavItemActive(pathname, item);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setSheetOpen(false)}
                            className={cn(
                              "flex min-h-[56px] items-center gap-3 rounded-2xl border px-3 py-2.5 transition active:scale-[0.99]",
                              active
                                ? "border-blue-200 bg-blue-50"
                                : "border-[var(--dcp-line)] bg-white hover:border-[var(--dcp-line-2)]",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                                active ? "bg-blue-600 text-white" : "bg-[var(--dcp-surface-3)] text-[var(--dcp-ink-3)]",
                              )}
                            >
                              <Icon className="h-4.5 w-4.5" aria-hidden />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[13.5px] font-bold text-[var(--dcp-ink)]">
                                {item.label}
                              </span>
                              {/*
                                Two lines, not one clipped one. A sentence cut
                                mid-word tells a partner less than no sentence.
                              */}
                              <span className="mt-0.5 block text-[11.5px] font-medium leading-snug text-[var(--dcp-ink-3)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                                {item.description}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "pointer-events-none fixed inset-x-3 z-[60] lg:hidden",
          "transition-transform duration-300 ease-out will-change-transform",
          show ? "translate-y-0" : "translate-y-[calc(100%+env(safe-area-inset-bottom)+24px)]",
        )}
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
      >
        <nav
          aria-label="DC Partner primary"
          className={cn(
            "pointer-events-auto mx-auto flex h-[58px] items-stretch justify-between gap-0.5 p-1",
            // Liquid glass: barely-there white over a deep, saturated blur, a
            // bright rim along the top edge and a soft one inside the bottom.
            // The page colour is meant to move through it as you scroll — at
            // 68% it still read as a white bar with a blur behind it.
            "rounded-[22px] border border-white/50 bg-white/45",
            "[backdrop-filter:blur(34px)_saturate(2)] [-webkit-backdrop-filter:blur(34px)_saturate(2)]",
            "shadow-[0_18px_44px_-12px_rgba(10,24,52,0.32),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(255,255,255,0.35)]",
          )}
        >
          {dock.map((item) => {
            const Icon = item.icon;
            const active =
              !sheetOpen &&
              (pendingHref ? pendingHref === item.href : isApNavItemActive(pathname, item));

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onPointerDown={() => setPendingHref(item.href)}
                onClick={(event) => {
                  // Take over the navigation so the highlight and the route
                  // change begin in the same tick.
                  event.preventDefault();
                  setPendingHref(item.href);
                  startTransition(() => router.push(item.href));
                }}
                className={cn(
                  "relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-[18px] px-0.5",
                  "transition-all duration-200 active:scale-[0.92]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dcp-brand)]",
                  active
                    ? "bg-white/70 text-[var(--dcp-brand-deep)] shadow-[0_2px_8px_-3px_rgba(10,24,52,0.18)]"
                    : "text-[var(--dcp-ink-3)] active:bg-white/40",
                )}
              >
                <Icon
                  className={cn("h-[19px] w-[19px] transition-transform duration-200", active ? "stroke-[2.1] scale-105" : "stroke-[1.6]")}
                  aria-hidden
                />
                <span
                  className={cn(
                    "max-w-full truncate text-[9.5px] leading-none tracking-[0.01em]",
                    active ? "font-bold" : "font-medium",
                  )}
                >
                  {item.dockLabel ?? item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setSheetOpen((open) => !open)}
            aria-expanded={sheetOpen}
            aria-label="Sab kuch — all sections"
            className={cn(
              "relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-[18px] px-0.5",
              "transition-all duration-200 active:scale-[0.92]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dcp-brand)]",
              sheetOpen
                ? "bg-white/70 text-[var(--dcp-brand-deep)] shadow-[0_2px_8px_-3px_rgba(10,24,52,0.18)]"
                : "text-[var(--dcp-ink-3)] active:bg-white/40",
            )}
          >
            <LayoutGrid
              className={cn("h-[19px] w-[19px] transition-transform duration-200", sheetOpen ? "stroke-[2.1] scale-105" : "stroke-[1.6]")}
              aria-hidden
            />
            <span
              className={cn(
                "max-w-full truncate text-[9.5px] leading-none tracking-[0.01em]",
                sheetOpen ? "font-bold" : "font-medium",
              )}
            >
              More
            </span>
          </button>
        </nav>
      </div>
    </>
  );
}
