import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { IBM_Plex_Sans, Inter, Noto_Sans_Devanagari, Playfair_Display, Poppins } from "next/font/google";
import Script from "next/script";

import { CookieConsent } from "@/components/privacy/cookie-consent";
import { TrackingScripts } from "@/components/privacy/tracking-scripts";
import { NavigationProgress } from "@/components/navigation-progress";
import { SessionProvider } from "@/components/providers/session-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { business } from "@/lib/compliance/config";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
});

/**
 * Body face, loaded as a variable font.
 *
 * It used to pin weight: ["400", "500"], which meant every `font-bold`,
 * `font-extrabold` and `font-black` on the site — and the homepage is built
 * almost entirely out of them — was synthesised by the browser smearing the
 * 500. One variable file is about the size of the two static ones it replaces
 * and gives real 600/700/800/900 cuts, which is most of the difference
 * between the page looking premium and looking approximate.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

/**
 * The DC Partners panel's face.
 *
 * IBM Plex Sans, because the panel is where a partner reads money: it carries
 * proper tabular figures and a plainer, more accountable tone than Inter,
 * which is the right register for balances, ledgers and commission. Scoped to
 * the panel through --font-dcp, so the marketing site keeps Inter.
 */
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-dcp",
});

/**
 * Devanagari, for the pages written in Hindi.
 *
 * Inter and Poppins carry no Devanagari glyphs at all — Hindi set in them
 * falls through to whatever the device happens to have, which on a budget
 * Android is usually a cramped face whose matras clip. The UP Labour Card
 * page is read in Hindi by people on exactly those phones, so the script it
 * is written in gets a font that was drawn for it.
 *
 * Loaded as a variable font with `display: swap`, and only used by elements
 * that opt in through `.lc-hi` — the Latin pages never request it.
 */
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  display: "swap",
  variable: "--font-devanagari",
});

/**
 * Display serif, used only for the emphasised clause of the homepage headline.
 * A single italic weight, self-hosted by next/font with display: swap, so it
 * adds one small file and never blocks the first paint.
 */
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500"],
  style: ["italic"],
  display: "swap",
  variable: "--font-display",
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
  // No maximumScale: locking zoom stops low-vision visitors from enlarging
  // text (WCAG 2.2 SC 1.4.4 Resize Text).
  viewportFit: "cover",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: business.brand,
  legalName: business.legalEntity,
  slogan: business.tagline,
  description:
    "DigiConnect Dukan provides private digital assistance and documentation support services. Not an official government portal.",
  url: siteUrl,
  logo: `${siteUrl.replace(/\/$/, "")}/icons/icon-512.png`,
  email: business.email,
  telephone: `+91-${business.phone}`,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Orai",
    addressRegion: "Uttar Pradesh",
    addressCountry: "IN",
  },
  areaServed: "IN",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${inter.variable} ${ibmPlexSans.variable} ${playfair.variable} ${notoDevanagari.variable} font-sans antialiased`}>
        <SessionProvider>
        <ToastProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-blue-700 focus:shadow-lg"
          >
            Skip to main content
          </a>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          {/*
            Every non-essential tracker — Google Analytics, the Meta Pixel and
            the admin panel's first-party visit counter — loads from here, and
            only as far as the visitor's cookie choice allows. See
            src/components/privacy/tracking-scripts.tsx.
          */}
          <TrackingScripts
            gaMeasurementId={process.env.NODE_ENV === "production" ? gaMeasurementId : undefined}
            metaPixelId={metaPixelId}
          />
          {/*
            No announcement strip above the header.

            The homepage carried a scrolling offer ticker on top of the navbar.
            Stacked with the header, the search row and the hero it made the
            top of a phone screen read as three bars before any content, and it
            was the first thing asked to go. The notices themselves are still
            managed at /admin/homepage-notices, so putting the strip back is one
            prop — it is not rendered anywhere today.
          */}
          <SiteHeader />
          {children}
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
          <PwaInstallPrompt />
          <CookieConsent />
          <Script id="organization-schema" type="application/ld+json">
            {JSON.stringify(organizationSchema)}
          </Script>
        </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
