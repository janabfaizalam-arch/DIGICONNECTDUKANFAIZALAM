"use client";

import { useEffect } from "react";

/**
 * Lets the Homepage Studio point at a band in the live preview.
 *
 * The studio's list and the page in the frame are the same twenty-odd bands in
 * the same order, and matching one against the other by eye is exactly the
 * work this screen exists to remove. Clicking a row posts the band's id here;
 * this scrolls to it and outlines it for a moment.
 *
 * Only rendered when the page is loaded with `?preview=`, so a real visitor
 * ships neither the listener nor the outline. Messages are accepted only from
 * this site's own origin — the page is public, and anything embedding it could
 * otherwise drive it.
 */
export function HomepagePreviewBridge() {
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const data = event.data as { type?: unknown; id?: unknown } | null;
      if (!data || data.type !== "dcd:focus-section" || typeof data.id !== "string") return;

      const target = document.querySelector<HTMLElement>(`[data-band="${CSS.escape(data.id)}"]`);
      if (!target) return;

      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.add("dcd-band-focus");
      window.setTimeout(() => target.classList.remove("dcd-band-focus"), 1600);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return null;
}
