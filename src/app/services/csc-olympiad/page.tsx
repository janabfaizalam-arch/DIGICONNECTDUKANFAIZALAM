import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowRight, Award, BadgeCheck, Beaker, BookOpen, Brain, 
  BriefcaseBusiness, Calculator, Check, CheckCircle2, 
  Cpu, FileCheck2, FileText, Globe, GraduationCap, Laptop, 
  Lightbulb, LineChart, MessageCircle, Phone, HelpCircle, 
  ShieldCheck, Sparkles, Star, Target, TestTube, Trophy, 
  TrendingUp, Users, Zap
} from "lucide-react";

import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { MarketingFooter } from "@/components/marketing-footer";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getPublicServiceBySlug } from "@/lib/services";
import { getServiceBySlug } from "@/lib/services-data";
import { buildServiceWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { CscOlympiadInteractive } from "@/components/portal/csc-olympiad-interactive";

const serviceName = "CSC Olympiad";
const serviceSlug = "csc-olympiad";
const servicePath = `/services/${serviceSlug}`;
const applyPath = `/services/${serviceSlug}/apply`;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CSC Olympiad Registration 2026 | DigiConnect Dukan",
  description:
    "Register for CSC Olympiad online through DigiConnect Dukan. Official registration assistance for Classes 3–12 with multiple subjects, secure application process and dedicated support.",
  keywords: [
    "CSC Olympiad",
    "Olympiad Registration",
    "Common Service Centres",
    "Digital Olympiad 2026",
    "Competitive Learning",
    "RNoS India",
    "DigiConnect Dukan",
  ],
  alternates: {
    canonical: servicePath,
  },
  openGraph: {
    title: "CSC Olympiad Registration 2026 | DigiConnect Dukan",
    description:
      "Official registration assistance for Classes 3-12 under CSC Olympiad. Competitive learning and digital excellence for Indian students.",
    type: "article",
    url: servicePath,
    images: [
      {
        url: "/images/services/csc-olympiad/hero.webp",
        alt: "CSC Olympiad Registration Poster",
      },
    ],
  },
};

const whatsappHref = buildWhatsAppUrl(
  buildServiceWhatsAppMessage({
    serviceName,
    category: "Loans & Government Schemes",
    action: "apply",
    page: servicePath,
  }),
);

// Timeline items
const timelineSteps = [
  { title: "Registration", desc: "Select subjects and submit student details online." },
  { title: "Review", desc: "Coordinator reviews documents for verification." },
  { title: "Payment", desc: "Complete secure application fee checkout." },
  { title: "Mock Test", desc: "Practice in simulated online testing dashboard." },
  { title: "Exam Login", desc: "Receive proctoring access keys on registered mobile." },
  { title: "Online Exam", desc: "Take a 60-minute remote exam from home." },
  { title: "Result", desc: "View national percentile and analytics reports." },
  { title: "Certificate", desc: "Download digital badge & request medals/trophies." }
];

// Why choose details
const whyChooseCards = [
  { title: "Competitive Learning", desc: "Enhances logical reasoning and scientific intelligence beyond school books.", icon: Trophy, color: "text-amber-500 bg-amber-50" },
  { title: "Digital Skills", desc: "Aligns with Digital India, introducing computer testing and remote proctoring early.", icon: Laptop, color: "text-blue-500 bg-blue-50" },
  { title: "National Recognition", desc: "Compete against students across India, building benchmarks and national standings.", icon: MedalIcon, color: "text-indigo-500 bg-indigo-50" },
  { title: "Certificates", desc: "Get digital participation badges and medals verification link for academic profiles.", icon: Award, color: "text-emerald-500 bg-emerald-50" },
  { title: "Performance Analytics", desc: "Detailed breakdown of strengths, subject focus, and national percentiles.", icon: TrendingUp, color: "text-rose-500 bg-rose-50" },
  { title: "Future Ready", desc: "Prepares children for future competitive entrances like JEE, NEET, and NTSE.", icon: Sparkles, color: "text-purple-500 bg-purple-50" },
];

function MedalIcon(props: any) {
  return <Award {...props} />;
}

// Benefits details
const benefits = [
  { title: "Improve IQ", desc: "Specially formulated question banks focus on sharpening analytical IQ levels.", icon: Brain },
  { title: "Critical Thinking", desc: "Encourages out-of-the-box conceptual problem solving and logical deductions.", icon: Lightbulb },
  { title: "Competitive Prep", desc: "Gives early exposure to online timed tests under remote proctor conditions.", icon: Target },
  { title: "Confidence Booster", desc: "Success and medals validate hard work, keeping students motivated in school.", icon: ShieldCheck },
  { title: "Academic Excellence", desc: "Deepens understanding of topics, showing direct improvement in board grades.", icon: BookOpen },
  { title: "National Ranking", desc: "Positions academic ability on a scale of all India percentiles for colleges.", icon: LineChart },
  { title: "Recognition", desc: "Earn prestigious merit certificates and school representative honors.", icon: Award },
  { title: "Performance Report", desc: "Get complete question-by-question metrics to identify learning gaps.", icon: FileCheck2 },
];

// Exam Features Grid
const features = [
  { label: "60 Minutes", desc: "Sufficient time to solve application-based questions." },
  { label: "MCQ Format", desc: "Multiple choice format evaluating core understanding." },
  { label: "100% Online", desc: "Zero travel. Attempt from home or school labs." },
  { label: "Remote Proctored", desc: "Webcam surveillance ensuring test integrity." },
  { label: "Mock Tests", desc: "Practice mock tests loaded prior to exam day." },
  { label: "Performance Report", desc: "Comprehensive report card for weak areas." },
  { label: "Verify Certificate", desc: "Secure QR-code based registration details search." }
];

// Documents checklist
const documents = [
  "Student Name & Gender",
  "Date of Birth (DOB)",
  "School Name & Board",
  "Target Class Selection",
  "Parent Mobile Number",
  "Registered Email Address",
  "Passport Size Photo",
];

// List of all classes & subjects fallback catalog
const fallbackClasses = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const fallbackSubjects = [
  { id: "maths", name: "Mathematics", icon: "Calculator", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "science", name: "Science", icon: "Beaker", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "english", name: "English", icon: "BookOpen", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "hindi", name: "Hindi", icon: "BookOpen", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "computer", name: "Computer Science", icon: "Laptop", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "gk", name: "General Knowledge", icon: "Globe", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "reasoning", name: "Logical Reasoning", icon: "Lightbulb", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "cyber", name: "Cyber Security", icon: "ShieldAlert", classes: [11,12] },
  { id: "physics", name: "Physics", icon: "Atom", classes: [11,12] },
  { id: "chemistry", name: "Chemistry", icon: "FlaskConical", classes: [11,12] },
  { id: "biology", name: "Biology", icon: "Activity", classes: [11,12] },
  { id: "history", name: "History", icon: "Hourglass", classes: [9,10,11,12] },
  { id: "geography", name: "Geography", icon: "Compass", classes: [9,10,11,12] },
  { id: "economics", name: "Economics", icon: "LineChart", classes: [9,10,11,12] },
  { id: "business", name: "Business Studies", icon: "Briefcase", classes: [11,12] },
  { id: "accountancy", name: "Accountancy", icon: "BarChart3", classes: [11,12] },
  { id: "psychology", name: "Psychology", icon: "Brain", classes: [11,12] }
];

export default async function CscOlympiadPage() {
  const user = await getCurrentUser();
  const applyCtaLabel = user ? "Register Now" : "Login to Register";

  // Fetch dynamic settings from database (falling back to local servicesData definition)
  const dbService = await getPublicServiceBySlug("csc-olympiad");
  const fallbackService = getServiceBySlug("csc-olympiad");

  let dbConfig: any = {};
  if (dbService?.blogContent) {
    try {
      dbConfig = JSON.parse(dbService.blogContent);
    } catch {
      // not json
    }
  }

  const finalConfig = {
    session: dbConfig.session ?? "2026-2027",
    lastDate: dbConfig.lastDate ?? "October 31, 2026",
    pricePerSubject: dbConfig.registrationFee?.offerPrice ?? dbService?.amount ?? fallbackService?.amount ?? 100,
    oldPricePerSubject: dbConfig.registrationFee?.price ?? 150,
    heroTitle: dbConfig.hero?.title ?? dbService?.title ?? "CSC Olympiad Registration 2026",
    heroSubtitle: dbConfig.hero?.subtitle ?? dbService?.shortDescription ?? "Empowering students from Class 3 to 12 through competitive learning and digital excellence.",
    notifications: dbConfig.notifications ?? [
      "Registration for Academic Session 2026-27 is now open.",
      "National level ranking and performance report cards will be issued to all participants."
    ],
    gallery: dbConfig.gallery ?? [
      { url: "/images/services/pm-vishwakarma/toolkit-incentive.png", title: "Olympiad Study Group" }
    ],
    faqs: dbConfig.faqs ?? dbService?.faqs ?? fallbackService?.faqs ?? [],
    testimonials: dbConfig.testimonials ?? dbService?.reviews ?? fallbackService?.reviews ?? [],
    subjects: dbConfig.subjects ?? fallbackSubjects,
  };

  // Structured Schema data
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: finalConfig.faqs.map((faq: any) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://digiconnectdukan.com/" },
      { "@type": "ListItem", position: 2, name: "Services", item: "https://digiconnectdukan.com/services" },
      { "@type": "ListItem", position: 3, name: "CSC Olympiad", item: `https://digiconnectdukan.com${servicePath}` }
    ]
  };

  return (
    <>
      <main className="bg-white min-h-screen relative overflow-hidden noise-bg">
        {/* Apple WWDC Mesh ambient glows */}
        <div className="ambient-glow ambient-blue w-[500px] h-[500px] -top-64 -left-32" />
        <div className="ambient-glow ambient-orange w-[500px] h-[500px] top-[40%] -right-32" />
        <div className="ambient-glow ambient-purple w-[600px] h-[600px] bottom-10 left-[10%]" />

        {/* Floating circles decor */}
        <div className="absolute top-24 left-[15%] w-3 h-3 rounded-full bg-blue-500/30 animate-pulse pointer-events-none" />
        <div className="absolute top-[35%] right-[20%] w-4.5 h-4.5 rounded-full bg-orange-400/20 pointer-events-none" />
        <div className="absolute bottom-[25%] left-[8%] w-6 h-6 rounded-full border border-blue-400/20 pointer-events-none" />

        {/* Dynamic notices header strip */}
        <div className="bg-slate-900 text-white text-xs font-bold py-2.5 px-4 overflow-hidden relative z-40 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] uppercase tracking-wider text-emerald-400">Important Notification</span>
            </div>
            <div className="homepage-notice-rotator flex-1 truncate text-center text-slate-300 font-semibold px-4 text-[11px]">
              Last Date to apply for Session {finalConfig.session} is {finalConfig.lastDate}. Register today!
            </div>
            <div className="hidden md:flex gap-1.5 items-center text-slate-400 text-[10px]">
              Powered by RNoS India Pvt. Ltd.
            </div>
          </div>
        </div>

        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-8 pb-12 md:py-16 px-4 md:px-8 border-b border-slate-100">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center relative z-10">
            <div className="relative">
              <p className="inline-flex rounded-full border border-blue-200/50 bg-blue-50/70 backdrop-blur-md px-4.5 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-blue-700 shadow-sm">
                🎓 National Student Olympiad 2026
              </p>
              
              <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950 md:text-6xl tracking-tight">
                {finalConfig.heroTitle}
              </h1>
              
              <p className="mt-4 text-base leading-relaxed text-slate-600 max-w-2xl font-medium">
                {finalConfig.heroSubtitle} Structured learning path, national standings audit, digital certificates, and medal honors facilitated directly online.
              </p>

              {/* Fee banner overlay */}
              <div className="mt-6 inline-flex flex-col sm:flex-row sm:items-center gap-4 bg-white/80 backdrop-blur-md border border-blue-100/55 p-3 px-5 rounded-2xl shadow-sm">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">FACILITATION FEE</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-slate-900">₹{finalConfig.pricePerSubject}</span>
                    <span className="text-sm font-bold text-slate-400 line-through">₹{finalConfig.oldPricePerSubject}</span>
                    <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">₹50 OFF</span>
                  </div>
                </div>
                <div className="hidden sm:block w-px h-8 bg-slate-200" />
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">SESSION</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">{finalConfig.session} Academic Year</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href={applyPath} className={cn(buttonVariants({ size: "lg" }), "premium-button-blue shadow-lg")}>
                  {applyCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "premium-button-whatsapp")}>
                  <MessageCircle className="h-4 w-4" />
                  Chat with Coordinator
                </a>
              </div>

              {/* Mini terms */}
              <p className="mt-4 text-[11px] font-semibold text-slate-400">
                * Facilitation fee covers secure database listing, document checks, and dedicated WhatsApp coordinator access.
              </p>
            </div>

            {/* Right side: Large Premium Hero Image mock visual */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950 p-1.5 shadow-2xl shadow-blue-950/10">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(37,99,235,0.15)_0%,transparent_60%)] z-10 pointer-events-none" />
                
                {/* Visual content container */}
                <div className="bg-slate-900/60 rounded-[1.85rem] overflow-hidden aspect-[4/3] flex flex-col items-center justify-center relative p-8 text-center text-white">
                  
                  {/* Floating abstract education elements mock visual */}
                  <div className="absolute top-6 left-6 flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-md">
                    <Laptop className="h-4 w-4 text-blue-400" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Remote Exam</span>
                  </div>

                  <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full backdrop-blur-md">
                    <Award className="h-4 w-4 text-emerald-400" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">Medals & Honors</span>
                  </div>

                  {/* Medal Graphic */}
                  <div className="relative w-28 h-28 flex items-center justify-center bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-full shadow-lg border-4 border-amber-400 animate-pulse">
                    <Trophy className="h-14 w-14 text-amber-950 drop-shadow-md" />
                    {/* Ribbon */}
                    <div className="absolute -bottom-4 w-6 h-12 bg-red-600 rounded-b-md shadow-md -z-10 rotate-12" />
                    <div className="absolute -bottom-4 w-6 h-12 bg-blue-600 rounded-b-md shadow-md -z-10 -rotate-12" />
                  </div>

                  <h3 className="text-xl md:text-2xl font-black mt-8 text-white drop-shadow-md">Future Technology & Skills</h3>
                  <p className="text-xs text-slate-400 mt-2 max-w-sm">Competency analysis auditing, logical aptitude tests, and scientific excellence indicators for Classes 3–12.</p>
                  
                  {/* Glass circles backdrop */}
                  <div className="absolute w-60 h-60 rounded-full border border-white/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                  <div className="absolute w-80 h-80 rounded-full border border-white/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Floating small glass stats card */}
              <div className="absolute -bottom-6 -left-6 md:left-6 glass-liquid-premium border border-white/60 p-4 rounded-2xl shadow-xl max-w-[190px] flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                  <Star className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Accreditation</h4>
                  <p className="text-xs font-black text-slate-900 leading-tight mt-0.5">CSC Academy Partner</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTENT SHELL WITH STICKY SIDEBAR */}
        <section className="px-4 py-12 md:px-8">
          <div className="mx-auto max-w-7xl grid gap-8 lg:grid-cols-[1fr_310px] lg:items-start">
            
            {/* Main content area */}
            <div className="space-y-16">
              
              {/* SECTION: Why Choose CSC Olympiad */}
              <div>
                <div className="max-w-2xl">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">Educational Benchmarking</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 md:text-4xl">Why Choose CSC Olympiad</h2>
                  <p className="mt-3 text-sm text-slate-600">Six primary benefits that position this exam as India''s most valued school-level assessment.</p>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {whyChooseCards.map((card, idx) => {
                    const IconComp = card.icon;
                    return (
                      <article key={idx} className="liquid-card rounded-2xl p-5 border border-slate-100 hover:border-blue-200 bg-white/70">
                        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", card.color)}>
                          <IconComp className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 text-base font-extrabold text-slate-950">{card.title}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500 font-semibold">{card.desc}</p>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* CLIENT-SIDE INTERACTIVE CURRICULUM, ACCORDIONS, AND TESTIMONIALS */}
              <CscOlympiadInteractive 
                subjects={finalConfig.subjects}
                classes={fallbackClasses}
                testimonials={finalConfig.testimonials}
                faqs={finalConfig.faqs}
                pricePerSubject={finalConfig.pricePerSubject}
                oldPricePerSubject={finalConfig.oldPricePerSubject}
                applyPath={applyPath}
                applyCtaLabel={applyCtaLabel}
              />

              {/* SECTION: Horizontal Animated Exam Process Timeline */}
              <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-6 md:p-10 border border-slate-800 shadow-2xl">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.08)_0%,transparent_70%)] pointer-events-none" />
                
                <div className="max-w-xl mb-10 relative z-10">
                  <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-950/80 border border-blue-900/30 px-3 py-1 rounded-full">
                    Examination Roadmap
                  </span>
                  <h2 className="mt-3 text-2xl font-black text-white">How the Exam Process Works</h2>
                  <p className="mt-2 text-xs text-slate-400">From form registration to digital certificate download, navigate each step of your child''s olympiad journey.</p>
                </div>

                {/* Horizontal flow line for large screens, grid for mobile */}
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 relative z-10">
                  {timelineSteps.map((step, index) => (
                    <div key={index} className="flex gap-3.5 relative">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white shadow-md shadow-blue-500/20">
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-extrabold text-white">{step.title}</h4>
                        <p className="text-[11px] leading-relaxed text-slate-400 mt-1 font-medium">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: Benefits */}
              <div>
                <div className="max-w-2xl">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">Cognitive Advantages</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 md:text-4xl">Key Benefits of Participation</h2>
                  <p className="mt-3 text-sm text-slate-600">Olympiad testing aids a student''s overall development, sharpening school metrics and exam preparedness.</p>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {benefits.map((item, idx) => {
                    const IconComp = item.icon;
                    return (
                      <div key={idx} className="flex gap-4 rounded-2xl border border-slate-100 bg-white/70 p-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shrink-0">
                          <IconComp className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-950">{item.title}</h3>
                          <p className="text-[11px] leading-relaxed text-slate-500 font-semibold mt-1">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: Exam Features & Document Required in a Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* Grid 1: Exam Features */}
                <div className="rounded-2xl border border-blue-100/50 bg-white/70 p-5 md:p-7 shadow-sm">
                  <h3 className="text-lg font-black text-slate-950">Technical Specifications</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Key parameters of the online proctored examination.</p>
                  <div className="mt-5 grid gap-2.5">
                    {features.map((feat, index) => (
                      <div key={index} className="flex items-center justify-between border-b border-slate-50 pb-2 text-xs font-semibold">
                        <span className="text-slate-800">{feat.label}</span>
                        <span className="text-slate-500 text-right">{feat.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid 2: Documents Required */}
                <div className="rounded-2xl border border-orange-100/50 bg-white/70 p-5 md:p-7 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">Documents Required</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Keep these fields ready before starting your registration.</p>
                    <div className="mt-5 grid gap-2">
                      {documents.map((doc, index) => (
                        <div key={index} className="flex items-center gap-2.5 rounded-xl bg-orange-50/40 p-2.5">
                          <FileCheck2 className="h-4.5 w-4.5 text-orange-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-700">{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal mt-4 font-semibold">
                    * Passport size photo is required during file upload. School ID or Principal certificate is requested as study validation proof.
                  </p>
                </div>
              </div>

            </div>

            {/* STICKY GLASS SIDEBAR */}
            <aside className="lg:sticky lg:top-20 space-y-4">
              
              {/* Assistance Sidebar Card */}
              <div className="glass-liquid-premium rounded-2xl p-5 border border-white/60 shadow-xl bg-white/80">
                <span className="text-[9px] uppercase font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md tracking-wider">
                  Registration Support
                </span>
                <h3 className="text-sm font-black text-slate-950 mt-2.5">Olympiad Assistance</h3>
                <p className="text-xs text-slate-500 mt-1 leading-normal font-semibold">
                  Facing issues with subject mapping or payments? Our coordinators are available to assist.
                </p>

                <div className="mt-4 grid gap-2">
                  <a href="tel:+919000000000" className="flex items-center gap-2 rounded-xl bg-slate-50/80 p-2.5 hover:bg-slate-100 border border-slate-100 transition text-xs font-bold text-slate-800">
                    <Phone className="h-4 w-4 text-blue-500" />
                    <span>Call Helpline</span>
                  </a>
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-950 p-2.5 hover:bg-emerald-100/80 border border-emerald-100/50 transition text-xs font-bold">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    <span>WhatsApp Support</span>
                  </a>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2.5 text-[10px] text-slate-400 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>Facilitated registrations are verified securely. Your data remains proctored and encrypted.</span>
                </div>
              </div>

              {/* Quick status tracker shortcut */}
              {user && (
                <div className="rounded-2xl border border-slate-100 p-4.5 bg-slate-50/70 text-xs font-bold flex flex-col gap-2.5">
                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Dashboard shortcut</span>
                  <Link href="/customer/dashboard" className="flex items-center justify-between text-blue-600 hover:text-blue-700">
                    <span>Track My Registrations</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </aside>

          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
        <section className="px-4 pb-12 md:px-8 mt-10">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 p-8 text-white text-center border border-indigo-900 shadow-2xl relative">
            <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
              <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-950/60 border border-indigo-900/40 px-3 py-1 rounded-full tracking-widest">
                Prepare For The Future
              </span>
              <h2 className="mt-4 text-3xl font-black">Become Future Ready</h2>
              <p className="mt-3 text-xs leading-relaxed text-slate-300 font-semibold">
                Build conceptual accuracy and logical skills by participating in the national CSC Olympiad. Empowering students from Classes 3 to 12.
              </p>
              
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href={applyPath} className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                  {applyCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-750 text-white text-sm font-bold shadow-lg border border-slate-700/50 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                  <MessageCircle className="h-4 w-4 text-emerald-400" />
                  WhatsApp Help
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>

      <MarketingFooter />
      <HomepageContactActions />
      
      {/* SEO Schema mappings */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
