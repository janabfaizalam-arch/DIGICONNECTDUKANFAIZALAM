import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Poppins } from "next/font/google";
import Script from "next/script";

import { GoogleAnalytics } from "@/components/google-analytics";
import { MetaPixelEvents } from "@/components/meta-pixel-events";
import { NavigationProgress } from "@/components/navigation-progress";
import { ToastProvider } from "@/components/providers/toast-provider";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { LiveNotificationFeed } from "@/components/live-notification-feed";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "DigiConnect Dukan - Tax, Insurance, Finance & Gov ID Services",
  description:
    "Apply online for Tax & Business, All Vehicle Insurance, Finance & Banking, and Gov ID form submission services across India.",
  keywords: [
    "Digital services India",
    "Tax and Business services",
    "GST registration",
    "vehicle insurance India",
    "government subsidy loans",
    "Gov ID form submission",
  ],
  openGraph: {
    title: "DigiConnect Dukan | Tax, Insurance, Finance & Gov ID Services",
    description:
      "Apply online for Tax & Business, All Vehicle Insurance, Finance & Banking, and Gov ID form submission services across India.",
    type: "website",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiConnect Dukan | Digital Services Across India",
    description:
      "Fast digital service support for tax, insurance, finance, banking, and Gov ID forms across India.",
  },
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DigiConnect",
  },
  applicationName: "DigiConnect Dukan",
  other: {
    "facebook-domain-verification": "c696v13fvc1hf31hgcidfcfney4tu8",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "DigiConnect Dukan",
  url: siteUrl,
  email: "support@rnos.in",
  telephone: "7007595931",
  areaServed: "IN",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${inter.variable} font-sans antialiased`}>
        {process.env.NODE_ENV === "production" && gaMeasurementId ? <GoogleAnalytics measurementId={gaMeasurementId} /> : null}
        {metaPixelId ? (
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
                  fbq('init', ${JSON.stringify(metaPixelId)});
                  fbq('track', 'PageView');
                `,
              }}
            />
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                alt=""
                src={`https://www.facebook.com/tr?id=${encodeURIComponent(metaPixelId)}&ev=PageView&noscript=1`}
              />
            </noscript>
            <MetaPixelEvents />
          </>
        ) : null}
        <ToastProvider>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <SiteHeader />
          {children}
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
          <LiveNotificationFeed />
          <PwaInstallPrompt />
          <Script id="organization-schema" type="application/ld+json">
            {JSON.stringify(organizationSchema)}
          </Script>
        </ToastProvider>
      </body>
    </html>
  );
}
