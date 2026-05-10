import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import Script from "next/script";

import { ToastProvider } from "@/components/providers/toast-provider";
import { SiteHeader } from "@/components/site-header";
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
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  other: {
    "facebook-domain-verification": "c696v13fvc1hf31hgcidfcfney4tu8",
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
          <Script id="organization-schema" type="application/ld+json">
            {JSON.stringify(organizationSchema)}
          </Script>
        </ToastProvider>
      </body>
    </html>
  );
}
