"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutGrid, X } from "lucide-react";

import { apDockItems, apNavGroups, isApNavItemActive } from "@/lib/ap/nav";
import { cn } from "@/lib/utils";

/**
 * The Digi Partner dock, and the sheet that holds everything else.
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
  const [navVisible, setNavVisible] = useState(true);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
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
            className="absolute inset-0 h-full w-full bg-slate-900/40 backdrop-blur-[2px]"
          />

          <div
            className="absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto rounded-t-[26px] bg-white pb-[calc(112px+env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(15,23,42,0.18)]"
            style={{ animation: "dc-sheet-up 220ms cubic-bezier(0.16,1,0.3,1)" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
              <div>
                <p className="text-[15px] font-black text-slate-900">Sab kuch</p>
                <p className="text-[11.5px] font-semibold text-slate-500">
                  Panel ka har section, ek jagah
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition active:scale-95 hover:bg-slate-100"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="space-y-5 px-4 pt-4">
              {groups.map((group) => (
                <section key={group.id}>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
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
                                : "border-slate-200 bg-white hover:border-slate-300",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                                active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500",
                              )}
                            >
                              <Icon className="h-4.5 w-4.5" aria-hidden />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[13.5px] font-bold text-slate-900">
                                {item.label}
                              </span>
                              {/*
                                Two lines, not one clipped one. A sentence cut
                                mid-word tells a partner less than no sentence.
                              */}
                              <span className="mt-0.5 block text-[11.5px] font-medium leading-snug text-slate-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
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
          aria-label="Digi Partner primary"
          className={cn(
            "pointer-events-auto mx-auto flex h-[70px] items-stretch justify-between gap-0.5 px-1.5 py-1.5",
            "rounded-[22px] border border-white/70 bg-white/92 backdrop-blur-xl",
            "shadow-[0_10px_36px_rgba(15,23,42,0.14)]",
          )}
        >
          {dock.map((item) => {
            const Icon = item.icon;
            const active = !sheetOpen && isApNavItemActive(pathname, item);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1",
                  "transition-colors duration-200 active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                  active ? "bg-blue-50 text-blue-700" : "text-slate-400 hover:bg-slate-50/80 hover:text-slate-600",
                )}
              >
                <Icon className={cn("h-[22px] w-[22px]", active ? "stroke-[2.2]" : "stroke-[1.7]")} aria-hidden />
                <span
                  className={cn(
                    "max-w-full truncate text-[11px] leading-none tracking-wide",
                    active ? "font-semibold" : "font-medium",
                  )}
                >
                  {item.label}
                </span>
                {active ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-600" aria-hidden /> : null}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setSheetOpen((open) => !open)}
            aria-expanded={sheetOpen}
            aria-label="Sab kuch — all sections"
            className={cn(
              "relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1",
              "transition-colors duration-200 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
              sheetOpen ? "bg-blue-50 text-blue-700" : "text-slate-400 hover:bg-slate-50/80 hover:text-slate-600",
            )}
          >
            <LayoutGrid
              className={cn("h-[22px] w-[22px]", sheetOpen ? "stroke-[2.2]" : "stroke-[1.7]")}
              aria-hidden
            />
            <span
              className={cn(
                "max-w-full truncate text-[11px] leading-none tracking-wide",
                sheetOpen ? "font-semibold" : "font-medium",
              )}
            >
              Sab kuch
            </span>
          </button>
        </nav>
      </div>
    </>
  );
}
