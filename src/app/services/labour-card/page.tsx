import type { Metadata } from "next";

import { LabourCardPage } from "@/components/services/labour-card/labour-card-page";

/**
 * /services/labour-card
 *
 * A dedicated route, the same way CM YUVA and GST have one. Until now this
 * slug fell through to the generic service template, which rendered a title, a
 * price and three empty boxes for what is the most benefit-dense government
 * scheme this shop handles.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UP Labour Card (UPBOCW) — Registration, Renewal aur Sarkari Yojanayein | DigiConnect Dukan",
  description:
    "UP Labour Card / UPBOCW ki poori guide — education, shaadi, bachche, medical, divyangta, mrityu aur pension benefits, unki shartein, documents aur apply karne ka tareeka. Eligibility checker ke saath.",
  alternates: { canonical: "/services/labour-card" },
  openGraph: {
    title: "UP Labour Card (UPBOCW) — Complete Guide",
    description:
      "Labour Card ke benefits, eligibility, documents aur application process — saaf-saaf, shartein ke saath.",
    url: "/services/labour-card",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "UP Labour Card (UPBOCW) — Complete Guide",
    description: "Benefits, eligibility, documents aur apply karne ka tareeka.",
  },
};

export default function Page() {
  return <LabourCardPage />;
}
