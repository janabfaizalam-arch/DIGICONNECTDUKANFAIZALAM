"use client";

export type GoogleAnalyticsEventParameters = Record<string, string | number | boolean | undefined>;

type GtagCommand = "config" | "consent" | "event" | "js";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (command: GtagCommand, target: string | Date, parameters?: GoogleAnalyticsEventParameters) => void;
  }
}

export function isGoogleAnalyticsEnabled() {
  return process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim());
}

function debugAnalytics(message: string, details?: GoogleAnalyticsEventParameters) {
  if (typeof window === "undefined") {
    return;
  }

  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.debug(`[ga4] ${message}`, details ?? {});
}

function trackEvent(eventName: string, parameters?: GoogleAnalyticsEventParameters) {
  if (typeof window === "undefined") {
    return false;
  }

  if (!isGoogleAnalyticsEnabled()) {
    debugAnalytics("event skipped: GA disabled", { event_name: eventName });
    return false;
  }

  if (typeof window.gtag !== "function") {
    debugAnalytics("event skipped: window.gtag missing", { event_name: eventName });
    return false;
  }

  debugAnalytics("event fired", { event_name: eventName, ...(parameters ?? {}) });
  window.gtag("event", eventName, parameters);
  return true;
}

export function trackPageView(path: string) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

  if (typeof window === "undefined") {
    return;
  }

  if (!isGoogleAnalyticsEnabled() || !measurementId) {
    debugAnalytics("page_view skipped: GA disabled", { page_path: path });
    return;
  }

  if (typeof window.gtag !== "function") {
    debugAnalytics("page_view skipped: window.gtag missing", { page_path: path });
    return;
  }

  debugAnalytics("page_view config fired", { page_path: path });
  window.gtag("config", measurementId, {
    page_path: path,
  });
}

export function updateAnalyticsConsent(granted: boolean) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    debugAnalytics("consent skipped: window.gtag missing", { granted });
    return;
  }

  debugAnalytics("consent update fired", { granted });
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
  });
}

export function trackWhatsAppClick() {
  trackEvent("whatsapp_click");
}

export function trackCallClick() {
  trackEvent("call_click");
}

export function trackLeadSubmit() {
  trackEvent("lead_submit");
}

export function trackApplicationSubmit() {
  trackEvent("application_submit");
}

export function trackPurchase(value: number) {
  trackEvent("purchase", {
    value,
    currency: "INR",
  });
}

export function trackLogin(method = "email") {
  trackEvent("login", {
    method,
  });
}

export function trackSignup(method = "email") {
  trackEvent("signup", {
    method,
  });
}

export function trackPasswordReset() {
  trackEvent("password_reset");
}
