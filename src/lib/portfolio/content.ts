/**
 * RNOS Digital — portfolio content.
 *
 * The single source for /portfolio, the project pages and the homepage band.
 * Plain typed data on the server, so moving it to an admin-managed table later
 * means replacing these exports, not the pages.
 *
 * Authenticity rule: every project here is a concept piece designed to show
 * what RNOS Digital builds. None is a client delivery, and none carries a
 * client name, a testimonial or a result figure. `kind` says so, the UI prints
 * the label from it, and a test fails if a project is marked as client work
 * without being listed in APPROVED_CLIENT_PROJECTS.
 */

export type ProjectKind = "concept" | "design-exploration" | "client";

export const PROJECT_KIND_LABEL: Record<ProjectKind, string> = {
  concept: "Concept Project",
  "design-exploration": "Design Exploration",
  client: "Client Project",
};

/** Slugs of real, client-approved projects. Empty until one is approved in writing. */
export const APPROVED_CLIENT_PROJECTS: readonly string[] = [];

export type ProjectCategory =
  | "corporate"
  | "ecommerce"
  | "fashion"
  | "hospitality"
  | "healthcare"
  | "education"
  | "real-estate"
  | "saas";

export const PROJECT_CATEGORIES: { id: ProjectCategory; label: string }[] = [
  { id: "corporate", label: "Corporate" },
  { id: "ecommerce", label: "E-Commerce" },
  { id: "fashion", label: "Fashion & Lifestyle" },
  { id: "hospitality", label: "Hospitality" },
  { id: "healthcare", label: "Healthcare" },
  { id: "education", label: "Education" },
  { id: "real-estate", label: "Real Estate" },
  { id: "saas", label: "SaaS & Applications" },
];

/** The look of a concept's mockup: its own palette, as a client site would have. */
export type MockTheme = {
  /** Page background. */
  paper: string;
  /** Headline / dark text. */
  ink: string;
  /** Main brand colour of the concept. */
  accent: string;
  /** Second colour for art blocks. */
  accent2: string;
  /** Soft tint for panels. */
  tint: string;
  /** Headline face in the mock. */
  serif?: boolean;
};

export type MockLayout =
  | "corporate"
  | "store"
  | "editorial"
  | "resort"
  | "clinic"
  | "academy"
  | "property"
  | "dashboard";

export type Project = {
  slug: string;
  name: string;
  kind: ProjectKind;
  category: ProjectCategory;
  industry: string;
  /** One line for cards. */
  summary: string;
  /** Two or three sentences for the project page. */
  brief: string;
  /** What the concept demonstrates, as short lines. */
  features: string[];
  stack: string[];
  /** Copy that appears inside the mockup. */
  mock: {
    layout: MockLayout;
    theme: MockTheme;
    brand: string;
    headline: string;
    sub: string;
    cta: string;
    nav: string[];
    items: { title: string; meta: string }[];
  };
};

export const PROJECTS: Project[] = [
  {
    slug: "ledgerdesk-gst-billing",
    name: "LedgerDesk",
    kind: "concept",
    category: "saas",
    industry: "Finance & Accounting SaaS",
    summary: "A GST billing and accounts workspace for small businesses, with invoices, ledgers and reminders in one calm dashboard.",
    brief:
      "LedgerDesk explores how GST invoicing, payment follow-ups and day-book entries can live in one workspace a shop owner understands at a glance. The dashboard leads with what needs attention today instead of every report at once.",
    features: ["Role-based dashboard", "GST invoices with e-way bill fields", "Payment reminders over WhatsApp", "Ledger and day-book views", "Razorpay payment links"],
    stack: ["Next.js", "TypeScript", "Supabase", "PostgreSQL", "Razorpay"],
    mock: {
      layout: "dashboard",
      theme: { paper: "#f6f8fc", ink: "#0d1b33", accent: "#1f5eff", accent2: "#16b47e", tint: "#e8eefc" },
      brand: "LedgerDesk",
      headline: "Good morning, Shree Traders",
      sub: "3 invoices due today",
      cta: "New invoice",
      nav: ["Overview", "Invoices", "Ledger", "Customers", "GST returns"],
      items: [
        { title: "Receivables", meta: "₹4,82,300" },
        { title: "Paid this month", meta: "₹11,40,950" },
        { title: "GST payable", meta: "₹62,410" },
      ],
    },
  },
  {
    slug: "kesar-kitchen-d2c-store",
    name: "Kesar Kitchen",
    kind: "concept",
    category: "ecommerce",
    industry: "Food & Spices D2C",
    summary: "A direct-to-consumer spice store with rich product storytelling, quick UPI checkout and order tracking.",
    brief:
      "Kesar Kitchen imagines a regional spice brand selling online for the first time. Product pages lead with origin and recipes, checkout is two steps with UPI and cards through Razorpay, and every order can be tracked without an account.",
    features: ["Product storytelling pages", "Two-step UPI checkout", "Order tracking without login", "Recipe and bundle cross-sell", "Inventory and order admin"],
    stack: ["Next.js", "Tailwind CSS", "Supabase", "Razorpay", "WhatsApp API"],
    mock: {
      layout: "store",
      theme: { paper: "#fffaf3", ink: "#2a1608", accent: "#c2410c", accent2: "#eab308", tint: "#fdecd6", serif: true },
      brand: "Kesar Kitchen",
      headline: "Spices with a story",
      sub: "Small-batch masalas, ground the week they ship.",
      cta: "Shop the range",
      nav: ["Masalas", "Whole spices", "Gift boxes", "Recipes"],
      items: [
        { title: "Kashmiri Mirch", meta: "₹249" },
        { title: "Garam Masala", meta: "₹199" },
        { title: "Saffron 1g", meta: "₹449" },
        { title: "Haldi Gold", meta: "₹149" },
      ],
    },
  },
  {
    slug: "aangan-studio-handloom",
    name: "Aangan Studio",
    kind: "concept",
    category: "fashion",
    industry: "Handloom Fashion Label",
    summary: "An editorial lookbook and store for a handloom label, built around large imagery and slow, considered browsing.",
    brief:
      "Aangan Studio is a design exploration for a handloom label that sells on craft rather than discounts. The site reads like a printed lookbook, with collections, weaver stories and a restrained shop that never shouts.",
    features: ["Editorial lookbook layout", "Collection and weaver stories", "Size guide and fit notes", "Wishlist and enquiry", "Instagram-ready product imagery"],
    stack: ["Next.js", "React", "Tailwind CSS", "Supabase"],
    mock: {
      layout: "editorial",
      theme: { paper: "#f7f3ee", ink: "#1c1917", accent: "#9f1239", accent2: "#a16207", tint: "#ede4da", serif: true },
      brand: "AANGAN",
      headline: "Woven slowly. Worn for years.",
      sub: "The Monsoon Collection",
      cta: "View the lookbook",
      nav: ["Collections", "Sarees", "Kurtas", "Weavers"],
      items: [
        { title: "Indigo Chanderi", meta: "Saree" },
        { title: "Rust Mangalgiri", meta: "Kurta" },
        { title: "Ivory Jamdani", meta: "Dupatta" },
      ],
    },
  },
  {
    slug: "vihaan-lake-resort",
    name: "Vihaan Lake Resort",
    kind: "concept",
    category: "hospitality",
    industry: "Hotel & Resort",
    summary: "A resort website that sells the stay first, with a sticky availability bar and direct booking enquiries.",
    brief:
      "Vihaan Lake Resort explores a hotel site that earns direct bookings instead of sending guests to aggregators. Rooms, experiences and dining are shown as a stay, and availability is one tap away on every page.",
    features: ["Sticky availability search", "Room and suite pages", "Experiences and dining", "Direct booking enquiries", "Google Maps and reviews link"],
    stack: ["Next.js", "Tailwind CSS", "Supabase", "Razorpay", "Google Analytics"],
    mock: {
      layout: "resort",
      theme: { paper: "#f3f7f6", ink: "#0f2a2a", accent: "#0f766e", accent2: "#d97706", tint: "#d9ece8", serif: true },
      brand: "Vihaan",
      headline: "Wake up to the lake",
      sub: "24 rooms on the water, two hours from the city.",
      cta: "Check availability",
      nav: ["Stay", "Dining", "Experiences", "Weddings"],
      items: [
        { title: "Lake View Suite", meta: "from ₹8,900" },
        { title: "Garden Cottage", meta: "from ₹6,400" },
        { title: "Family Villa", meta: "from ₹14,500" },
      ],
    },
  },
  {
    slug: "arogya-family-clinic",
    name: "Arogya Family Clinic",
    kind: "concept",
    category: "healthcare",
    industry: "Multi-specialty Clinic",
    summary: "A clinic website with doctor profiles, clear timings and an appointment flow that works in two minutes on a phone.",
    brief:
      "Arogya Family Clinic is a concept for a neighbourhood clinic. Patients find the right doctor, today's timings and fees, and book a slot without a phone call; the front desk sees every booking in one list.",
    features: ["Doctor profiles and timings", "Two-minute appointment booking", "WhatsApp confirmations", "Front-desk booking list", "Health articles in Hindi and English"],
    stack: ["Next.js", "TypeScript", "Supabase", "WhatsApp API"],
    mock: {
      layout: "clinic",
      theme: { paper: "#f5fbff", ink: "#0b2540", accent: "#0369a1", accent2: "#10b981", tint: "#e0f2fe" },
      brand: "Arogya",
      headline: "Care for the whole family",
      sub: "General medicine, paediatrics and dental under one roof.",
      cta: "Book an appointment",
      nav: ["Doctors", "Services", "Timings", "Contact"],
      items: [
        { title: "Dr. A. Verma", meta: "General Physician" },
        { title: "Dr. S. Khan", meta: "Paediatrics" },
        { title: "Dr. R. Iyer", meta: "Dental Surgeon" },
      ],
    },
  },
  {
    slug: "shiksha-coaching-academy",
    name: "Shiksha Academy",
    kind: "concept",
    category: "education",
    industry: "Coaching Institute",
    summary: "An admissions-first site for a coaching institute, with batches, fees, results pages and an enquiry funnel.",
    brief:
      "Shiksha Academy explores a coaching institute site where every page leads a parent towards the right batch. Course pages answer fees, timings and faculty upfront, and enquiries reach the counsellor with the batch already chosen.",
    features: ["Course and batch pages", "Fee and schedule tables", "Counsellor enquiry funnel", "Student portal login", "Blog for exam updates"],
    stack: ["Next.js", "React", "Supabase", "PostgreSQL"],
    mock: {
      layout: "academy",
      theme: { paper: "#fbfaff", ink: "#1e1b4b", accent: "#5b21b6", accent2: "#f59e0b", tint: "#ede9fe" },
      brand: "Shiksha",
      headline: "The right batch changes everything",
      sub: "Foundation, JEE and NEET batches for classes 9 to 12.",
      cta: "Find your batch",
      nav: ["Courses", "Batches", "Faculty", "Admissions"],
      items: [
        { title: "JEE 2-Year", meta: "Class 11 · Morning" },
        { title: "NEET Crash", meta: "Class 12 · Evening" },
        { title: "Foundation", meta: "Class 9 · Weekend" },
      ],
    },
  },
  {
    slug: "greenfield-residences",
    name: "Greenfield Residences",
    kind: "concept",
    category: "real-estate",
    industry: "Residential Project",
    summary: "A project microsite with floor plans, location advantages and RERA details shown plainly, built to collect qualified enquiries.",
    brief:
      "Greenfield Residences is a concept microsite for a mid-rise residential project. Floor plans, price bands and the location map sit on the first screens, the RERA number is visible everywhere, and enquiries arrive with the configuration the buyer looked at.",
    features: ["Floor plans by configuration", "Location map and distances", "RERA details on every page", "Site-visit booking", "Enquiry tracking for the sales team"],
    stack: ["Next.js", "Tailwind CSS", "Supabase", "Meta Pixel"],
    mock: {
      layout: "property",
      theme: { paper: "#f7f8f4", ink: "#1a2e1a", accent: "#3f6212", accent2: "#b45309", tint: "#e7eedc" },
      brand: "Greenfield",
      headline: "Homes with room to breathe",
      sub: "2 & 3 BHK residences with 70% open green space.",
      cta: "Book a site visit",
      nav: ["Overview", "Floor plans", "Location", "Amenities"],
      items: [
        { title: "2 BHK", meta: "1,080 sq ft" },
        { title: "3 BHK", meta: "1,460 sq ft" },
        { title: "3 BHK + Study", meta: "1,720 sq ft" },
      ],
    },
  },
  {
    slug: "meridian-advisory",
    name: "Meridian Advisory",
    kind: "concept",
    category: "corporate",
    industry: "Professional Services",
    summary: "A corporate site for a tax and advisory firm that explains services in plain language and turns visits into consultations.",
    brief:
      "Meridian Advisory is a concept for a chartered accountancy and advisory firm. Services are explained in the words clients search for, partners are introduced properly, and every page ends with a way to book a consultation.",
    features: ["Service pages written for search", "Partner and team profiles", "Consultation booking", "Knowledge articles", "Client document upload portal"],
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Supabase"],
    mock: {
      layout: "corporate",
      theme: { paper: "#f8fafc", ink: "#0b1d3a", accent: "#0b3d91", accent2: "#c08a2b", tint: "#e6ecf6", serif: true },
      brand: "Meridian",
      headline: "Clear advice for growing businesses",
      sub: "Tax, audit and advisory for founders and family businesses.",
      cta: "Book a consultation",
      nav: ["Services", "Industries", "Insights", "About"],
      items: [
        { title: "Tax & GST", meta: "Compliance and planning" },
        { title: "Audit", meta: "Statutory and internal" },
        { title: "Advisory", meta: "Funding and structure" },
      ],
    },
  },
];

export function projectBySlug(slug: string) {
  return PROJECTS.find((project) => project.slug === slug) ?? null;
}

/** Projects for the homepage band, in this order. */
export const HOMEPAGE_PROJECT_SLUGS = ["ledgerdesk-gst-billing", "kesar-kitchen-d2c-store", "vihaan-lake-resort", "aangan-studio-handloom"];

/* ─────────────────────────────────────────────────────────────────────────
   Capabilities, stack, process, growth
   ───────────────────────────────────────────────────────────────────────── */

export type CapabilityId = "websites" | "ecommerce" | "software" | "design" | "branding" | "marketing" | "automation";

export type Capability = {
  id: CapabilityId;
  title: string;
  description: string;
  points: string[];
  /** Where "see examples" goes: a project filter, or a section of the page. */
  href: string;
};

export const CAPABILITIES: Capability[] = [
  {
    id: "websites",
    title: "Website Development",
    description: "Fast, search-ready business, corporate and landing-page websites built on Next.js.",
    points: ["Business & corporate sites", "Landing pages", "Multi-language content"],
    href: "/portfolio?category=corporate#projects",
  },
  {
    id: "ecommerce",
    title: "E-Commerce Solutions",
    description: "Online stores with UPI and card checkout, inventory, orders and WhatsApp updates.",
    points: ["Razorpay checkout", "Catalogue & inventory", "Order tracking"],
    href: "/portfolio?category=ecommerce#projects",
  },
  {
    id: "software",
    title: "Custom Software",
    description: "Web applications, admin dashboards, CRMs and business systems shaped around how you work.",
    points: ["Admin dashboards", "CRM & lead management", "Role-based portals"],
    href: "/portfolio?category=saas#projects",
  },
  {
    id: "design",
    title: "UI/UX Design",
    description: "Interfaces designed for your customers first: clear journeys, accessible, and good on every screen.",
    points: ["User journeys", "Design systems", "Mobile-first layouts"],
    href: "#showcase",
  },
  {
    id: "branding",
    title: "Branding & Creative",
    description: "Identity, visual language and launch creatives that make a business look as good as it is.",
    points: ["Logo & identity", "Brand guidelines", "Social creatives"],
    href: "/portfolio?category=fashion#projects",
  },
  {
    id: "marketing",
    title: "SEO & Digital Marketing",
    description: "Technical SEO, analytics and campaigns set up so you can see what brings customers in.",
    points: ["Technical SEO", "Google & Meta campaigns", "Local search"],
    href: "#growth",
  },
  {
    id: "automation",
    title: "Automation & Integrations",
    description: "Payments, WhatsApp, Google Sheets and third-party APIs connected so work moves on its own.",
    points: ["Payment gateways", "WhatsApp & SMS", "API integrations"],
    href: "#growth",
  },
];

/** Only what the team builds with today. */
export const TECH_STACK: { name: string; role: string }[] = [
  { name: "Next.js", role: "Web framework" },
  { name: "React", role: "Interfaces" },
  { name: "TypeScript", role: "Typed code" },
  { name: "Tailwind CSS", role: "Styling system" },
  { name: "Node.js", role: "Server runtime" },
  { name: "Supabase", role: "Auth & data" },
  { name: "PostgreSQL", role: "Database" },
  { name: "Razorpay", role: "Payments" },
  { name: "REST APIs", role: "Integrations" },
  { name: "Vercel", role: "Cloud hosting" },
  { name: "WhatsApp API", role: "Messaging" },
  { name: "Google Gemini", role: "AI automation" },
];

export const PROCESS: { step: string; title: string; text: string }[] = [
  { step: "01", title: "Discover", text: "Understand the business, the customers and what the project must achieve." },
  { step: "02", title: "Strategize", text: "Define scope, features, pages and the digital direction before design starts." },
  { step: "03", title: "Design", text: "Create the visual experience and the user journey, screen by screen." },
  { step: "04", title: "Develop", text: "Build, integrate payments, data and APIs, and review on real devices." },
  { step: "05", title: "Launch", text: "Test, optimise for speed and search, and deploy to production." },
  { step: "06", title: "Grow", text: "Maintain, improve and scale as the business and its customers grow." },
];

/** One-time technical setup, kept apart from ongoing services on purpose. */
export const SETUP_SERVICES: { title: string; text: string }[] = [
  { title: "Google Analytics", text: "Traffic and behaviour tracking with the events that matter." },
  { title: "Meta Pixel", text: "Pixel and conversion events for Facebook and Instagram ads." },
  { title: "Conversion tracking", text: "Enquiries, calls and purchases measured as goals." },
  { title: "WhatsApp integration", text: "Click-to-chat, order updates and enquiry routing." },
  { title: "Social media integration", text: "Profiles, feeds and share previews wired in." },
  { title: "Performance optimisation", text: "Image, font and code tuning for fast loading." },
];

export const ONGOING_SERVICES: { title: string; text: string }[] = [
  { title: "Website maintenance", text: "Updates, backups and content changes on a monthly plan." },
  { title: "Technical support", text: "A team to call when something needs fixing or adding." },
  { title: "SEO", text: "On-page improvements, local search and monthly reporting." },
  { title: "Digital marketing", text: "Google and Meta campaigns planned, run and reported." },
];

export const PORTFOLIO_WHATSAPP_MESSAGE =
  "Hi RNOS Digital, I would like to discuss a website / digital project for my business.";
