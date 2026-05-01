import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import Script from "next/script";

import { ToastProvider } from "@/components/providers/toast-provider";
import { SiteHeader } from "@/components/site-header";
import { StickyMobileCta } from "@/components/sticky-mobile-cta";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";

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
  title: "DigiConnect Dukan - Digital & Government Services Across India",
  description:
    "Apply online for PAN Card, Aadhaar Update, GST Registration, Passport, and other digital services across India. Fast and reliable service.",
  keywords: [
    "Digital services India",
    "PAN card apply online",
    "Aadhaar update",
    "GST registration",
    "passport assistance India",
  ],
  openGraph: {
    title: "DigiConnect Dukan | Digital & Government Services Across India",
    description:
      "Apply online for PAN Card, Aadhaar Update, GST Registration, Passport, and other digital services across India.",
    type: "website",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiConnect Dukan | Digital Services Across India",
    description:
      "Fast and reliable digital service platform for customers across India.",
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

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "DigiConnect Dukan",
  url: siteUrl,
  email: "digiconnectdukan@rnos.in",
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
        <ToastProvider>
          <SiteHeader />
          {children}
          <StickyMobileCta />
          <Script id="organization-schema" type="application/ld+json">
            {JSON.stringify(organizationSchema)}
          </Script>
        </ToastProvider>
      </body>
    </html>
  );
}
