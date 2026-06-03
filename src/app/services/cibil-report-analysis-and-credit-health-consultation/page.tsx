import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Clock,
  FileSearch,
  HelpCircle,
  Lock,
  LockKeyhole,
  MessageCircle,
  MonitorCheck,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { buildServiceWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

const serviceSlug = "cibil-report-analysis-and-credit-health-consultation";
const serviceName = "CIBIL Report Analysis & Credit Health Consultation";
const heroImage = "/images/services/cibil/cibil-report-analysis.png";
const cibilExpertPhone = "9305086491";

const whatsappHref = buildWhatsAppUrl(
  buildServiceWhatsAppMessage({
    serviceName,
    category: "Finance & Banking",
    action: "enquiry",
    page: `/services/${serviceSlug}`,
  }),
  `91${cibilExpertPhone}`,
);

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CIBIL Report Analysis & Credit Health Consultation | DigiConnect Dukan",
  description:
    "Get your TransUnion CIBIL Report, one-page financial analysis, loan details, overdue amount, score improvement plan and expert consultation with DigiConnect Dukan.",
  keywords: [
    "CIBIL Report Analysis",
    "Credit Health Consultation",
    "CIBIL Membership",
    "Credit Score Improvement",
    "Loan Readiness",
    "DigiConnect Dukan",
  ],
  alternates: {
    canonical: `/services/${serviceSlug}`,
  },
  openGraph: {
    title: "CIBIL Report Analysis & Credit Health Consultation",
    description: "Get TransUnion CIBIL membership, credit score improvement plan and expert consultation.",
    type: "article",
    url: `/services/${serviceSlug}`,
    images: [{ url: heroImage, alt: serviceName }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CIBIL Report Analysis & Credit Health Consultation",
    description: "Understand your credit health before applying for loans.",
    images: [heroImage],
  },
};

const trustItems = [
  { label: "Fast Delivery", text: "Report in 2 Hours", icon: Clock },
  { label: "100% Secure", text: "Encrypted Data", icon: Lock },
  { label: "Expert Guidance", text: "Certified Analysts", icon: UserCheck },
  { label: "Full Confidentiality", text: "Private & Safe", icon: ShieldCheck },
];

const basicFeatures = [
  "Latest TransUnion CIBIL Report",
  "One Page Financial History Summary",
  "Running/Closed Accounts Details",
  "Pending/Overdue Amount Details",
  "Total Loan Liability",
  "Delay/DPD Details",
  "Delivery within 2 hours",
  "Free basic consultation",
];

const premiumFeatures = [
  "Complete CIBIL Report Analysis",
  "Loan & Credit Card Breakdown",
  "Credit Utilization Analysis",
  "Score Improvement Plan",
  "Future Loan Approval Guidance",
  "Expert Consultation (Live Session)",
  "Personalized Action Plan",
  "Follow-up Support",
  "6 Month Monitoring Membership",
  "Report updates every 15 days",
  "Priority Support (Call/WhatsApp)",
];

const comparisonTable = [
  { feature: "TransUnion CIBIL Report", basic: true, premium: true },
  { feature: "One-Page Summary Report", basic: true, premium: true },
  { feature: "Active & Closed Loan Details", basic: true, premium: true },
  { feature: "Pending Dues & Overdue Detection", basic: true, premium: true },
  { feature: "Delay/DPD Details Check", basic: true, premium: true },
  { feature: "Delivery Speed", basic: "2 Hours", premium: "Same Day (Consultation scheduled)" },
  { feature: "Expert Line-by-Line Analysis", basic: false, premium: true },
  { feature: "Score Improvement Roadmap", basic: false, premium: true },
  { feature: "Wrong Entries/Dispute Guidance", basic: false, premium: true },
  { feature: "6-Month Monitoring Membership", basic: false, premium: true },
  { feature: "Bureau Report Updates", basic: "One-time", premium: "Every 15 Days" },
  { feature: "Expert Consultation Session", basic: "Basic Chat", premium: "1-on-1 Call Session" },
  { feature: "Priority Support & Follow-up", basic: false, premium: true },
];

const processSteps = [
  { title: "Select Plan & Apply", desc: "Choose Basic or Premium and fill basic details online.", icon: Zap },
  { title: "Secure Verification", desc: "Authenticate with Aadhaar/PAN details safely.", icon: Lock },
  { title: "Bureau Report Retrieval", desc: "We fetch your latest TransUnion credit profile.", icon: FileSearch },
  { title: "Expert Analysis", desc: "Our financial analysts check for errors, DPDs & dues.", icon: Activity },
  { title: "One Page summary", desc: "Get a clear, easy-to-read custom PDF report.", icon: BadgeCheck },
  { title: "Expert Support", desc: "Review roadmap & resolve disputes via WhatsApp/Call.", icon: MessageCircle },
];

const testimonials = [
  {
    name: "Rajesh Kumar",
    location: "New Delhi",
    text: "CIBIL report down hone ki wajah samajh nahi aa rahi thi. DigiConnect expert ne line-by-line check karke overdue details clear kiye aur 6 months me score improve hua!",
    rating: 5,
  },
  {
    name: "Priya Sharma",
    location: "Mumbai",
    text: "Basic report only ₹518 me mil gayi within 1 hour. Summary was very clean and easy to understand compared to raw bureau sheets.",
    rating: 5,
  },
  {
    name: "Amit Patel",
    location: "Ahmedabad",
    text: "Excellent dispute support! Wrong loan entries show ho rahi thi profile pe. Expert ne step-by-step documentation help kiya aur details clear ho gayi.",
    rating: 5,
  },
];

const faqs = [
  {
    question: "Basic and Premium plans me kya difference hai?",
    answer: "Basic plan (₹518) me aapko latest TransUnion CIBIL report aur ek concise One-Page summary sheet milti hai (outstanding loans, due amount, closed/active accounts summaries ke sath). Premium plan (₹2599) me complete analytical review, score badhane ka roadmap, dispute guidance, 1-on-1 call par expert consultation, and 6 months ke liye monitoring membership milti hai (updates every 15 days).",
  },
  {
    question: "Kya mera score sach me improve hoga?",
    answer: "Score improvement aapke repayment behavior aur report entries ke documentation par depend karta hai. DigiConnect Dukan aapko precise analysis, negative accounts detect karne me, aur bureau records me updates ke liye guidelines deta hai taaki aapka profile loan-ready ban sake.",
  },
  {
    question: "CIBIL dispute clearance me kitna time lagta hai?",
    answer: "Jab hum kisi wrong entry ya unknown enquiry ko detect karte hain, toh dispute guidelines ke through bureau ko report kiya jata hai. Official guidelines ke mutabik TransUnion bureau disputes ko verify aur resolve karne me 30 to 45 days ka time leta hai.",
  },
  {
    question: "Is this process secure for my PAN and Aadhaar details?",
    answer: "Absolutely. DigiConnect Dukan follows strict data security policies. Aapki critical customer files aur personal information end-to-end encrypted rehti hain aur unhe direct bureau request verification ke alawa kisi third party ke sath share nahi kiya jata.",
  },
  {
    question: "Delivery me kitna time lagta hai?",
    answer: "Basic report and summary apply karne ke within 2 hours aapke WhatsApp/Dashboard par deliver ho jati hai. Premium analysis and consultation call apply karne ke same day ke andar schedule ho jati hai.",
  },
];

export default async function CibilCreditHealthPage() {
  const user = await getCurrentUser();
  const applyLabel = user ? "Apply Now" : "Login to Apply";

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: serviceName,
      description: "Get your TransUnion CIBIL Report, one-page financial analysis, loan details, overdue amount, score improvement plan and expert consultation with DigiConnect Dukan.",
      provider: { "@type": "LocalBusiness", name: "DigiConnect Dukan", telephone: `+91${cibilExpertPhone}` },
      serviceType: "Credit Health Consultation",
      areaServed: "India",
      offers: [
        { "@type": "Offer", price: 518, priceCurrency: "INR", name: "Basic CIBIL One Pager Report" },
        { "@type": "Offer", price: 2599, priceCurrency: "INR", name: "Premium CIBIL Analysis & Consultation" }
      ],
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
  ];

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {/* Dynamic Animated Styles for Score Needle */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes swingNeedle {
          0% { transform: rotate(-90deg); }
          100% { transform: rotate(57deg); }
        }
        .animate-needle {
          transform-origin: 100px 100px;
          animation: swingNeedle 2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}} />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 via-slate-900 to-blue-950 text-white px-4 py-16 md:px-8 md:py-24">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-cyan-600/10 blur-[100px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-400">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              RBI Compliant & Bureau Connected
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl leading-[1.1]">
              Credit Score Safe Hai Ya Risk Pe?<br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Know Your CIBIL Health
              </span>
            </h1>
            <p className="max-w-2xl mx-auto lg:mx-0 text-slate-300 text-base leading-relaxed md:text-lg">
              Loans ya Credit Cards reject hone se pehle check karein. Get your TransUnion CIBIL report, one-page financial history summary, overdue details, and live credit health expert advice.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <a href="#pricing-section" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-8 text-sm font-extrabold text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-105 active:scale-[0.98]">
                Check CIBIL Now
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 text-sm font-extrabold text-white hover:bg-white/10 transition-colors">
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                WhatsApp Enquiry
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
              <div>
                <p className="text-2xl font-black text-white">4.8★</p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">User Rating</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">10K+</p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Reports Analyzed</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">2 Hrs</p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Avg. Delivery</p>
              </div>
            </div>
          </div>

          {/* Interactive SVG Gauge Panel */}
          <div className="relative flex justify-center items-center">
            {/* Glass Card Container */}
            <div className="relative w-full max-w-md p-8 rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
              <div className="text-center mb-6">
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Bureau Score Simulator</p>
                <h3 className="text-xl font-bold mt-1 text-white">Excellent Score Profile</h3>
              </div>
              
              <div className="relative flex justify-center items-center h-48">
                {/* SVG Gauge */}
                <svg className="w-56 h-56" viewBox="0 0 200 200">
                  {/* Gauge Arc Background */}
                  <path d="M40 140 A 70 70 0 1 1 160 140" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
                  {/* Red segment (Poor: 300-550) */}
                  <path d="M40 140 A 70 70 0 0 1 70 65" fill="none" stroke="#ef4444" strokeWidth="12" />
                  {/* Yellow/Orange segment (Average: 550-700) */}
                  <path d="M70 65 A 70 70 0 0 1 130 65" fill="none" stroke="#f97316" strokeWidth="12" />
                  {/* Green segment (Excellent: 700-900) */}
                  <path d="M130 65 A 70 70 0 0 1 160 140" fill="none" stroke="#10b981" strokeWidth="12" strokeLinecap="round" />
                  
                  {/* Inner text score display */}
                  <text x="100" y="125" textAnchor="middle" className="text-3xl font-black fill-white">785</text>
                  <text x="100" y="145" textAnchor="middle" className="text-[10px] font-bold tracking-wider fill-emerald-400 uppercase">Excellent</text>
                  
                  {/* Needle pointer */}
                  <g className="animate-needle">
                    <line x1="100" y1="100" x2="100" y2="40" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="100" cy="100" r="8" fill="#f8fafc" />
                    <circle cx="100" cy="100" r="3" fill="#0f172a" />
                  </g>
                </svg>
              </div>

              {/* Status breakdown tags */}
              <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] text-center font-bold text-slate-300">
                <div className="bg-red-500/10 border border-red-500/20 py-2 rounded-xl">
                  <span className="block text-red-500">Poor</span>
                  <span>300 - 549</span>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 py-2 rounded-xl">
                  <span className="block text-orange-400">Average</span>
                  <span>550 - 700</span>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 py-2 rounded-xl">
                  <span className="block text-emerald-400">Excellent</span>
                  <span>701 - 900</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white border-y border-slate-100 py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {trustItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-2xl transition duration-200 hover:bg-slate-50">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                    <Icon className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 leading-tight">{item.label}</h4>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="px-4 py-16 md:px-8 md:py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-widest text-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            Why DigiConnect Dukan
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Sahi Financial Health Analysis, No Placeholders
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-base font-semibold leading-relaxed text-slate-500">
            Automated algorithms can download a PDF, but they cannot tell you *why* a bank rejected you. DigiConnect is your complete personal financial credit assistance partner.
          </p>

          <div className="grid gap-6 mt-12 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Expert Human Analysis",
                desc: "Verified financial analysts review active loans, payment timings, and DPD triggers by hand.",
                icon: FileSearch,
              },
              {
                title: "Dispute Support Signals",
                desc: "Wrong reporting, duplicate loans, and unrecognized enquiries are flagged step-by-step.",
                icon: AlertTriangle,
              },
              {
                title: "Future Loan Guidance",
                desc: "Detailed checklist of what to remove, clear, or update to enhance your bank approvals.",
                icon: TrendingUp,
              },
              {
                title: "100% Privacy Enforced",
                desc: "All personal KYC credentials and database entries are processed through safe, encrypted keys.",
                icon: LockKeyhole,
              },
              {
                title: "DigiWallet Benefits",
                desc: "Get 100% reward cashback on your first paid service, reusable up to 50% on future services.",
                icon: WalletCards,
              },
              {
                title: "Real-Time Tracking",
                desc: "Secure document uploads, invoices, and progress notes are saved in your customer account.",
                icon: MonitorCheck,
              },
            ].map((box, idx) => {
              const Icon = box.icon;
              return (
                <Card key={idx} className="p-6 border border-slate-100 bg-white rounded-2xl shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-950 mt-4">{box.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-500 font-semibold mt-2">{box.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section id="pricing-section" className="px-4 py-16 md:px-8 md:py-24 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-widest text-cyan-700">
              <Zap className="h-3.5 w-3.5" />
              Choose Your Plan
            </span>
            <h2 className="mt-4 text-3xl font-black text-slate-950 sm:text-5xl">Transparent Pricing Variants</h2>
            <p className="mt-3 text-sm font-semibold text-slate-500">Apne requirement ke mutabik sahi option choose karein aur 2 hours me results payein.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto items-stretch">
            {/* Basic Card */}
            <Card className="relative p-8 rounded-3xl border border-slate-200 bg-white flex flex-col justify-between transition-transform hover:-translate-y-1 hover:shadow-lg duration-200">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-950">Basic CIBIL Report</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1">One Pager History Summary</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600 uppercase">Self Check</span>
                </div>
                
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-950">₹518</span>
                  <span className="text-xs font-bold text-slate-400">/ One-time fee</span>
                </div>

                <div className="mt-4 text-xs font-semibold bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-100/50">
                  🎉 Expected Wallet Cashback: <span className="font-extrabold">₹104</span> (20%)
                </div>

                <ul className="mt-6 space-y-3.5 text-xs font-bold text-slate-700">
                  {basicFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 space-y-3">
                <Link
                  href={`/apply/${serviceSlug}?plan=basic`}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 text-xs font-extrabold text-white transition hover:bg-slate-900"
                >
                  {applyLabel} - ₹518
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-xs font-extrabold text-slate-700 transition hover:bg-slate-50">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                  WhatsApp Consult
                </a>
              </div>
            </Card>

            {/* Premium Card */}
            <Card className="relative p-8 rounded-3xl border-2 border-blue-600 bg-slate-950 text-white flex flex-col justify-between shadow-xl shadow-blue-900/10 transition-transform hover:-translate-y-1 duration-200">
              <div className="absolute top-0 right-8 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-3.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-white shadow-md">
                Recommended Plan
              </div>
              
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-extrabold">Premium Analysis</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1">Credit Health Consultation</p>
                  </div>
                  <span className="rounded-full bg-blue-500/20 px-3 py-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Expert Assisted</span>
                </div>
                
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-black">₹2599</span>
                  <span className="text-xs font-bold text-slate-400">/ 6 Months Access</span>
                </div>

                <div className="mt-4 text-xs font-semibold bg-cyan-500/10 text-cyan-400 p-2.5 rounded-xl border border-cyan-500/20">
                  🔥 Expected Wallet Cashback: <span className="font-extrabold">₹520</span> (20% reward)
                </div>

                <ul className="mt-6 space-y-3.5 text-xs font-bold text-slate-200">
                  {premiumFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 space-y-3">
                <Link
                  href={`/apply/${serviceSlug}?plan=premium`}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-xs font-extrabold text-slate-950 transition hover:brightness-110 shadow-lg shadow-blue-500/20"
                >
                  {applyLabel} - ₹2599
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 text-xs font-extrabold text-white hover:bg-white/10">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                  WhatsApp Live Help
                </a>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-4 py-16 md:px-8 md:py-24 bg-slate-50">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-950">Plan Comparison</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Dono packages ki features details ko side-by-side analyze karein.</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200 text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                  <th className="p-4 sm:p-5">Feature Benefits</th>
                  <th className="p-4 text-center">Basic Plan (₹518)</th>
                  <th className="p-4 text-center">Premium Plan (₹2599)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-bold text-slate-700">
                {comparisonTable.map((row, idx) => (
                  <tr key={idx} className="transition hover:bg-slate-50/50">
                    <td className="p-4 sm:p-5 font-semibold text-slate-900">{row.feature}</td>
                    <td className="p-4 text-center">
                      {typeof row.basic === "boolean" ? (
                        row.basic ? (
                          <Check className="h-5 w-5 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 stroke-[2.5] text-slate-300 mx-auto" />
                        )
                      ) : (
                        <span className="text-slate-600">{row.basic}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof row.premium === "boolean" ? (
                        row.premium ? (
                          <Check className="h-5 w-5 text-blue-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 stroke-[2.5] text-slate-300 mx-auto" />
                        )
                      ) : (
                        <span className="text-slate-900 font-extrabold">{row.premium}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Six Step Stepper Section */}
      <section className="px-4 py-16 md:px-8 md:py-24 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-widest text-blue-700">
              <Activity className="h-3.5 w-3.5" />
              Workflow Process
            </span>
            <h2 className="mt-4 text-3xl font-black text-slate-950 sm:text-5xl">Secure 6-Step Delivery</h2>
            <p className="mt-3 text-sm font-semibold text-slate-500">Apply se lekar final support tak, hum aapke sath har step par khade hain.</p>
          </div>

          <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {processSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="relative group p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition duration-200 text-left">
                  <div className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-blue-900 text-xs font-black text-white">
                    0{idx + 1}
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-4">{step.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-500 font-semibold mt-2">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="px-4 py-16 md:px-8 md:py-24 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-950 sm:text-5xl">Success Stories</h2>
            <p className="mt-3 text-sm font-semibold text-slate-500">Dekhiye humare clients ne DigiConnect se help lekar kaise loan approvals hasil kiye.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((test, idx) => (
              <Card key={idx} className="p-6 border border-slate-100 bg-white rounded-2xl shadow-sm flex flex-col justify-between text-left">
                <div className="space-y-4">
                  <div className="flex gap-1">
                    {Array.from({ length: test.rating }).map((_, i) => (
                      <Star key={i} className="h-4.5 w-4.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 font-semibold italic">&ldquo;{test.text}&rdquo;</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-sm font-extrabold text-slate-900">{test.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{test.location}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 py-16 md:px-8 md:py-24 bg-white">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-widest text-blue-700">
              <HelpCircle className="h-3.5 w-3.5" />
              FAQs
            </span>
            <h2 className="mt-4 text-3xl font-black text-slate-950 sm:text-5xl">Frequently Asked Questions</h2>
            <p className="mt-3 text-sm font-semibold text-slate-500">CIBIL report aur credit health ke common sawalon ke jawab.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={idx} className="group rounded-2xl border border-slate-200 bg-slate-50/20 p-5 shadow-sm transition hover:border-slate-300">
                <summary className="cursor-pointer list-none text-sm sm:text-base font-extrabold text-slate-950 flex items-center justify-between gap-4">
                  <span>{faq.question}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-blue-600 transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600 font-semibold border-t border-slate-100 pt-3">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="px-4 pb-20 pt-10 md:px-8 md:pb-28">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-8 text-white shadow-2xl shadow-blue-950/20 md:p-14 text-center lg:text-left relative">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-80 h-80 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-400">Get Credit Confident</span>
              <h2 className="text-3xl font-extrabold md:text-5xl leading-tight">Start Improving Your CIBIL Score Today</h2>
              <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-300 font-semibold">
                Apni required basic details and KYC upload karein, secure payment complete karein aur payein line-by-line experts ki analysis report jo bank reject nahi hone degi.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#pricing-section" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-sm font-extrabold text-slate-950 hover:bg-slate-50 transition shadow-lg">
                View Plans
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 text-sm font-extrabold text-white hover:bg-white/10 transition">
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                WhatsApp Live support
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* JSON-LD Schemas */}
      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
    </main>
  );
}
