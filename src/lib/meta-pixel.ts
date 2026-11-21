"use client";

import { hasConsent } from "@/lib/consent/consent";

type MetaPixelEvent = "Contact" | "Lead" | "PageView" | "Purchase" | "SubmitApplication";
type MetaPixelParameters = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    fbq?: (command: "track", event: MetaPixelEvent, parameters?: MetaPixelParameters) => void;
  }
}

/*
  The Pixel reports every page URL it runs on. Signed-in areas carry customer
  names, mobile numbers and application ids in their URLs and forms, and Meta
  restricts pixels (and the business behind them) that send it personal,
  financial or government-ID data. So it runs only on the public marketing
  pages listed here -- an allowlist, so a new private area is excluded by
  default.
*/
const PIXEL_PREFIXES = [
  "/services",
  "/featured-services",
  "/about",
  "/portfolio",
  "/packages",
  "/digital-services",
  "/blog",
  "/become-dc-partner",
  "/download-app",
  "/credit-cards",
  "/contact",
  "/combo",
  "/privacy-policy",
  "/terms-and-conditions",
  "/cookie-policy",
  "/refund-policy",
  "/disclaimer",
];
const PIXEL_EXACT = new Set(["/", "/print", "/insurance-quotation"]);
const PIXEL_BLOCKED_PREFIXES = ["/packages/quote"];

export function isPixelAllowedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (PIXEL_BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return false;
  if (PIXEL_EXACT.has(pathname)) return true;
  return PIXEL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isMetaPixelEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim());
}

function track(event: MetaPixelEvent, parameters?: MetaPixelParameters) {
  if (
    typeof window === "undefined" ||
    !isMetaPixelEnabled() ||
    typeof window.fbq !== "function" ||
    !hasConsent("marketing") ||
    !isPixelAllowedPath(window.location.pathname)
  ) {
    return;
  }

  window.fbq("track", event, parameters);
}

export function trackPageView() {
  track("PageView");
}

export function trackLead() {
  track("Lead");
}

export function trackSubmitApplication() {
  track("SubmitApplication");
}

export function trackPurchase(value: number) {
  track("Purchase", {
    value,
    currency: "INR",
  });
}

export function trackContact() {
  track("Contact");
}
