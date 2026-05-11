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

function trackEvent(eventName: string, parameters?: GoogleAnalyticsEventParameters) {
  if (typeof window === "undefined" || !isGoogleAnalyticsEnabled() || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, parameters);
}

export function trackPageView(path: string) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

  if (typeof window === "undefined" || !isGoogleAnalyticsEnabled() || !measurementId || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("config", measurementId, {
    page_path: path,
  });
}

export function updateAnalyticsConsent(granted: boolean) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

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
  trackEvent("generate_lead");
}

export function trackApplicationSubmit() {
  trackEvent("service_application_submit");
}

export function trackPurchase(value: number) {
  trackEvent("purchase", {
    value,
    currency: "INR",
  });
}

export function trackLogin() {
  trackEvent("login", {
    method: "email",
  });
}

export function trackSignup() {
  trackEvent("sign_up", {
    method: "email",
  });
}

export function trackPasswordReset() {
  trackEvent("password_reset_success");
}
