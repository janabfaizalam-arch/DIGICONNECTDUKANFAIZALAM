"use client";

import { useCallback, useSyncExternalStore } from "react";

import { resolveSection, sectionHref, type CustomerSection } from "@/lib/customer/sections";

/**
 * A tiny bus so the app's bottom navigation can drive the customer portal.
 *
 * The two live in different parts of the tree: `BottomNav` is mounted by the
 * root layout, the portal is a page under it, so no React context reaches from
 * one to the other. They still have to agree on which section is showing —
 * otherwise a tap on "Wallet" in the tab bar is a full router navigation, and
 * `/customer/dashboard` is `force-dynamic`, so that re-runs the server
 * component and re-reads the profile, applications, wallet and documents from
 * Supabase before the screen changes. That round trip is the "lambi loading"
 * on every tab press: measured at 666–987ms, against 136–199ms for a switch
 * that stays in the browser.
 *
 * `requestSection` therefore updates the URL with `history.pushState` and
 * announces the change; the portal listens and swaps the section. Links,
 * refreshes and the back button keep working because the URL is still the
 * truth — `popstate` is part of the same subscription.
 *
 * Note that `useSearchParams()` cannot be used to read the section after a
 * `pushState`: it reflects the router's state, which a manual history write
 * does not touch. Anything that needs the live value subscribes here.
 */

const SECTION_EVENT = "dc:customer-section";

/** Move the portal to `next` without leaving the page. */
export function requestSection(next: CustomerSection) {
  if (typeof window === "undefined") return;
  window.history.pushState(null, "", sectionHref(next));
  window.dispatchEvent(new CustomEvent(SECTION_EVENT, { detail: next }));
  window.scrollTo({ top: 0, behavior: "auto" });
}

/** The section named by the address bar right now. */
export function readSectionFromLocation(): CustomerSection {
  if (typeof window === "undefined") return "home";
  return resolveSection(new URLSearchParams(window.location.search).get("tab"));
}

function subscribe(onChange: () => void) {
  window.addEventListener(SECTION_EVENT, onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener(SECTION_EVENT, onChange);
    window.removeEventListener("popstate", onChange);
  };
}

/**
 * The section showing right now, kept in step with the address bar.
 *
 * `serverSection` is what the server rendered, and is returned during
 * hydration so the markup matches; after that the store takes over.
 */
export function useActiveSection(serverSection: CustomerSection): CustomerSection {
  const getServerSnapshot = useCallback(() => serverSection, [serverSection]);
  return useSyncExternalStore(subscribe, readSectionFromLocation, getServerSnapshot);
}
