"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { AP_MOBILE_NAV_ITEMS, isNavItemActive } from "@/lib/ap/mobile-nav-config";
import { cn } from "@/lib/utils";

/**
 * Floating Digi Partner mobile bottom dock.
 * Scroll hide/show + visualViewport keyboard awareness live here only.
 */
export function ApMobileBottomNav() {
  const pathname = usePathname();
  const [navVisible, setNavVisible] = useState(true);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const lastScrollY = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    setNavVisible(true);
    lastScrollY.current = typeof window !== "undefined" ? window.scrollY : 0;
  }, [pathname]);

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

  const show = navVisible && !keyboardOpen;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-3 z-50 md:hidden",
        "transition-transform duration-300 ease-out will-change-transform",
        show
          ? "translate-y-0"
          : "translate-y-[calc(100%+env(safe-area-inset-bottom)+24px)]",
      )}
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      <nav
        aria-label="Digi Partner primary"
        className={cn(
          "pointer-events-auto mx-auto flex h-[70px] items-stretch justify-between gap-0.5 px-1.5 py-1.5",
          "rounded-[22px] bg-white/92 backdrop-blur-xl",
          "border border-white/70",
          "shadow-[0_10px_36px_rgba(15,23,42,0.14)]",
        )}
      >
        {AP_MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(pathname, item);

          return (
            <Link
              key={item.key}
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
              <Icon
                className={cn("h-[22px] w-[22px]", active ? "stroke-[2.2]" : "stroke-[1.7]")}
                aria-hidden
              />
              <span
                className={cn(
                  "max-w-full truncate text-[11px] leading-none tracking-wide",
                  active ? "font-semibold" : "font-medium",
                )}
              >
                {item.label}
              </span>
              {active ? (
                <span
                  className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-600"
                  aria-hidden
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
