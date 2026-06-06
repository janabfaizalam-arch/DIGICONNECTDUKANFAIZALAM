import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { GstRegistrationClient } from "./gst-registration-client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const seoTitle = "GST Registration Online Apply - Get GSTIN in 3 Days | DigiConnect Dukan";
  const seoDescription = "Register for GST online with DigiConnect Dukan. Expert CA assisted documentation verification, 100% secure processing, and 20% wallet cashback. Apply today!";
  const keywords = [
    "GST registration online",
    "Apply GSTIN online",
    "GST registration process",
    "GST documents checklist",
    "DigiConnect Dukan",
    "GST registration fee",
    "new GST application",
    "tax registration India"
  ];

  return {
    title: seoTitle,
    description: seoDescription,
    keywords,
    alternates: {
      canonical: "/services/gst-registration",
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      type: "website",
      url: "/services/gst-registration",
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
    }
  };
}

export default async function GstRegistrationPage() {
  const user = await getCurrentUser();

  const faqs = [
    {
      question: "What is GST Registration?",
      answer: "GST (Goods and Services Tax) Registration is a process by which a business gets itself registered under the GST law. Upon successful registration, the business is assigned a unique 15-digit Goods and Services Tax Identification Number (GSTIN)."
    },
    {
      question: "Who is mandatorily required to obtain GST registration?",
      answer: "Any business selling goods with a turnover exceeding ₹40 Lakhs (₹20 Lakhs for hill/special states) or providing services exceeding ₹20 Lakhs (₹10 Lakhs for special states) must register. E-commerce sellers, interstate traders, and casual taxable persons must register regardless of turnover."
    },
    {
      question: "What is the limit of turnover for GST registration?",
      answer: "For goods, the threshold is ₹40 Lakhs in most states. For services, the threshold is ₹20 Lakhs. For Special Category States (northeastern states, Uttarakhand, etc.), the thresholds are halved to ₹20 Lakhs for goods and ₹10 Lakhs for services."
    },
    {
      question: "Can I voluntarily apply for GST registration even if my turnover is below the limit?",
      answer: "Yes, you can register voluntarily under GST. Voluntary registration allows you to claim Input Tax Credit (ITC) on purchases, register on e-commerce portals, and trade across states without restrictions."
    },
    {
      question: "How long does it take to get a GST registration certificate?",
      answer: "Usually, GST registration takes 3 to 7 working days. If the tax officer issues a query (clarification), it might take up to 10-15 working days depending on how quickly document clarifications are uploaded."
    },
    {
      question: "What is the validity of a GST registration certificate?",
      answer: "For regular taxpayers, the GST registration certificate has lifetime validity unless it is cancelled by the taxpayer or suspended/cancelled by the GST department for non-compliance."
    },
    {
      question: "Is a physical office required to get a GST registration?",
      answer: "Yes, you must declare a principal place of business. It can be a commercial space, an owned residential space, or even a rented room. You must have an electricity bill, municipal tax receipt, or NOC in the owner's name."
    },
    {
      question: "Can a salaried person get GST registration?",
      answer: "Yes, there is no restriction on salaried individuals obtaining GST registration if they run a side business, e-commerce store, or freelance business."
    },
    {
      question: "Can I have multiple GST registrations in the same state?",
      answer: "Yes, a business entity can obtain multiple GSTINs within the same state for different business verticals or separate business premises if needed."
    },
    {
      question: "What documents are needed for an individual/proprietorship GST registration?",
      answer: "The essential documents are: PAN card of owner, Aadhaar card, photograph, proof of business address (like electricity bill/rent agreement), and bank proof (cancelled cheque, passbook, or statement)."
    },
    {
      question: "What bank proofs are acceptable for GST registration?",
      answer: "Acceptable bank proofs include a copy of a cancelled cheque showing the applicant's/business name, first page of the bank passbook with account details, or a recent bank statement showing transactions."
    },
    {
      question: "What happens if I do not register for GST when eligible?",
      answer: "Failing to register for GST when mandatory attracts a penalty of 100% of the tax due or ₹10,000, whichever is higher, along with severe restrictions on business operations."
    },
    {
      question: "Is PAN mandatory for GST registration?",
      answer: "Yes, GST registration is linked to PAN. Your PAN card must be active, and details on your PAN must match your Aadhaar card perfectly to avoid rejection."
    },
    {
      question: "Can I change my business details after getting GST registration?",
      answer: "Yes, business details can be amended post-registration. Changes to core fields (like business name or address) require approval, while non-core fields (like mobile number or email) can be updated instantly."
    },
    {
      question: "What is the Composition Scheme in GST?",
      answer: "The Composition Scheme is a simple option for small businesses with turnover below ₹1.5 Crore. They can pay a flat tax rate (typically 1% to 6%) on turnover and file quarterly returns, but they cannot collect GST or claim ITC."
    },
    {
      question: "How is a Casual Taxable Person defined under GST?",
      answer: "A Casual Taxable Person (CTP) is someone who occasionally undertakes transactions involving supply of goods or services in a state where they have no fixed place of business. CTP registration is temporary (valid up to 90 days)."
    },
    {
      question: "What are the key mistakes to avoid during GST application?",
      answer: "Key mistakes include: uploading blurred documents, mismatched names between PAN and Aadhaar, missing signature on NOC, address mismatch on electric bill, and uploading an invalid/outdated bank statement."
    },
    {
      question: "What is the ARN number in GST?",
      answer: "ARN stands for Application Reference Number. It is generated immediately after submitting the GST registration form on the portal. You can track your application status using the ARN."
    },
    {
      question: "Do I get wallet cashback on GST registration at DigiConnect?",
      answer: "Yes! On completing payment for your GST Registration through DigiConnect, you receive a flat 20% cashback directly credited to your DigiConnect wallet which can be redeemed for other services."
    },
    {
      question: "How is support provided during the application process?",
      answer: "We assign a dedicated CA-assisted compliance expert to your application. They review your uploaded documents, draft the application, coordinate queries, and provide constant support on WhatsApp and Call."
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
      "priceRange": "₹2499",
      "url": "https://www.rnos.in",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "GST Registration Online",
      "description": "Premium online GST registration with expert support and documentation assistance in India.",
      "provider": {
        "@type": "LocalBusiness",
        "name": "DigiConnect Dukan",
      },
      "serviceType": "Taxation",
      "areaServed": "India",
      "offers": {
        "@type": "Offer",
        "price": "2499",
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
      <GstRegistrationClient isLoggedIn={Boolean(user)} faqs={faqs} />
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
