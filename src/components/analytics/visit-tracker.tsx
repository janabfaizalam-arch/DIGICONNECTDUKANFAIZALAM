"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * The three lines that tell the panel somebody is here.
 *
 * Deliberately tiny and deliberately silent: it sets no cookie, reads no
 * storage the visitor cannot clear by closing the tab, and sends nothing the
 * page could not already see. A `sendBeacon` hands the browser the payload and
 * returns immediately, so a slow database can never hold up a page a customer
 * is standing at a counter reading.
 *
 * On a route change Next keeps this component mounted, so the effect fires per
 * path rather than per load — which is exactly what "which page did they open"
 * means in an app that navigates without reloading.
 */

const SESSION_KEY = "dc_visit_session";

/** A session id that lives in the tab, and dies with it. */
function sessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s${Date.now()}${Math.random().toString(16).slice(2)}`;
    window.sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    // A private window with storage blocked still deserves to be counted; it
    // just counts as a fresh session each time.
    return `n${Date.now()}${Math.random().toString(16).slice(2)}`;
  }
}

export function VisitTracker() {
  const pathname = usePathname();
  // The first path of this tab is the one somebody actually arrived on.
  const seen = useRef(false);

  useEffect(() => {
    if (!pathname) return;

    const isEntry = !seen.current;
    seen.current = true;

    const params = new URLSearchParams(window.location.search);
    const payload = JSON.stringify({
      path: pathname,
      title: document.title,
      // On the first page this is where they came from; afterwards it is our
      // own last page, and the server drops it.
      referrer: document.referrer || "",
      sessionId: sessionId(),
      utmSource: params.get("utm_source") ?? undefined,
      campaign: params.get("utm_campaign") ?? undefined,
      isEntry,
    });

    try {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon?.("/api/track", blob)) return;
    } catch {
      // Falls through to fetch below.
    }

    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Counting a visit is never worth an error in a visitor's console.
    });
  }, [pathname]);

  return null;
}
