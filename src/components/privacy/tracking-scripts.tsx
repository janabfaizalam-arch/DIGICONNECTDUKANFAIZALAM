"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";

import { VisitTracker } from "@/components/analytics/visit-tracker";
import { GoogleAnalytics } from "@/components/google-analytics";
import { MetaPixelEvents } from "@/components/meta-pixel-events";
import { useConsent } from "@/lib/consent/use-consent";

type TrackingScriptsProps = {
  gaMeasurementId?: string;
  metaPixelId?: string;
};

/**
 * Every non-essential tracker on the site, behind the visitor's choice.
 *
 *   • Google Analytics — only with analytics consent.
 *   • Meta Pixel       — only with marketing consent.
 *   • First-party visit counter — stores no cookie and no IP address, so it
 *     runs until the visitor declines analytics, and stops once they do.
 *
 * Scripts that were loaded and are then refused cannot be unloaded from the
 * page, so withdrawal also switches them off in place (GA's disable flag and
 * consent update, the Pixel's `revoke`) and the consent helper expires their
 * cookies. From the next page load they are simply never requested.
 */
export function TrackingScripts({ gaMeasurementId, metaPixelId }: TrackingScriptsProps) {
  const consent = useConsent();
  const analyticsAllowed = consent?.analytics === true;
  const marketingAllowed = consent?.marketing === true;
  const analyticsDeclined = consent !== undefined && consent !== null && !consent.analytics;

  useEffect(() => {
    if (!gaMeasurementId || consent === undefined) return;
    const w = window as unknown as Record<string, unknown>;
    w[`ga-disable-${gaMeasurementId}`] = !analyticsAllowed;
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", { analytics_storage: analyticsAllowed ? "granted" : "denied" });
    }
  }, [analyticsAllowed, consent, gaMeasurementId]);

  useEffect(() => {
    if (consent === undefined) return;
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    // A Pixel already on the page (consent withdrawn, then given again without
    // a reload) is switched back on here; the loader below will not re-run.
    if (typeof fbq === "function") fbq("consent", marketingAllowed ? "grant" : "revoke");
  }, [consent, marketingAllowed]);

  return (
    <>
      {gaMeasurementId && analyticsAllowed ? <GoogleAnalytics measurementId={gaMeasurementId} /> : null}

      {metaPixelId && marketingAllowed ? (
        <>
          <Script
            id="meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('consent', 'grant');
                fbq('init', ${JSON.stringify(metaPixelId)});
                fbq('track', 'PageView');
              `,
            }}
          />
          <MetaPixelEvents />
        </>
      ) : null}

      {consent !== undefined && !analyticsDeclined ? (
        <Suspense fallback={null}>
          <VisitTracker />
        </Suspense>
      ) : null}
    </>
  );
}
