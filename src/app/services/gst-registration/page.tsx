import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import GSTRegistrationClient from "./gst-registration-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GST Registration Online - Fast & CA-Assisted | DigiConnect Dukan",
  description: "Register your business for GST online. End-to-end expert CA support, document verification, quick ARN generation, and lifetime compliance tracking for ₹2,499.",
  keywords: [
    "GST registration online",
    "Apply for GSTIN",
    "GST certificate India",
    "Udyam registration bundle",
    "GST registration process",
    "Tax compliance services"
  ],
  alternates: {
    canonical: "/services/gst-registration",
  },
  openGraph: {
    title: "GST Registration Online - Fast & CA-Assisted | DigiConnect Dukan",
    description: "Register your business for GST online. End-to-end expert CA support, document verification, quick ARN generation, and lifetime compliance tracking for ₹2,499.",
    type: "website",
    url: "/services/gst-registration",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "GST Registration DigiConnect Dukan Logo",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GST Registration Online - Fast & CA-Assisted | DigiConnect Dukan",
    description: "Register your business for GST online. End-to-end expert CA support, document verification, quick ARN generation, and lifetime compliance tracking for ₹2,499.",
  }
};

const faqs = [
  {
    question: "What is GST Registration?",
    answer: "Goods and Services Tax (GST) registration is a process by which a business is registered under the GST law in India. A unique 15-digit GSTIN (Goods and Services Tax Identification Number) is issued by the government, which allows you to collect tax from customers and claim tax credits on inputs."
  },
  {
    question: "Who is mandatorily required to register for GST?",
    answer: "Any business with an annual turnover exceeding ₹40 Lakhs for goods (₹20 Lakhs for North-Eastern states) or ₹20 Lakhs for services (₹10 Lakhs for North-Eastern states) must register for GST. Additionally, e-commerce sellers, interstate traders, and casual taxable persons must register regardless of turnover."
  },
  {
    question: "What are the threshold limits for GST Registration in India?",
    answer: "For Service Providers, the threshold limit is ₹20 Lakhs per annum (₹10 Lakhs in special states). For Goods Suppliers/Manufacturers, the limit is ₹40 Lakhs per annum (₹20 Lakhs in special states)."
  },
  {
    question: "Can I get a voluntary GST registration?",
    answer: "Yes. Any business with a turnover below the threshold limit can voluntarily apply for GST registration. This is highly recommended to claim Input Tax Credit (ITC), open current accounts, and sell products on online platforms."
  },
  {
    question: "What documents are required for GST Registration?",
    answer: "You will need: 1. PAN Card of the applicant or business, 2. Aadhaar Card, 3. Passport size photo, 4. Registered business address proof (Utility bill or property tax receipt), 5. Rent agreement and landlord NOC (if rented), 6. Bank account proof (cancelled cheque or passbook page)."
  },
  {
    question: "How long does it take to get a GSTIN?",
    answer: "Normally, once we submit your application, the government processes it and issues the GST certificate within 3 to 7 working days. However, this is subject to government portal response times and any officer clarifications."
  },
  {
    question: "What is Udyam Registration (MSME), and why is it bundled?",
    answer: "Udyam Registration is the official certificate proving that your business is registered under the MSME ministry. We bundle it with GST because it unlocks government benefits, collateral-free business loans, lower interest rates, subsidy on electrical bills, and protection against delayed payments."
  },
  {
    question: "Do I need a physical office/commercial space to register for GST?",
    answer: "No. You can register your GST using your home address as the place of business. You only need a clean electricity bill/tax receipt in the owner's name and a signed No Objection Certificate (NOC) stating you are operating from there."
  },
  {
    question: "Can a freelancer or consultant register for GST?",
    answer: "Yes, freelancers, designers, writers, developers, and independent consultants can register for GST. In fact, if you offer services to international clients, having a GSTIN allows you to file zero-rated exports and claim refunds on taxes paid for tools/computers."
  },
  {
    question: "What is a Composition Scheme under GST?",
    answer: "The Composition Scheme is a simplified tax scheme for small taxpayers with annual turnover up to ₹1.5 Crores. It permits filing of quarterly returns and paying tax at a flat rate (1% to 6%) without the ability to claim Input Tax Credit (ITC) or issue taxable invoices."
  },
  {
    question: "Is a bank account mandatory during the registration process?",
    answer: "No. The government allows businesses to submit their bank details after the GSTIN is active (within 45 days of getting registered). You can use a personal bank account cancelled cheque initially or upload it later once your new business current account is opened."
  },
  {
    question: "What happens if I operate without GST registration when required?",
    answer: "Operating a business that crosses the statutory threshold without a GSTIN is illegal. If caught, you can face penalties up to 100% of the tax due, or a minimum fine of ₹10,000, along with confiscation of goods."
  },
  {
    question: "Can I register multiple businesses under a single PAN?",
    answer: "Yes. You can register multiple business verticals or branches under a single PAN. Each registration will have a distinct GSTIN but is tied to the same PAN configuration."
  },
  {
    question: "What are the charges if I register GST through DigiConnect Dukan?",
    answer: "Our basic GST Registration service charge is ₹2,499. The GST + MSME combo is ₹2,799, and the Business Launch Kit (GST + MSME + FSSAI + web portal setup) is ₹3,899. There are no hidden or extra filing fees."
  },
  {
    question: "What is the validity of a GST certificate?",
    answer: "Once issued, a GST registration certificate is valid for the lifetime of the business. It does not require annual renewals, provided you file regular returns. Casual taxable persons and non-resident taxpayers receive certificates with restricted validity."
  },
  {
    question: "How do I track my GST application status?",
    answer: "We provide an Application Reference Number (ARN) as soon as the files are submitted. You can track this ARN on the government GST portal or directly on your DigiConnect Dukan customer dashboard."
  },
  {
    question: "What is Input Tax Credit (ITC)?",
    answer: "Input Tax Credit (ITC) allows you to reduce the tax you owe on sales by the amount of tax you already paid on purchases. For example, if you collect ₹10,000 tax on sales and paid ₹6,000 tax on inventory purchases, you only pay the net difference of ₹4,000 to the government."
  },
  {
    question: "What is the process if my GST application gets rejected?",
    answer: "If the tax officer requests additional clarification (a show-cause notice is issued), our CAs will formulate and submit the response on your behalf. In the rare case of a final rejection, we will refile the application or provide a full refund of our professional charges."
  },
  {
    question: "Do I need to file GST returns even if I have no sales?",
    answer: "Yes. Once you receive your GSTIN, filing monthly/quarterly returns is mandatory. If you have no sales or transactions during a month, you must file a 'Nil Return' to avoid late filing fines."
  },
  {
    question: "How will I receive my GST registration certificate?",
    answer: "The GST department issues the certificate digitally. Once approved, we download the official signed PDF (Form REG-06) and upload it to your DigiConnect dashboard, which also triggers an email notification."
  },
  {
    question: "Can I cancel my GST registration in the future?",
    answer: "Yes. If you close your business, cease operations, or falls below the threshold limits, you can easily apply for cancellation of GST online. We can support you in the formal cancellation and final return filing process."
  }
];

function buildSchemas() {
  const siteUrl = "https://www.rnos.in";
  return [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "DigiConnect Dukan",
      "legalName": "RNOS India Pvt Ltd",
      "telephone": "+91 7007595931",
      "areaServed": "IN",
      "priceRange": "₹2,499",
      "url": siteUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "GST Registration Service",
      "description": "Professional GST Registration with Expert CA Assistance, Document Verification, ARN tracking and Unified Tax Compliance Setup.",
      "provider": {
        "@type": "LocalBusiness",
        "name": "DigiConnect Dukan",
      },
      "serviceType": "Tax & Compliance",
      "areaServed": "India",
      "offers": {
        "@type": "Offer",
        "price": 2499,
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
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": siteUrl,
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Services",
          "item": `${siteUrl}/services`,
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "GST Registration",
          "item": `${siteUrl}/services/gst-registration`,
        },
      ],
    },
  ];
}

export default async function GSTRegistrationPage() {
  const user = await getCurrentUser();

  return (
    <>
      <main className="min-h-screen">
        <GSTRegistrationClient isLoggedIn={Boolean(user)} />
      </main>

      {/* Inject SEO Structured Schema Scripts */}
      {buildSchemas().map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
