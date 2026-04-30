import type { Metadata } from "next";
import Script from "next/script";

import { ToastProvider } from "@/components/providers/toast-provider";
import { SiteHeader } from "@/components/site-header";
import { StickyMobileCta } from "@/components/sticky-mobile-cta";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "DigiConnect Dukan | Digital & Government Services in Orai, Jalaun",
  description:
    "DigiConnect Dukan Orai aur Jalaun ka trusted digital service center hai. PAN card, Aadhaar update, voter ID, GST, passport assistance, certificates aur government services ke liye apply karein.",
  keywords: [
    "DigiConnect Dukan",
    "PAN Card Orai",
    "Aadhaar Update Jalaun",
    "Online Services Near Me",
    "Orai digital services",
    "Jalaun Aadhaar update",
    "PAN card apply Orai",
    "GST registration Jalaun",
    "passport assistance Orai",
    "government services in Jalaun",
    "digital services in Orai",
    "DigiConnect Dukan government services",
    "government services near me",
  ],
  openGraph: {
    title: "DigiConnect Dukan | Digital & Government Services in Orai",
    description:
      "Orai and Jalaun ka trusted local center for PAN card, Aadhaar update, Voter ID, GST, passport assistance and online government services.",
    type: "website",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiConnect Dukan | Digital Services in Orai & Jalaun",
    description:
      "Trusted local service center in Orai and Jalaun for digital and government services.",
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "DigiConnect Dukan",
  url: siteUrl,
  email: "digiconnectdukan@rnos.in",
  telephone: ["9305086491", "7007595931"],
  areaServed: ["Orai", "Jalaun", "Uttar Pradesh"],
  address: [
    {
      "@type": "PostalAddress",
      streetAddress: "Machchhar Choraha",
      addressLocality: "Orai",
      addressRegion: "Uttar Pradesh",
      addressCountry: "IN",
    },
    {
      "@type": "PostalAddress",
      streetAddress: "Tehsil Road",
      addressLocality: "Jalaun",
      addressRegion: "Uttar Pradesh",
      addressCountry: "IN",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <ToastProvider>{children}</ToastProvider>
        <StickyMobileCta />
        <Script id="local-business-schema" type="application/ld+json">
          {JSON.stringify(localBusinessSchema)}
        </Script>
      </body>
    </html>
  );
}
