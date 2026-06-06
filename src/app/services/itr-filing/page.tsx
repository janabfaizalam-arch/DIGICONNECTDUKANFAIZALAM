import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { ItrFilingClient } from "./itr-filing-client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const seoTitle = "Income Tax Return (ITR) Filing Online - Assisted CA Filing | DigiConnect Dukan";
  const seoDescription = "File your Income Tax Return (ITR) online under expert CA consultation. Form 16 & AIS/26AS verification, max tax saving, 20% wallet cashback. AY 2026-27 open!";
  const keywords = [
    "ITR filing online",
    "assisted tax filing India",
    "ITR-1 salaried filing",
    "ITR-2 capital gains",
    "file income tax return online",
    "TDS refund tracking",
    "CA tax consultant online",
    "DigiConnect Dukan tax"
  ];

  return {
    title: seoTitle,
    description: seoDescription,
    keywords,
    alternates: {
      canonical: "/services/itr-filing",
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      type: "website",
      url: "/services/itr-filing",
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
    }
  };
}

export default async function ItrFilingPage() {
  const user = await getCurrentUser();

  const faqs = [
    {
      question: "What is Income Tax Return (ITR) Filing?",
      answer: "ITR filing is the official process of submitting details of your gross annual income, deductions claimed, and net tax liabilities to the Income Tax Department of India for validation."
    },
    {
      question: "Who is mandatorily required to file ITR?",
      answer: "Any individual whose gross total income exceeds the basic exemption limit (₹3 Lakhs under the new regime, or ₹2.5 Lakhs under the old regime for AY 2026-27) must file. Filing is also mandatory if you hold foreign assets, deposited > ₹1 Crore in current accounts, or spent > ₹2 Lakhs on foreign travel."
    },
    {
      question: "Which ITR form should I file?",
      answer: "ITR-1 is for individuals with salary, one house property, and interest income up to ₹50 Lakhs. ITR-2 is for individuals with capital gains, foreign assets, or multiple house properties. ITR-3 is for business profits/freelance income. ITR-4 is for presumptive business income under Sec 44AD/44ADA."
    },
    {
      question: "What is Form 16, AIS, and 26AS?",
      answer: "Form 16 is your employer-issued TDS certificate. Form 26AS is the government record of taxes deducted against your PAN. AIS (Annual Information Statement) tracks all financial activities (shares, mutual funds, interest, high-value purchases)."
    },
    {
      question: "How long does it take to get my tax refund?",
      answer: "Once you file your ITR and e-verify it, the Income Tax Department processes it. Refunds are typically credited to your validated bank account within 10 to 45 working days, though it can vary."
    },
    {
      question: "Can I choose between Old and New Tax Regimes?",
      answer: "Yes, you can choose between the regimes. The New regime offers lower tax slabs with fewer deductions, while the Old regime allows deductions for HRA, 80C (LIC, PPF), 80D (health insurance), and home loan interest."
    },
    {
      question: "What documents are required to file ITR?",
      answer: "Primary documents include PAN Card, Aadhaar Card, Form 16 (for salaried), Bank statements (for interest details), AIS/26AS reports, and details of any tax-saving investments."
    },
    {
      question: "What happens if I file my ITR late?",
      answer: "Failing to file ITR by the July 31 due date attracts a late fee under Section 234F (up to ₹5,000, or ₹1,000 for income below ₹5 Lakhs) and interest on outstanding tax dues under Section 234A."
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
      "priceRange": "₹699",
      "url": "https://www.rnos.in",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Assisted ITR Tax Filing Online",
      "description": "Premium assisted ITR filing with professional CA review, tax-saving optimization, and refund tracking.",
      "provider": {
        "@type": "LocalBusiness",
        "name": "DigiConnect Dukan",
      },
      "serviceType": "Taxation Services",
      "areaServed": "India",
      "offers": {
        "@type": "Offer",
        "price": "699",
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
      <ItrFilingClient isLoggedIn={Boolean(user)} faqs={faqs} />
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
