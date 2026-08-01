"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { DigiConnectLoader } from "@/components/ui/digiconnect-loader";
import {
  NAV_LOADER_MAX_MS,
  NAV_LOADER_MIN_VISIBLE_MS,
  NAV_LOADER_SHOW_DELAY_MS,
  computeHideDelayMs,
  isInternalAppNavigation,
} from "@/hooks/use-navigation-loading";

/**
 * App Router navigation indicator:
 * - thin brand progress bar (immediate, non-blocking)
 * - DigiConnect fullscreen loader after a short delay (avoids flicker)
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [barActive, setBarActive] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const firstRender = useRef(true);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const maxTimer = useRef<number | null>(null);
  const shownAt = useRef<number | null>(null);
  const navigating = useRef(false);

  function clearShowAndMaxTimers() {
    if (showTimer.current != null) window.clearTimeout(showTimer.current);
    if (maxTimer.current != null) window.clearTimeout(maxTimer.current);
    showTimer.current = null;
    maxTimer.current = null;
  }

  function clearAllTimers() {
    clearShowAndMaxTimers();
    if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }

  function beginNavigation() {
    if (navigating.current) return;
    navigating.current = true;
    setBarActive(true);
    clearAllTimers();
    shownAt.current = null;
    setOverlayVisible(false);

    showTimer.current = window.setTimeout(() => {
      shownAt.current = Date.now();
      setOverlayVisible(true);
    }, NAV_LOADER_SHOW_DELAY_MS);

    maxTimer.current = window.setTimeout(() => {
      finishNavigation();
    }, NAV_LOADER_MAX_MS);
  }

  function finishNavigation() {
    if (!navigating.current) {
      setBarActive(false);
      setOverlayVisible(false);
      return;
    }
    navigating.current = false;
    clearShowAndMaxTimers();

    const delay = computeHideDelayMs({
      shownAt: shownAt.current,
      now: Date.now(),
      minVisibleMs: NAV_LOADER_MIN_VISIBLE_MS,
    });

    if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setOverlayVisible(false);
      setBarActive(false);
      shownAt.current = null;
    }, delay);
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    finishNavigation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const currentPathWithSearch = `${window.location.pathname}${window.location.search}`;
      if (
        !isInternalAppNavigation({
          href,
          currentOrigin: window.location.origin,
          currentPathWithSearch,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          button: event.button,
          target: anchor.getAttribute("target"),
          download: anchor.hasAttribute("download"),
        })
      ) {
        return;
      }

      beginNavigation();
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        className={`fixed left-0 top-0 z-[120] h-1 bg-gradient-to-r from-blue-700 via-sky-500 to-orange-500 shadow-[0_0_16px_rgba(37,99,235,0.35)] transition-all duration-500 motion-reduce:hidden ${
          barActive ? "w-full opacity-100" : "w-0 opacity-0"
        }`}
      />
      {overlayVisible ? (
        <DigiConnectLoader
          variant="fullscreen"
          size="lg"
          label="Loading DigiConnect Dukan..."
          showLabel
        />
      ) : null}
    </>
  );
}
