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
  title: "UP लेबर कार्ड (UPBOCW) — पंजीकरण, नवीनीकरण और सरकारी योजनाएं | DigiConnect Dukan",
  description:
    "UP लेबर कार्ड / UPBOCW की पूरी गाइड — शिक्षा, विवाह, मातृत्व, चिकित्सा, दिव्यांगता, मृत्यु और पेंशन लाभ, उनकी शर्तें, दस्तावेज़ और आवेदन का तरीक़ा। पात्रता जांच के साथ।",
  alternates: { canonical: "/services/labour-card" },
  openGraph: {
    title: "UP लेबर कार्ड (UPBOCW) — पूरी गाइड",
    description:
      "लेबर कार्ड के लाभ, पात्रता, दस्तावेज़ और आवेदन प्रक्रिया — साफ़-साफ़, शर्तों के साथ।",
    url: "/services/labour-card",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "UP लेबर कार्ड (UPBOCW) — पूरी गाइड",
    description: "लाभ, पात्रता, दस्तावेज़ और आवेदन का तरीक़ा।",
  },
};

export default function Page() {
  return <LabourCardPage />;
}
