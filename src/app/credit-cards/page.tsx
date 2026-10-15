import type { Metadata } from "next";

import { CreditCardsPage } from "@/components/credit-cards/credit-cards-page";
import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { MarketingFooter } from "@/components/marketing-footer";
import { business } from "@/lib/compliance/config";
import { getFeaturedCreditCards } from "@/lib/credit-cards";
import { getCachedFooterSocialLinks } from "@/lib/homepage/cached";
import { getSiteUrl } from "@/lib/site-url";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/**
 * /credit-cards — the card lounge.
 *
 * Every "Apply Now" is the bank partner link held in src/lib/credit-cards.ts;
 * this page adds the presentation and nothing it would have to make up — no
 * fees, rewards or approval odds are quoted, because the bank decides those.
 */
const TITLE = "Premium Credit Cards — Apply Online | DigiConnect Dukan";
const DESCRIPTION =
  "Compare HDFC Bank, Swiggy HDFC, Tata Neu Plus, HDFC RuPay, HDFC Biz, PIXEL and Axis Bank credit cards and apply online on the bank's official page through DigiConnect Dukan.";
const OG_IMAGE = "/videos/digiconnect-intro-reel-poster.webp";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "credit card apply online",
    "HDFC credit card apply",
    "Swiggy HDFC credit card",
    "Tata Neu Plus HDFC credit card",
    "Axis Bank credit card apply",
    "RuPay credit card",
  ],
  alternates: { canonical: "/credit-cards" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: "/credit-cards", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [OG_IMAGE] },
};

export default async function CreditCardsIndexPage() {
  const cards = getFeaturedCreditCards();
  const socialLinks = await getCachedFooterSocialLinks().catch(() => undefined);
  const siteUrl = getSiteUrl();
  const whatsappHref = buildWhatsAppUrl(
    `Namaste! Mujhe ${business.brand} se credit card ke baare mein jaankari chahiye. Kaunsa card mere liye sahi rahega?`,
  );

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Premium credit cards",
    itemListElement: cards.map((card, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: card.name,
      url: `${siteUrl}/credit-cards/${card.slug}`,
    })),
  };

  return (
    <>
      <main id="main-content" className="min-h-screen bg-[#040915]">
        <CreditCardsPage cards={cards} links={{ whatsappHref }} />
      </main>
      <MarketingFooter socialLinks={socialLinks} />
      <HomepageContactActions desktopOnly />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </>
  );
}
