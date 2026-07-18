import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";

import { ToastProvider } from "@/components/providers/toast-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DigiConnect Dukan",
    template: "%s · DigiConnect Dukan",
  },
  description: "Apply online for GST, ITR, MSME, FSSAI, Driving Licence, Passport and CM YUVA loan assistance.",
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased">
        <ToastProvider>
          <SiteHeader />
          <main>{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
