import type { Metadata } from "next";
import Script from "next/script";

import { ToastProvider } from "@/components/providers/toast-provider";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "DigiConnect Dukan | All Digital & Government Services in Orai & Jalaun",
  description:
    "DigiConnect Dukan offers PAN Card, Aadhaar Update, Voter ID, Ration Card, GST, MSME, certificates and more for customers in Orai, Jalaun and nearby areas.",
  keywords: [
    "DigiConnect Dukan",
    "Orai digital services",
    "Jalaun Aadhaar update",
    "PAN card apply Orai",
    "GST registration Jalaun",
    "government services near me",
  ],
  openGraph: {
    title: "DigiConnect Dukan | All Digital & Government Services",
    description:
      "Trusted local service center for Aadhaar, PAN, Voter ID, Ration Card, certificates, GST and online forms in Orai and Jalaun.",
    type: "website",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiConnect Dukan | All Digital & Government Services",
    description:
      "Trusted local service center in Orai and Jalaun for digital and government services.",
  },
  alternates: {
    canonical: "/",
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "DigiConnect Dukan",
  url: siteUrl,
  email: "digiconnectdukan@rnos.in",
  telephone: ["7007595931", "9305086491"],
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
        <ToastProvider>{children}</ToastProvider>
        <Script id="local-business-schema" type="application/ld+json">
          {JSON.stringify(localBusinessSchema)}
        </Script>
      </body>
    </html>
  );
}
