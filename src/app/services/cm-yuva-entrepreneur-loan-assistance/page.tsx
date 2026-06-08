import type { Metadata } from "next";
import { CmYuvaClientPage } from "@/components/services/cm-yuva-client-page";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";
const pageUrl = `${siteUrl}/services/cm-yuva-entrepreneur-loan-assistance`;

export const metadata: Metadata = {
  title: "CM YUVA Entrepreneur Loan Assistance Online Apply | DigiConnect Dukan",
  description: "Apply for Chief Minister's YUVA Self-Employment Loan Scheme in Uttar Pradesh. Get professional assistance for dockets compile, Detailed Project Reports (DPR), MSME registration, and WhatsApp expert follow-ups.",
  keywords: [
    "CM YUVA Entrepreneur Loan Assistance",
    "UP Chief Minister Youth Self Employment Scheme",
    "Detailed Project Report DPR preparation UP",
    "MSME Udyam Registration online",
    "UP government subsidy business loans",
    "Youth business loan subventions Uttar Pradesh",
    "DigiConnect Dukan business credit",
    "RNOS India financial advisory"
  ],
  alternates: {
    canonical: "/services/cm-yuva-entrepreneur-loan-assistance",
  },
  openGraph: {
    title: "CM YUVA Entrepreneur Loan Assistance Online Support | DigiConnect Dukan",
    description: "Get certified assistance for dockets compile, Detailed Project Reports (DPR) preparation, and MSME registration online under UP CM YUVA Scheme.",
    type: "article",
    url: pageUrl,
    images: [
      {
        url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&h=630&q=80",
        alt: "CM YUVA Loan Assistance DigiConnect Dukan",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CM YUVA Entrepreneur Loan Assistance Online Support | DigiConnect Dukan",
    description: "UP CM YUVA Self Employment scheme file preparation support. MSME certificate & professional Detailed Project Report (DPR) compiled online.",
    images: ["https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&h=630&q=80"],
  }
};

// Rich SEO Structured JSON-LD Schemas
const schemas = [
  // 1. Organization Schema
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "DigiConnect Dukan",
    "legalName": "RNoS India Pvt Ltd",
    "url": "https://www.rnos.in",
    "logo": "https://www.rnos.in/icon.png",
    "telephone": "+91 7007595931",
    "email": "support@rnos.in",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Lucknow",
      "addressRegion": "Uttar Pradesh",
      "addressCountry": "IN"
    }
  },
  // 2. Service Schema with Aggregate Rating
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "CM YUVA Entrepreneur Loan Assistance Support",
    "description": "Professional credit consulting and online application file formulations for UP Chief Minister Youth Self Employment Scheme (CM YUVA). Includes project report DPR preparations and MSME registrations support.",
    "provider": {
      "@type": "LocalBusiness",
      "name": "DigiConnect Dukan",
      "url": "https://www.rnos.in",
      "telephone": "+91 7007595931",
      "priceRange": "Enquiry Now"
    },
    "serviceType": "Government Subsidy Loan Assistance",
    "areaServed": {
      "@type": "State",
      "name": "Uttar Pradesh"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "184",
      "bestRating": "5",
      "worstRating": "1"
    }
  },
  // 3. BreadcrumbList Schema
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Services",
        "item": `${siteUrl}/services`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "CM YUVA Entrepreneur Loan Assistance",
        "item": pageUrl
      }
    ]
  },
  // 4. FAQPage Schema containing top questions
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is the CM YUVA Entrepreneur Loan Scheme?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Chief Minister's Youth Self-Employment Scheme (CM YUVA) is a government initiative of Uttar Pradesh designed to help young entrepreneurs start their own businesses with interest subventions, project report preparations, and digital documentation assistance."
        }
      },
      {
        "@type": "Question",
        "name": "Who is eligible to apply for this scheme?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "UP residents aged 18 to 40, who have cleared at least Class 8th or higher, are eligible. The candidate should not be a defaulter with any financial institution."
        }
      },
      {
        "@type": "Question",
        "name": "What is the maximum loan amount under CM YUVA?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Under this loan assistance program, eligible candidates can secure business loans of up to ₹5 Lakhs for service/retail operations and up to ₹10 Lakhs for industrial manufacturing setups."
        }
      },
      {
        "@type": "Question",
        "name": "Is a project report (DPR) mandatory?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, a Detailed Project Report (DPR) outlining the business costs, projected revenues, and working capital is mandatory. Our certified professionals prepare this report for you as part of our service."
        }
      }
    ]
  }
];

export default function CmYuvaPage() {
  return (
    <>
      {/* Schema Injection */}
      {schemas.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      
      {/* Premium Content Body */}
      <CmYuvaClientPage />
    </>
  );
}
