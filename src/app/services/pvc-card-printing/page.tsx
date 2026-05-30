import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  HelpCircle,
  IdCard,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Check,
} from "lucide-react";

import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { MarketingFooter } from "@/components/marketing-footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildServiceWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

const serviceName = "PVC Card Printing Services";
const serviceSlug = "pvc-card-printing";
const servicePath = `/services/${serviceSlug}`;
const applyPath = `/apply/${serviceSlug}`;
const heroImage = "/images/services/pvc/pvc-hero.png";
const serviceCardImage = "/images/services/pvc/pvc-service.png";
const ctaBannerImage = "/images/services/pvc/pvc-cta.png";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Premium PVC Card Printing Services – DigiConnect Dukan",
  description:
    "Convert your Aadhaar, PAN, Voter ID, Ayushman, ABHA, or Driving Licence into durable, waterproof, premium-quality PVC smart cards powered by RNoS India Pvt. Ltd.",
  keywords: [
    "PVC Card Printing",
    "Aadhaar PVC Card",
    "PAN PVC Card",
    "Voter ID PVC",
    "Ayushman PVC Card",
    "ABHA PVC Card",
    "Driving Licence PVC",
    "DigiConnect Dukan",
    "RNoS India",
  ],
  alternates: {
    canonical: servicePath,
  },
  openGraph: {
    title: "Premium PVC Card Printing Services – DigiConnect Dukan",
    description:
      "Convert your documents into durable, waterproof, premium-quality PVC smart cards with professional long-lasting finish.",
    type: "article",
    url: servicePath,
    images: [
      {
        url: heroImage,
        alt: "Premium PVC smart cards floating in air",
      },
    ],
  },
};

const whatsappHref = buildWhatsAppUrl(
  buildServiceWhatsAppMessage({
    serviceName,
    category: "Gov ID & Form Submission",
    action: "enquiry",
    page: servicePath,
  })
);

const whyChoosePVC = [
  { title: "Waterproof & Durable", desc: "No more worries about spills, moisture, or accidental tearing." },
  { title: "Premium Smart Card Finish", desc: "Feels premium in hand, matching the aesthetic of bank credit cards." },
  { title: "Easy to Carry", desc: "Standard credit-card size that fits perfectly in any wallet or cardholder." },
  { title: "Long Lasting Print Quality", desc: "Advanced thermal printing guarantees ink won't fade or peel over time." },
  { title: "Professional Appearance", desc: "Crisp and neat look, leaving a solid impression wherever presented." },
  { title: "High Resolution Printing", desc: "Super sharp text, barcodes, and photo reproduction at 300+ DPI." },
];

const availableCards = [
  { name: "Aadhaar PVC Card", color: "from-blue-500/10 to-cyan-500/10 border-blue-200/50" },
  { name: "PAN PVC Card", color: "from-emerald-500/10 to-teal-500/10 border-emerald-200/50" },
  { name: "Voter ID PVC Card", color: "from-purple-500/10 to-indigo-500/10 border-purple-200/50" },
  { name: "Ayushman Card PVC Card", color: "from-orange-500/10 to-yellow-500/10 border-orange-200/50" },
  { name: "ABHA Card PVC Card", color: "from-rose-500/10 to-pink-500/10 border-rose-200/50" },
  { name: "Driving Licence PVC Card", color: "from-sky-500/10 to-blue-500/10 border-sky-200/50" },
  { name: "Other Government ID Cards", color: "from-slate-500/10 to-slate-500/10 border-slate-200/50" },
];

const processSteps = [
  { step: "1", title: "Upload Your Document", desc: "Simply submit a clear image or PDF of your digital card." },
  { step: "2", title: "Verify Details", desc: "Our team verifies the layout alignment, resolution, and formatting." },
  { step: "3", title: "PVC Card Printing", desc: "High-grade thermal transfer printing on premium solid PVC cores." },
  { step: "4", title: "Quality Check", desc: "Strict manual inspection for sharpness, color matching, and edge finishing." },
  { step: "5", title: "Delivery / Collection", desc: "Super fast dispatch direct to your doorstep with tracking." },
];

const featureCards = [
  { title: "High Quality Printing", icon: Sparkles, desc: "Ultra-sharp thermal transfer tech ensures absolute precision." },
  { title: "Waterproof Material", icon: ShieldCheck, desc: "100% water resistant polymer core that survives accidental dips." },
  { title: "Scratch Resistant", icon: FileCheck2, desc: "Sturdy protective overlay keeps scratches and rubs at bay." },
  { title: "Pocket Friendly Size", icon: CreditCard, desc: "Matches standard ISO 7810 wallet dimensions perfectly." },
  { title: "Fast Processing", icon: Smartphone, desc: "Dispatched within 24-48 hours after validation." },
  { title: "Secure Handling", icon: ClipboardCheck, desc: "Your identity documents are handled securely and deleted post-print." },
];

const trustItems = [
  { title: "Professional Support", desc: "Real humans to help you with layout issues or queries via call and WhatsApp." },
  { title: "Secure Document Handling", desc: "Encrypted transmission, protected servers, and immediate security deletions." },
  { title: "Experienced Team", desc: "Backed by RNoS India's enterprise smart-card printing network." },
  { title: "Customer Satisfaction Focus", desc: "We ensure you love the print quality, offering replacement support if faulty." },
];

const faqs = [
  {
    question: "Can all cards be printed on PVC?",
    answer: "Yes! Almost all government-issued cards, digital IDs, corporate passes, certificates, and personal health cards (Aadhaar, PAN, Voter, Ayushman, ABHA, DL, e-Shram, etc.) can be beautifully printed on PVC.",
  },
  {
    question: "Is PVC card waterproof?",
    answer: "Absolutely. Our PVC cards are composed of dense, high-grade polymers that are 100% waterproof. Unlike laminated paper, they will never absorb moisture or peel at the edges.",
  },
  {
    question: "How long does the print last?",
    answer: "Under normal daily usage inside a wallet, the thermal fusion printing and top overlay ensure the card will remain crisp, vibrant, and perfectly readable for several years.",
  },
  {
    question: "Are my uploaded documents safe?",
    answer: "Yes, 100%. We take security very seriously. Your documents are used strictly for print layout generation, accessed only by authorized production experts, and completely wiped from our storage servers after delivery.",
  },
];

export default async function PvcCardPrintingPage() {
  const applyLabel = "Order Now";

  return (
    <>
      <main className="bg-slate-50 min-h-screen">
        {/* Glow Effects Container */}
        <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white border-b border-slate-100">
          <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-orange-100/30 blur-3xl" />
          <div className="absolute top-12 left-0 -z-10 h-[400px] w-[400px] rounded-full bg-blue-100/30 blur-3xl" />

          {/* Hero Section */}
          <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-20">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              {/* Left Column: Headline and CTAs */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-200/50 bg-blue-50/60 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700 shadow-sm backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
                  Premium smart card service
                </span>
                
                <h1 className="mt-6 text-4xl font-extrabold leading-tight text-slate-900 tracking-tight md:text-6xl lg:leading-[1.1]">
                  Premium PVC <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-orange-500">Card Printing</span> Services
                </h1>

                <p className="mt-5 max-w-2xl text-base md:text-lg font-medium leading-relaxed text-slate-600">
                  Convert your important documents into durable, waterproof, premium-quality PVC smart cards with professional printing and long-lasting finish.
                </p>

                {/* Bullet Points */}
                <div className="mt-6 grid gap-2.5 sm:grid-cols-2 text-sm font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 bg-emerald-50 rounded-full p-0.5" />
                    Waterproof Polymer Core
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 bg-emerald-50 rounded-full p-0.5" />
                    Premium Credit-Card Finish
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 bg-emerald-50 rounded-full p-0.5" />
                    Standard Wallet-Friendly Size
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 bg-emerald-50 rounded-full p-0.5" />
                    Secure Document Handling
                  </div>
                </div>



                {/* CTAs */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href={applyPath} className={cn(buttonVariants({ size: "lg" }), "h-14 rounded-full bg-slate-950 font-extrabold text-white hover:bg-slate-900 shadow-xl shadow-slate-950/10 min-w-[180px]")}>
                    {applyLabel}
                    <ArrowRight className="h-4.5 w-4.5 ml-1" />
                  </Link>
                  <a href={`tel:+917007595931`} className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "h-14 rounded-full font-extrabold border-slate-200 shadow-sm bg-white/80 hover:bg-slate-50 min-w-[180px] gap-2")}>
                    <Phone className="h-4.5 w-4.5 text-slate-600" />
                    +91 7007595931
                  </a>
                </div>
              </div>

              {/* Right Column: Premium AI Float Visual */}
              <div className="lg:col-span-5 relative flex justify-center">
                <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/20 p-2 shadow-[0_20px_50px_rgba(37,99,235,0.08)] backdrop-blur-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-orange-500/10 -z-10 rounded-3xl" />
                  <Image
                    src={heroImage}
                    alt="Ultra premium 3D PVC smart cards floating in air"
                    width={800}
                    height={800}
                    priority
                    className="rounded-2xl h-auto w-full object-cover max-w-md animate-[float_6s_ease-in-out_infinite]"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Why Choose PVC Cards Section */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-600">Unmatched Quality</span>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight md:text-4xl">
              Why Choose PVC Smart Cards?
            </h2>
            <p className="mt-3 text-sm md:text-base leading-relaxed text-slate-500">
              Upgrade your delicate paper documents into robust, enterprise-grade polymer cards designed to last a lifetime.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyChoosePVC.map((item, index) => (
              <div key={index} className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition duration-300 hover:shadow-md hover:border-blue-200/50">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-16 w-16 rounded-full bg-blue-500/5 transition duration-300 group-hover:scale-150" />
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Available Cards Grid Section */}
        <section className="bg-white border-y border-slate-100 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5">
                <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">Extensive Support</span>
                <h2 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight md:text-4xl">
                  Available PVC Printing Formats
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-500 font-medium">
                  We support almost all national IDs, health cards, licensing, and corporate passes. Simply upload your digital copy, and we take care of the rest.
                </p>
                <div className="mt-6">
                  <Link href={applyPath} className={cn(buttonVariants({ size: "lg" }), "rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 font-extrabold text-white hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-600/10")}>
                    Get Started Now
                    <ArrowRight className="h-4.5 w-4.5 ml-1" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="grid gap-4 sm:grid-cols-2">
                  {availableCards.map((card, index) => (
                    <div
                      key={index}
                      className={cn(
                        "rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition hover:scale-[1.02] flex items-center gap-3",
                        card.color
                      )}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-800 shadow-sm border border-slate-100">
                        <IdCard className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="font-extrabold text-slate-850 text-sm tracking-wide">{card.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Process Timeline Section */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-600 font-mono">Streamlined Flow</span>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight md:text-4xl">
              How It Works
            </h2>
            <p className="mt-3 text-sm md:text-base leading-relaxed text-slate-500">
              Our 5-step end-to-end processing guarantees rapid validation, premium printing, and secure shipping.
            </p>
          </div>

          {/* Timeline Component */}
          <div className="mt-16 relative">
            {/* Background connecting line */}
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-gradient-to-r from-blue-500 via-orange-400 to-emerald-500 hidden xl:block -z-10 rounded-full" />
            
            <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-5">
              {processSteps.map((step, index) => (
                <div key={index} className="group flex flex-col items-center text-center bg-white/70 backdrop-blur-md rounded-3xl border border-slate-100 p-6 shadow-sm transition duration-300 hover:shadow-md hover:border-slate-200">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-orange-500 text-white font-extrabold text-base shadow-md group-hover:scale-110 transition duration-300">
                    {step.step}
                  </div>
                  <h3 className="mt-5 text-sm font-extrabold text-slate-900 tracking-wide uppercase">{step.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500 font-medium">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-slate-900 text-white py-16 md:py-24 overflow-hidden relative">
          <div className="absolute bottom-0 right-0 -mb-20 -mr-20 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl -z-10" />
          <div className="absolute top-0 left-0 -mt-20 -ml-20 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl -z-10" />

          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              {/* Product Card Showcase */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-2 shadow-2xl">
                  <Image
                    src={serviceCardImage}
                    alt="Premium PVC Smart Card mockups arranged professionally"
                    width={500}
                    height={500}
                    className="rounded-2xl h-auto w-full object-cover max-w-sm"
                  />
                </div>
              </div>

              {/* Grid of details */}
              <div className="lg:col-span-7">
                <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500 font-mono">Core Advantages</span>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl text-white">
                  State-of-the-Art Smart Card Features
                </h2>
                
                <div className="mt-10 grid gap-6 sm:grid-cols-2">
                  {featureCards.map((feat, index) => {
                    const Icon = feat.icon;
                    return (
                      <div key={index} className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-orange-500 shadow-inner">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">{feat.title}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400 font-medium">{feat.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-600">Enterprise Security</span>
              <h2 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight md:text-4xl">
                Trusted Digital Service Partner
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-500 font-medium">
                DigiConnect Dukan is operated under strict guidelines powered by **RNoS India Pvt. Ltd.** We handle and deliver document print jobs across India with precision and extreme safety.
              </p>
              <div className="mt-6 flex flex-col gap-4 text-sm font-bold text-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-4 w-4" />
                  </div>
                  Registered Corporate Entity
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-4 w-4" />
                  </div>
                  Secure Payments & Checkout Flow
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-4 w-4" />
                  </div>
                  Data Deleted Post printing
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="grid gap-4 sm:grid-cols-2">
                {trustItems.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-wide uppercase">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500 font-medium">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-white border-t border-slate-100 py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-4 md:px-8">
            <div className="text-center">
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">Got Questions?</span>
              <h2 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight md:text-4xl">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="mt-10 grid gap-4">
              {faqs.map((faq, index) => (
                <details
                  key={index}
                  className="group rounded-2xl border border-slate-100 bg-slate-50/50 p-5 shadow-sm open:border-blue-200 transition duration-300 open:bg-white"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 text-sm md:text-base select-none">
                    <span className="flex items-center gap-2">
                      <HelpCircle className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                      {faq.question}
                    </span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition duration-300 group-open:rotate-45 font-extrabold text-xs">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 pl-6 text-xs md:text-sm leading-relaxed text-slate-500 font-medium border-t border-slate-100 pt-3">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="px-4 py-10 md:px-8">
          <div className="mx-auto max-w-7xl rounded-3xl overflow-hidden border border-blue-200/50 relative p-8 md:p-12 shadow-2xl">
            {/* Background image & gradient overlay */}
            <div className="absolute inset-0 -z-20">
              <Image
                src={ctaBannerImage}
                alt="Identity card glowing marketing background"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px]" />
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-500">
                  <CreditCard className="h-3.5 w-3.5 shrink-0" />
                  Apply in 2 minutes
                </span>
                <h2 className="mt-3 text-2xl font-extrabold text-white md:text-4xl tracking-tight leading-tight">
                  Turn Your Documents Into Premium PVC Smart Cards
                </h2>
                <p className="mt-3 text-xs md:text-sm leading-relaxed text-slate-300 font-semibold max-w-2xl">
                  Order high-quality thermal PVC card printing including doorstep delivery. Upload front & back layouts and pay securely with Razorpay.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={applyPath} className={cn(buttonVariants({ size: "lg" }), "h-13 rounded-full bg-orange-500 font-extrabold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/10 min-w-[150px]")}>
                  Order Now
                  <ArrowRight className="h-4.5 w-4.5 ml-1" />
                </Link>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-13 rounded-full font-extrabold border-white/20 text-white hover:bg-white/10 min-w-[150px] gap-2 bg-white/5")}>
                  <MessageCircle className="h-4.5 w-4.5 text-emerald-400" />
                  Support
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
      <HomepageContactActions />
    </>
  );
}
