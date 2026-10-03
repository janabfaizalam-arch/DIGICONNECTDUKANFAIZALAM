import type { Metadata } from "next";

import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { MarketingFooter } from "@/components/marketing-footer";
import { PassportPage } from "@/components/services/passport/passport-page";
import type { PassportLinks } from "@/components/services/passport/passport-ui";
import { getCurrentUser } from "@/lib/auth";
import { business } from "@/lib/compliance/config";
import { getCachedFooterSocialLinks } from "@/lib/homepage/cached";
import { PASSPORT_OG_IMAGE, PASSPORT_SLUG, resolveFaqs } from "@/lib/passport/content";
import { getPublicServiceRowBySlug, serviceFromDb } from "@/lib/services";
import { getSiteUrl } from "@/lib/site-url";
import { buildServiceWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

/**
 * /services/passport
 *
 * A dedicated route, as GST, DPR and Labour Card have — a static segment, so
 * it is matched before /services/[slug], which redirects the alias the
 * homepage links to, /services/passport-assistance, here.
 *
 * The price is never written here. It is the services row's sale price,
 * exactly as the generic template read it, and /api/create-order goes on
 * charging what agent_services says — the page displays, the server decides.
 */
export const dynamic = "force-dynamic";

const TITLE = "Passport Services in India | DigiConnect Dukan";
const DESCRIPTION =
  "Professional passport application assistance, document guidance, appointment guidance and digital support from DigiConnect Dukan.";
const PATH = `/services/${PASSPORT_SLUG}`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "passport application assistance",
    "passport services India",
    "fresh passport apply online help",
    "passport re-issue assistance",
    "passport documents checklist",
  ],
  alternates: { canonical: PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: PATH,
    images: [{ url: PASSPORT_OG_IMAGE, width: 1200, height: 630, alt: "The DigiConnect mascot holding an Indian passport at an airport" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [PASSPORT_OG_IMAGE],
  },
};

/** The live service charge, or null when the services row has none. */
async function loadPrice() {
  const row = await getPublicServiceRowBySlug(PASSPORT_SLUG);
  const amount = row ? serviceFromDb(row).amount : 0;
  return amount > 0 ? amount : null;
}

function buildSchemas(amount: number | null, faqs: { question: string; answer: string }[]) {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}${PATH}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Passport Application Assistance",
      description: DESCRIPTION,
      serviceType: "Passport application assistance",
      url: pageUrl,
      areaServed: { "@type": "Country", name: "India" },
      provider: {
        "@type": "Organization",
        name: business.brand,
        legalName: business.legalEntity,
        url: siteUrl,
      },
      ...(amount
        ? {
            offers: {
              "@type": "Offer",
              price: amount,
              priceCurrency: "INR",
              description: "DigiConnect Dukan service charge. Official passport fees are paid separately.",
              url: pageUrl,
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Services", item: `${siteUrl}/services` },
        { "@type": "ListItem", position: 3, name: "Passport", item: pageUrl },
      ],
    },
  ];
}

export default async function PassportServicePage() {
  const [user, amount, socialLinks] = await Promise.all([
    getCurrentUser(),
    loadPrice().catch(() => null),
    getCachedFooterSocialLinks().catch(() => undefined),
  ]);

  const priceText = amount ? `₹${amount.toLocaleString("en-IN")}` : null;
  const applyPath = `/apply/${PASSPORT_SLUG}`;
  const statusPath = "/customer/dashboard?tab=applications";
  const faqs = resolveFaqs(priceText ?? "passport assistance");

  const links: PassportLinks = {
    applyHref: user ? applyPath : `/login/customer?redirect=${encodeURIComponent(applyPath)}`,
    statusHref: user ? statusPath : `/login/customer?redirect=${encodeURIComponent(statusPath)}`,
    whatsappHref: buildWhatsAppUrl(
      buildServiceWhatsAppMessage({ serviceName: "Passport", category: "Passport & Licence", action: "apply", page: PATH }),
    ),
    phoneHref: `tel:+91${business.phone.replace(/\D/g, "").slice(-10)}`,
    priceText,
  };

  return (
    <>
      <main id="main-content" className="min-h-screen bg-white">
        <PassportPage links={links} faqs={faqs} />
      </main>

      <MarketingFooter socialLinks={socialLinks} />
      <HomepageContactActions desktopOnly />

      {buildSchemas(amount, faqs).map((schema, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
    </>
  );
}
