"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

import { trackCallClick, trackPageView, trackWhatsAppClick } from "@/lib/google-analytics";

type GoogleAnalyticsProps = {
  measurementId: string;
};

function getContactType(href: string) {
  if (href.startsWith("tel:")) {
    return "call";
  }

  if (href.includes("wa.me/") || href.includes("whatsapp.com/")) {
    return "whatsapp";
  }

  return null;
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    if (previousPathname.current === null) {
      previousPathname.current = pathname;
      return;
    }

    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      trackPageView(pathname);
    }
  }, [pathname]);

  useEffect(() => {
    console.debug("[ga4] contact click listener attached");

    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest("a[href]");
      const href = link?.getAttribute("href");

      if (!href) {
        return;
      }

      const contactType = getContactType(href);

      if (contactType === "call") {
        console.debug("[ga4] call CTA click detected", { href });
        trackCallClick();
      }

      if (contactType === "whatsapp") {
        console.debug("[ga4] WhatsApp CTA click detected", { href });
        trackWhatsAppClick();
      }
    }

    document.addEventListener("click", onClick);

    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);}
            window.gtag('consent', 'default', { analytics_storage: 'granted' });
            window.gtag('js', new Date());
            window.gtag('config', ${JSON.stringify(measurementId)});
            console.debug('[ga4] gtag initialized', { measurementId: ${JSON.stringify(measurementId)} });
          `,
        }}
      />
    </>
  );
}
