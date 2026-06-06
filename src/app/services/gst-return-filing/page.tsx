import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { GstReturnFilingClient } from "./gst-return-filing-client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const seoTitle = "GST Return Filing Online - CA Assisted GSTR-1 & GSTR-3B | DigiConnect Dukan";
  const seoDescription = "File your GSTR-1, GSTR-3B, and Nil GST returns online with DigiConnect Dukan. Expert CA-assisted reconciliation, late fee protection, and 20% wallet cashback. File today!";
  const keywords = [
    "GST return filing online",
    "File GSTR-1 online",
    "File GSTR-3B online",
    "GST compliance packages",
    "GSTR late fees penalty",
    "Nil GST return filing",
    "CA assisted GSTR filing",
    "QRMP scheme filing"
  ];

  return {
    title: seoTitle,
    description: seoDescription,
    keywords,
    alternates: {
      canonical: "/services/gst-return-filing",
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      type: "website",
      url: "/services/gst-return-filing",
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
    }
  };
}

export default async function GstReturnFilingPage() {
  const user = await getCurrentUser();

  const faqs = [
    {
      question: "What is GST Return Filing?",
      answer: "GST Return Filing is the process of submitting details of sales, purchases, tax collected, and tax paid under the Goods and Services Tax law. Registered businesses must submit these returns online through the GST portal."
    },
    {
      question: "What are GSTR-1 and GSTR-3B returns?",
      answer: "GSTR-1 is a statement where you declare details of all your outward supplies (sales) and invoices. GSTR-3B is a monthly self-declaration summary return where you report consolidated sales, ITC details, and pay the net tax liability."
    },
    {
      question: "What is the due date for filing GSTR-1?",
      answer: "For monthly filers, GSTR-1 is due on the 11th of the following month. For quarterly filers under the QRMP scheme, GSTR-1 is filed by the 13th of the month succeeding the quarter."
    },
    {
      question: "What is the due date for filing GSTR-3B?",
      answer: "For monthly filers, GSTR-3B is due on the 20th of the following month. For quarterly filers, it is due on the 22nd or 24th of the month succeeding the quarter, depending on the state of business operations."
    },
    {
      question: "What is the QRMP (Quarterly Return Monthly Payment) scheme?",
      answer: "QRMP is a scheme for taxpayers with turnover up to ₹5 Crore. It allows them to file GSTR-1 and GSTR-3B quarterly while paying taxes monthly through a simple challan."
    },
    {
      question: "Can I file a Nil return? What is the easiest way?",
      answer: "Yes, if you have zero sales, purchases, and no tax liability for a period, you must file a Nil GSTR. Through DigiConnect, you can file your Nil returns instantly within 5 minutes."
    },
    {
      question: "What are the late fees for delay in filing GST returns?",
      answer: "For Nil returns, the late fee is ₹20 per day of delay (₹10 CGST + ₹10 SGST). For regular active returns, the late fee is ₹50 per day (₹25 CGST + ₹25 SGST) up to a maximum cap depending on business turnover."
    },
    {
      question: "What is the penalty for not filing GST returns at all?",
      answer: "Non-filing of GST returns can lead to the suspension and eventual cancellation of your GSTIN, blockage of e-way bills, penalty of 10% of tax due (or ₹10,000 whichever is higher), and potential legal notice from tax officers."
    },
    {
      question: "Can I make corrections in a filed GST return?",
      answer: "You cannot revise a filed GSTR-1 or GSTR-3B. However, any corrections or omissions can be amended in the next month's return or during reconciliation."
    },
    {
      question: "What is Input Tax Credit (ITC) reconciliation?",
      answer: "ITC reconciliation involves matching the credit claimed in your GSTR-3B with the details uploaded by your suppliers which appear in your GSTR-2B or GSTR-2A. We perform professional reconciliation to ensure you only claim valid credits."
    },
    {
      question: "What is GSTR-9? Is it mandatory?",
      answer: "GSTR-9 is the annual GST return that consolidates all monthly/quarterly filings. It is mandatory for taxpayers with turnover exceeding ₹2 Crore."
    },
    {
      question: "Do I get wallet cashback on GST Return Filing at DigiConnect?",
      answer: "Yes! You receive a flat 20% cashback directly credited to your DigiConnect wallet on completing payment for your GSTR filing packages."
    },
    {
      question: "How is support provided during GSTR filings?",
      answer: "We assign a dedicated CA-assisted compliance advisor who coordinates files collection, double-checks computations, runs ITC reconciliations, and submits returns with instant receipt sharing."
    },
    {
      question: "Can I file GSTR if I do not have a bank statement?",
      answer: "Yes, you can initiate draft GSTR compilation. However, for a complete and compliant return, bank statements are required to verify transaction receipts and reconciliation statements."
    },
    {
      question: "What are GSTR-2A and GSTR-2B?",
      answer: "GSTR-2A is a dynamic auto-drafted statement showing purchases from suppliers. GSTR-2B is a static statement generated monthly on the 14th which provides a constant reference for the Input Tax Credit you can claim in GSTR-3B."
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
      "priceRange": "₹999",
      "url": "https://www.rnos.in",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "GST Return Filing Online",
      "description": "Online GSTR-1 and GSTR-3B return filing with expert CA assistance in India.",
      "provider": {
        "@type": "LocalBusiness",
        "name": "DigiConnect Dukan",
      },
      "serviceType": "Taxation",
      "areaServed": "India",
      "offers": {
        "@type": "Offer",
        "price": "999",
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
      <GstReturnFilingClient isLoggedIn={Boolean(user)} faqs={faqs} />
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
