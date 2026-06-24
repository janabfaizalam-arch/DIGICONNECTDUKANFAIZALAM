import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { FoodLicenseClient } from "./food-license-client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const seoTitle = "Food License (FSSAI) Registration Online | DigiConnect Dukan";
  const seoDescription = "Apply for FSSAI Food License online. Registration, State License and Central License with expert support. Fast processing and affordable pricing.";
  const keywords = [
    "FSSAI Registration",
    "Food License",
    "Food Safety License",
    "Restaurant License",
    "Bakery License",
    "Cafe License",
    "Food Business Registration",
    "FSSAI Apply Online"
  ];

  return {
    title: seoTitle,
    description: seoDescription,
    keywords,
    alternates: {
      canonical: "/services/food-license",
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      type: "website",
      url: "/services/food-license",
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
    }
  };
}

export default async function FoodLicensePage() {
  const user = await getCurrentUser();

  const faqs = [
    {
      question: "What is FSSAI?",
      answer: "FSSAI (Food Safety and Standards Authority of India) is an autonomous body established under the Ministry of Health & Family Welfare, Government of India. It regulates and monitors food safety and hygiene standard norms across the country."
    },
    {
      question: "Who needs FSSAI?",
      answer: "Any Food Business Operator (FBO) involved in manufacturing, processing, packaging, storing, distributing, or selling food products must register under FSSAI. This includes restaurants, cloud kitchens, cafes, grocery stores, home bakers, and online sellers."
    },
    {
      question: "How much does it cost?",
      answer: "FSSAI Basic Registration starts at ₹1499 through DigiConnect Dukan. The State License is priced at ₹2999, and the Central License starts at ₹4999 (plus applicable government fees depending on your specific category and turn-over volume)."
    },
    {
      question: "How long does it take?",
      answer: "Basic registration is usually processed within 5-10 working days. State and Central licenses can take 15 to 30 working days depending on government approvals, document completeness, and department queries."
    },
    {
      question: "Can home kitchens apply?",
      answer: "Yes, home kitchens and small cottage-scale businesses can apply for a Basic FSSAI registration if their annual turnover is under ₹12 Lakhs. This is mandatory to sell food legally."
    },
    {
      question: "Can restaurants apply?",
      answer: "Yes, restaurants must apply for either a State or Central FSSAI License, depending on their annual turnover. If turnover is under ₹20 Crores, a State License is required. Over ₹20 Crores requires a Central License."
    },
    {
      question: "What is State License?",
      answer: "A State FSSAI License is mandatory for medium-sized food businesses, manufacturers, storage units, and retailers with an annual turnover between ₹12 Lakhs and ₹20 Crores."
    },
    {
      question: "What is Central License?",
      answer: "A Central FSSAI License is required for large scale food operators, e-commerce brands, importers, exporters, manufacturers with turnover exceeding ₹20 Crores, and multiple-branch operators across multiple states."
    },
    {
      question: "Can license be renewed?",
      answer: "Yes, an FSSAI license is issued for a period of 1 to 5 years. It must be renewed before its expiry date. Renewals can be applied for as early as 180 days before the expiry date."
    },
    {
      question: "Penalty without FSSAI?",
      answer: "Running a food business without an active FSSAI registration or license can attract heavy legal penalties, including fines up to ₹5,000,000 and imprisonment for up to 6 months depending on the scale of operations."
    },
    {
      question: "Can I sell online?",
      answer: "Yes! FSSAI registration is a mandatory requirement to sell food items on e-commerce portals, directories, or direct delivery portals in India."
    },
    {
      question: "Can I use Swiggy?",
      answer: "Yes, Swiggy requires a valid 14-digit FSSAI registration or license number to onboard any restaurant, cloud kitchen, or home-cooking vendor."
    },
    {
      question: "Can I use Zomato?",
      answer: "Yes, Zomato mandates that all food delivery partners must submit an active FSSAI license copy to activate their listing on the customer portal."
    },
    {
      question: "Documents required?",
      answer: "For basic registration, you need Aadhaar, PAN, a passport photograph, and address proof of the premises (like an electricity bill or NOC). State/Central licenses require additional blueprints, list of machinery, and chemical report checks."
    },
    {
      question: "Validity?",
      answer: "An FSSAI registration or license can be chosen to be valid for 1, 2, 3, 4, or 5 years. The fee scales accordingly based on the chosen validity duration."
    },
    {
      question: "Modification process?",
      answer: "If you change your menu, scale up your machinery, or modify your company name/address, you can file a modification request on the FSSAI portal. Our experts can assist you with this filing."
    },
    {
      question: "Transfer process?",
      answer: "Yes, in case of the death of a license holder or corporate takeover, the FSSAI license can be transferred to legal heirs or the new management. Proper documentation and applications are required."
    },
    {
      question: "Renewal process?",
      answer: "FSSAI renewals require filing Form A (for registrations) or Form B (for licenses) along with updated details and payment before the expiration deadline."
    },
    {
      question: "Tracking status?",
      answer: "Once submitted, you will receive a reference number. You can track your real-time FSSAI application stage on the FoSCoS portal or directly through your DigiConnect dashboard."
    },
    {
      question: "How DigiConnect helps?",
      answer: "DigiConnect Dukan provides professional document review, expert-assisted filing, coordinates department queries, alerts you for renewals, and offers a secure wallet-integrated payment ecosystem."
    }
  ];

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "DigiConnect Dukan",
      "legalName": "RNOS India Pvt Ltd",
      "telephone": "+91 7007595931",
      "areaServed": "IN",
      "priceRange": "₹1499",
      "url": "https://www.rnos.in",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Food License (FSSAI) Registration Online",
      "description": "Apply for FSSAI Basic, State, or Central Food Safety Licenses online with expert CA support and instant wallet tracking.",
      "provider": {
        "@type": "LocalBusiness",
        "name": "DigiConnect Dukan",
      },
      "serviceType": "Business Compliance",
      "areaServed": "India",
      "offers": {
        "@type": "Offer",
        "price": "1499",
        "priceCurrency": "INR",
        "availability": "https://schema.org/InStock",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map((faq) => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
        },
      })),
    },
  ];

  return (
    <>
      <FoodLicenseClient isLoggedIn={Boolean(user)} faqs={faqs} />
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          id={`schema-ld-${index}`}
        />
      ))}
    </>
  );
}
