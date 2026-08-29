"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/*
  Hide the site chrome while reading, bring it back on the way up.

  The header and the tab bar both use this, from the same measurements, so they
  leave and return together rather than one lagging the other.

  The rules are deliberately conservative, because an earlier version of this
  got the tab bar stuck off screen after coming back from Apply:

  * Nothing hides until the page is past `ENGAGE_PX`. Near the top the chrome
    is always shown, whatever direction the last few pixels went.
  * A route change resets to visible, and scrolls are ignored for `SETTLE_MS`
    afterwards. The browser restores the old scroll position on a back
    navigation, which arrives as one large downward jump that nobody asked
    for — reacting to it is what used to leave the bar hidden on a page the
    reader had not scrolled at all.
  * Any upward movement shows the chrome immediately, as does reaching the
    bottom of the document, so it can never be stranded out of reach.
*/

const ENGAGE_PX = 140;
const HIDE_DELTA = 8;
const SHOW_DELTA = 6;
const SETTLE_MS = 500;
const BOTTOM_SLACK = 48;

/**
 * `true` while the chrome should be off screen.
 *
 * @param enabled pass `false` to pin the chrome in place — a menu is open, a
 *   sheet is up, the keyboard is covering half the screen.
 */
export function useChromeHiddenOnScroll(enabled = true): boolean {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  const lastY = useRef(0);
  const settledAt = useRef(0);
  const ticking = useRef(false);

  // A new route starts visible, and starts its own settle window.
  useEffect(() => {
    setHidden(false);
    lastY.current = window.scrollY;
    settledAt.current = Date.now() + SETTLE_MS;
  }, [pathname]);

  useEffect(() => {
    if (!enabled) {
      setHidden(false);
      return;
    }

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      window.requestAnimationFrame(() => {
        ticking.current = false;

        const y = window.scrollY;
        const delta = y - lastY.current;
        lastY.current = y;

        if (Date.now() < settledAt.current) return;

        const atTop = y < ENGAGE_PX;
        const atBottom =
          y + window.innerHeight >= document.documentElement.scrollHeight - BOTTOM_SLACK;

        if (atTop || atBottom) {
          setHidden(false);
          return;
        }

        if (delta > HIDE_DELTA) setHidden(true);
        else if (delta < -SHOW_DELTA) setHidden(false);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);

  return hidden && enabled;
}
