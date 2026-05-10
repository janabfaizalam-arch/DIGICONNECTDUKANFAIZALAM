"use client";

type MetaPixelEvent = "Contact" | "Lead" | "PageView" | "Purchase" | "SubmitApplication";
type MetaPixelParameters = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    fbq?: (command: "track", event: MetaPixelEvent, parameters?: MetaPixelParameters) => void;
  }
}

export function isMetaPixelEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim());
}

function track(event: MetaPixelEvent, parameters?: MetaPixelParameters) {
  if (typeof window === "undefined" || !isMetaPixelEnabled() || typeof window.fbq !== "function") {
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
