import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getPublicServiceBySlug } from "@/lib/services";
import { getServiceBySlug } from "@/lib/services-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPublishedArticles } from "@/lib/articles";
import { getActiveGalleryImages } from "@/lib/gallery";
import { CscOlympiadInteractive } from "@/components/portal/csc-olympiad-interactive";

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

const fallbackSubjects = [
  { id: "maths", name: "Mathematics", icon: "Calculator", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "science", name: "Science", icon: "Beaker", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "english", name: "English", icon: "BookOpen", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "hindi", name: "Hindi", icon: "BookOpen", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "computer", name: "Computer Science", icon: "Laptop", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "gk", name: "General Knowledge", icon: "Globe", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "reasoning", name: "Logical Reasoning", icon: "Lightbulb", classes: [3,4,5,6,7,8,9,10,11,12] },
  { id: "cyber", name: "Cyber Safety", icon: "ShieldAlert", classes: [9,10] },
  { id: "physics", name: "Physics", icon: "Atom", classes: [11,12] },
  { id: "chemistry", name: "Chemistry", icon: "FlaskConical", classes: [11,12] },
  { id: "biology", name: "Biology", icon: "Activity", classes: [11,12] },
  { id: "history", name: "History", icon: "Hourglass", classes: [11,12] },
  { id: "geography", name: "Geography", icon: "Compass", classes: [11,12] },
  { id: "economics", name: "Economics", icon: "LineChart", classes: [11,12] },
  { id: "business", name: "Business Studies", icon: "Briefcase", classes: [11,12] },
  { id: "accountancy", name: "Accountancy", icon: "BarChart3", classes: [11,12] },
  { id: "psychology", name: "Psychology", icon: "Brain", classes: [11,12] },
];

const defaultStats = {
  classes: "Classes 3–12",
  subjects: "17 Subjects",
  mediums: "10 Mediums",
  priceLabel: "₹299 per subject",
  registrations: "15 lakh+",
  participation: "3,60,000+",
  states: "36 States & UT",
};

const defaultRewards = {
  topper1st: "₹30,000",
  topper2nd: "₹20,000",
  topper3rd: "₹10,000",
  school1st: "1st ₹1,00,000",
  school2nd: "2nd ₹75,000",
  school3rd: "3rd ₹25,000",
  notes: "Scholarships and School Awards are subject to national ranking percentiles. Conditions apply.",
};

const defaultToggles = {
  hero: true,
  stats: true,
  whyChoose: true,
  explorer: true,
  mediumChart: true,
  preparation: true,
  examMode: true,
  calendar: true,
  rewards: true,
  winners: true,
  gallery: true,
  timeline: true,
  blogs: true,
  contact: true,
};

const defaultCalendar = [
  { subject: "English / Hindi / GK / Logical Reasoning / Computer / Cyber Safety", phase1: "Nov 15 - Nov 20, 2026", phase2: "Dec 10 - Dec 15, 2026", timeWindow: "09:00 AM - 06:00 PM IST", notes: "Students can choose time slot in the portal" },
  { subject: "Mathematics / Science / Physics / Chemistry / Biology / History / Geography / Accountancy / Economics", phase1: "Nov 22 - Nov 30, 2026", phase2: "Dec 18 - Dec 28, 2026", timeWindow: "09:00 AM - 06:00 PM IST", notes: "Webcam proctor active during test" }
];

export default async function CscOlympiadPage() {
  const user = await getCurrentUser();
  const applyCtaLabel = user ? "Register Now" : "Login to Register";

  // Fetch dynamic settings from database (falling back to local servicesData definition)
  const dbService = await getPublicServiceBySlug("csc-olympiad");
  const fallbackService = getServiceBySlug("csc-olympiad");

  let dbConfig: Record<string, unknown> = {};
  if (dbService?.blogContent) {
    try {
      dbConfig = JSON.parse(dbService.blogContent) as Record<string, unknown>;
    } catch {
      // not json
    }
  }

  // Retrieve category ID from database to check existence
  const supabase = getSupabaseAdmin();
  let dbServiceRow: { id: string; category_id: string | null } | null = null;
  if (supabase) {
    const { data } = await supabase
      .from("services")
      .select("id, category_id")
      .eq("slug", "csc-olympiad")
      .maybeSingle();
    if (data) {
      dbServiceRow = {
        id: data.id,
        category_id: data.category_id,
      };
    }
  }

  // Fetch blogs/articles dynamically
  const publishedArticles = await getPublishedArticles();
  const filteredArticles = (publishedArticles ?? []).filter(
    (art) =>
      art.category?.toLowerCase().includes("olympiad") ||
      art.title.toLowerCase().includes("olympiad") ||
      art.excerpt?.toLowerCase().includes("olympiad")
  );

  // Fetch active gallery images from database
  const activeGalleryImages = await getActiveGalleryImages(30);

  const registrationFee = (dbConfig.registrationFee as Record<string, number | string | undefined>) ?? {};
  const hero = (dbConfig.hero as Record<string, string | undefined>) ?? {};
  const stats = (dbConfig.stats as Record<string, string | undefined>) ?? defaultStats;
  const rewards = (dbConfig.rewards as Record<string, string | undefined>) ?? defaultRewards;
  const toggles = (dbConfig.toggles as Record<string, boolean | undefined>) ?? defaultToggles;

  const finalConfig = {
    session: (dbConfig.session as string | undefined) ?? "2026-2027",
    lastDate: (dbConfig.lastDate as string | undefined) ?? "October 31, 2026",
    countdownDate: (dbConfig.countdownDate as string | undefined) ?? "2026-10-31T23:59:59",
    pricePerSubject: Number(registrationFee.offerPrice ?? dbService?.amount ?? fallbackService?.amount ?? 299),
    oldPricePerSubject: Number(registrationFee.price ?? 399),
    offerText: (registrationFee.offerText as string | undefined) ?? "Special facilitation pricing. Discount of ₹100 per subject",
    heroTitle: hero.title ?? dbService?.title ?? "CSC Olympiad Registration 2026",
    heroSubtitle: hero.subtitle ?? dbService?.shortDescription ?? "Empowering Young Minds through competitive learning, digital literacy and academic excellence.",
    brochureUrl: hero.brochureUrl ?? "/docs/csc-olympiad/brochure.pdf",
    dateSheetUrl: hero.dateSheetUrl ?? "/docs/csc-olympiad/datesheet.pdf",
    notifications: (dbConfig.notifications as string[] | undefined) ?? [
      "Registration for Academic Session 2026-27 is now open.",
      "National level ranking and performance report cards will be issued to all participants."
    ],
    stats: {
      classes: stats.classes ?? defaultStats.classes,
      subjects: stats.subjects ?? defaultStats.subjects,
      mediums: stats.mediums ?? defaultStats.mediums,
      priceLabel: stats.priceLabel ?? defaultStats.priceLabel,
      registrations: stats.registrations ?? defaultStats.registrations,
      participation: stats.participation ?? defaultStats.participation,
      states: stats.states ?? defaultStats.states,
    },
    subjects: (dbConfig.subjects as typeof fallbackSubjects | undefined) ?? fallbackSubjects,
    faqs: (dbConfig.faqs as { question: string; answer: string }[] | undefined) ?? dbService?.faqs ?? fallbackService?.faqs ?? [],
    testimonials: (((dbConfig.testimonials ?? dbService?.reviews ?? fallbackService?.reviews ?? []) as { name: string; role?: string; location?: string; text: string }[]).map(
      (t) => ({
        name: t.name,
        role: t.role ?? t.location ?? "",
        text: t.text,
      })
    )),
    examCalendar: (dbConfig.examCalendar as typeof defaultCalendar | undefined) ?? defaultCalendar,
    rewards: {
      topper1st: rewards.topper1st ?? defaultRewards.topper1st,
      topper2nd: rewards.topper2nd ?? defaultRewards.topper2nd,
      topper3rd: rewards.topper3rd ?? defaultRewards.topper3rd,
      school1st: rewards.school1st ?? defaultRewards.school1st,
      school2nd: rewards.school2nd ?? defaultRewards.school2nd,
      school3rd: rewards.school3rd ?? defaultRewards.school3rd,
      notes: rewards.notes ?? defaultRewards.notes,
    },
    winners: (dbConfig.winners as { id: string; photo: string; name: string; class: string; subject: string; rank: string; state: string; year: string }[] | undefined) ?? [],
    gallery: (dbConfig.gallery as { url: string; title: string; category: string; year: string; sortOrder: number; active: boolean }[] | undefined) ?? [],
    toggles: {
      hero: toggles.hero ?? defaultToggles.hero,
      stats: toggles.stats ?? defaultToggles.stats,
      whyChoose: toggles.whyChoose ?? defaultToggles.whyChoose,
      explorer: toggles.explorer ?? defaultToggles.explorer,
      mediumChart: toggles.mediumChart ?? defaultToggles.mediumChart,
      preparation: toggles.preparation ?? defaultToggles.preparation,
      examMode: toggles.examMode ?? defaultToggles.examMode,
      calendar: toggles.calendar ?? defaultToggles.calendar,
      rewards: toggles.rewards ?? defaultToggles.rewards,
      winners: toggles.winners ?? defaultToggles.winners,
      gallery: toggles.gallery ?? defaultToggles.gallery,
      timeline: toggles.timeline ?? defaultToggles.timeline,
      blogs: toggles.blogs ?? defaultToggles.blogs,
      contact: toggles.contact ?? defaultToggles.contact,
    },
  };

  // Structured Schema data
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: finalConfig.faqs.map((faq) => ({
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

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "CSC Olympiad Online Registration",
    "provider": {
      "@type": "EducationalOrganization",
      "name": "CSC Academy",
      "sameAs": "https://www.cscolympiads.in"
    },
    "serviceType": "Online Educational Olympiad Assessment",
    "offers": {
      "@type": "Offer",
      "price": String(finalConfig.pricePerSubject),
      "priceCurrency": "INR"
    },
    "description": finalConfig.heroSubtitle
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "DigiConnect Dukan - Powered by RNoS India Pvt. Ltd.",
    "url": "https://digiconnectdukan.com",
    "logo": "https://digiconnectdukan.com/logo-navbar.png",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IN"
    }
  };

  return (
    <>
      <main className="bg-slate-950 text-slate-100 min-h-screen relative overflow-hidden">
        
        {/* Apple WWDC Clear Liquid Glass Background Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none z-0" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-[30%] right-[-10%] w-[50%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
        
        {/* Dynamic notices header strip */}
        {finalConfig.notifications.length > 0 && (
          <div className="bg-blue-950/80 backdrop-blur-md text-white text-[11px] font-bold py-2 px-4 overflow-hidden relative z-40 border-b border-blue-900/50">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[9px] uppercase tracking-wider text-cyan-400">Notice</span>
              </div>
              <div className="flex-1 truncate text-center text-slate-200 font-semibold px-4">
                Last Date to apply for Session {finalConfig.session} is {finalConfig.lastDate}. Registration Fee is ₹{finalConfig.pricePerSubject} per subject.
              </div>
              <div className="hidden md:flex gap-1.5 items-center text-slate-400 text-[10px]">
                Powered by RNoS India
              </div>
            </div>
          </div>
        )}

        <CscOlympiadInteractive 
          config={{
            ...finalConfig,
            dbServiceId: dbServiceRow?.id ?? "",
            dbCategoryId: dbServiceRow?.category_id ?? "",
          }}
          articles={filteredArticles}
          dbGallery={activeGalleryImages}
          applyPath={applyPath}
          applyCtaLabel={applyCtaLabel}
        />

      </main>

      {/* SEO Schema mappings */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
    </>
  );
}
