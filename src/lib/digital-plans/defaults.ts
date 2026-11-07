import type { AddonUnit, FeatureGroup, PlanFaq, PlanFeature, PlanLimit } from "./types";

/**
 * The packages as they ship.
 *
 * This is the seed, not the live price list. The database is the source of
 * truth once the migration has run and the admin panel edits it there; these
 * values are only (a) what the migration inserts on a fresh database, via
 * `scripts/generate-digital-plans-seed.mjs`, and (b) what the public pages
 * fall back to if the tables cannot be read at all, so the pricing page is
 * never blank. A contract test checks the migration still matches this file.
 *
 * Plain Node runs this file to generate the seed, so it imports types only.
 */

export type SeedPlan = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string;
  monthlyPricePaise: number;
  setupFeePaise: number;
  priceIsStarting: boolean;
  commitmentMonths: number;
  isRecommended: boolean;
  featuredOnHomepage: boolean;
  features: PlanFeature[];
  limits: PlanLimit[];
  exclusions: string[];
  maintenance: string;
  terms: string;
  faqs: PlanFaq[];
  addonSlugs: string[];
};

export type SeedAddon = {
  slug: string;
  name: string;
  description: string;
  pricePaise: number;
  unit: AddonUnit;
  priceIsStarting: boolean;
  note: string | null;
};

const rupees = (value: number) => value * 100;

function f(key: string, compareLabel: string, label: string, group: FeatureGroup, value: string | null = null, highlight = false): PlanFeature {
  return { key, compareLabel, label, group, value, highlight };
}

/* The essentials every plan carries, so a higher plan never reads as having
   less than a lower one in the comparison table. */
const ESSENTIALS = {
  responsive: f("responsive", "Responsive design", "Responsive design for mobile, tablet and desktop", "website"),
  contactForms: f("contact_forms", "Contact forms", "Contact forms", "website"),
  whatsapp: f("whatsapp", "WhatsApp integration", "WhatsApp chat integration", "growth"),
  ssl: f("ssl", "SSL configuration", "SSL configuration", "care"),
};

const STANDARD_TERMS =
  "The one-time setup fee is paid before work starts and is not refundable once work has begun. The monthly fee is billed in advance from the month the website goes live. Website-development plans carry a minimum commitment of 12 months; after it, the plan continues month to month until either side gives 30 days' written notice. Leaving within the minimum commitment means paying the remaining months of that commitment. GST is charged extra as applicable. The signed quotation is the final word on scope, price and term.";

export const DEFAULT_PLANS: SeedPlan[] = [
  {
    slug: "launch",
    name: "Launch",
    tagline: "A professional website to get your business online.",
    description:
      "A clean, fast business website of up to five pages, connected to WhatsApp and Google Maps, with basic SEO and the essential upkeep handled every month.",
    bestFor: "New and small businesses that need a credible online presence quickly.",
    monthlyPricePaise: rupees(999),
    setupFeePaise: rupees(2999),
    priceIsStarting: false,
    commitmentMonths: 12,
    isRecommended: false,
    featuredOnHomepage: true,
    features: [
      f("pages", "Website pages", "Up to 5-page business website", "website", "Up to 5", true),
      { ...ESSENTIALS.responsive, highlight: true },
      { ...ESSENTIALS.whatsapp, highlight: true },
      { ...ESSENTIALS.contactForms, highlight: true },
      f("google_maps", "Google Maps", "Google Maps location", "website"),
      f("seo", "SEO", "Basic SEO", "growth", "Basic", true),
      ESSENTIALS.ssl,
      f("backup", "Backups", "Monthly backup", "care", "Monthly"),
      f("maintenance", "Maintenance", "Basic maintenance", "care", "Basic"),
    ],
    limits: [
      { label: "Pages", value: "Up to 5" },
      { label: "Design", value: "Professionally designed layout, adapted to your brand" },
      { label: "Design revisions during setup", value: "2 rounds" },
      { label: "Monthly content updates", value: "Up to 2 minor text or image changes" },
    ],
    exclusions: [
      "Admin panel or content management system",
      "Meta Pixel and Google Analytics setup (available as add-ons)",
      "Online payments or e-commerce",
      "Social media creatives",
      "Domain and hosting charges, where separate",
    ],
    maintenance:
      "Security and SSL checks, a monthly backup, uptime monitoring and up to two minor content changes a month. New pages or new features are quoted separately.",
    terms: STANDARD_TERMS,
    faqs: [
      { question: "Can I move up to a bigger plan later?", answer: "Yes. You pay the difference in setup work, if any, and the new monthly fee from the next billing month." },
      { question: "Do I need to provide the content?", answer: "You provide your business details, photos and the text you want to say. We shape it into pages and can suggest wording." },
    ],
    addonSlugs: ["additional-page", "logo-design", "meta-pixel-setup", "google-analytics-setup", "advanced-seo-setup", "social-media-management"],
  },
  {
    slug: "business-plus",
    name: "Business Plus",
    tagline: "A custom-designed website you can manage yourself.",
    description:
      "Up to ten custom-designed pages with a basic admin panel for enquiries, plus Meta Pixel, Google Analytics, on-page SEO and social profile integration.",
    bestFor: "Established businesses that want a distinctive website and to start measuring results.",
    monthlyPricePaise: rupees(1999),
    setupFeePaise: rupees(4999),
    priceIsStarting: false,
    commitmentMonths: 12,
    isRecommended: false,
    featuredOnHomepage: false,
    features: [
      f("pages", "Website pages", "Up to 10-page website", "website", "Up to 10", true),
      ESSENTIALS.responsive,
      f("custom_ui", "Custom UI/UX design", "Custom UI/UX design", "website", null, true),
      f("google_maps", "Google Maps", "Google Maps location", "website"),
      ESSENTIALS.contactForms,
      f("admin_panel", "Admin panel", "Basic admin panel", "platform", "Basic", true),
      f("enquiry_management", "Enquiry / lead management", "Enquiry management", "platform", "Enquiries", true),
      ESSENTIALS.whatsapp,
      f("meta_pixel", "Meta Pixel & conversions", "Meta Pixel integration", "growth", "Pixel"),
      f("analytics", "Analytics", "Google Analytics", "growth", "Google Analytics"),
      f("seo", "SEO", "On-page SEO", "growth", "On-page", true),
      f("social_profiles", "Social media integration", "Social media profile integration", "growth"),
      ESSENTIALS.ssl,
      f("backup", "Backups", "Monthly backup", "care", "Monthly"),
      f("maintenance", "Maintenance", "Monthly maintenance", "care", "Monthly"),
    ],
    limits: [
      { label: "Pages", value: "Up to 10" },
      { label: "Design revisions during setup", value: "3 rounds" },
      { label: "Admin panel", value: "Manage enquiries and basic page content" },
      { label: "Monthly content updates", value: "Up to 4 minor text or image changes" },
    ],
    exclusions: [
      "Blog or dynamic CMS",
      "Social media creatives",
      "Paid advertising management and ad budget",
      "Online payments or e-commerce",
      "Domain and hosting charges, where separate",
    ],
    maintenance:
      "Monthly security updates, backups, uptime monitoring, analytics checks and up to four minor content changes a month.",
    terms: STANDARD_TERMS,
    faqs: [
      { question: "What can I change from the admin panel?", answer: "You can view and manage enquiries and update the basic content blocks we set up for you. Layout changes are done by our team." },
      { question: "Is Meta Pixel the same as running ads?", answer: "No. The Pixel measures visits and enquiries for your Facebook and Instagram ads. Running ads is a separate add-on, and the ad budget is paid by you." },
    ],
    addonSlugs: ["additional-page", "logo-design", "advanced-seo-setup", "blog-management", "social-media-management", "meta-ads-management", "whatsapp-automation"],
  },
  {
    slug: "growth-pro",
    name: "Growth Pro",
    tagline: "A website that brings in leads, and the tools to follow them up.",
    description:
      "Up to twenty pages with an advanced admin dashboard, a dynamic CMS and blog, lead management, advanced SEO, conversion tracking and up to eight social media creatives every month.",
    bestFor: "Growing businesses that rely on the website for enquiries and want SEO and social media looked after.",
    monthlyPricePaise: rupees(3999),
    setupFeePaise: rupees(9999),
    priceIsStarting: false,
    commitmentMonths: 12,
    isRecommended: true,
    featuredOnHomepage: true,
    features: [
      f("pages", "Website pages", "Up to 20-page website", "website", "Up to 20", true),
      ESSENTIALS.responsive,
      f("custom_ui", "Custom UI/UX design", "Custom UI/UX design", "website"),
      f("google_maps", "Google Maps", "Google Maps location", "website"),
      ESSENTIALS.contactForms,
      f("admin_panel", "Admin panel", "Advanced admin dashboard", "platform", "Advanced", true),
      f("cms_blog", "Dynamic CMS & blog", "Dynamic CMS and blog", "platform", null, true),
      f("enquiry_management", "Enquiry / lead management", "Lead management", "platform", "Leads", true),
      ESSENTIALS.whatsapp,
      f("meta_pixel", "Meta Pixel & conversions", "Meta Pixel and supported conversion tracking", "growth", "Pixel + conversions"),
      f("analytics", "Analytics", "Google Analytics and Search Console", "growth", "GA + Search Console"),
      f("seo", "SEO", "Advanced SEO", "growth", "Advanced", true),
      f("social_profiles", "Social media integration", "Social media profile integration", "growth"),
      f("social_creatives", "Social media creatives", "Up to 8 social media creatives/month", "growth", "Up to 8 / month", true),
      ESSENTIALS.ssl,
      f("backup", "Backups", "Regular backups", "care", "Included"),
      f("maintenance", "Maintenance", "Technical maintenance and backups", "care", "Technical"),
    ],
    limits: [
      { label: "Pages", value: "Up to 20" },
      { label: "Social media creatives", value: "Up to 8 per month, not carried over" },
      { label: "Design revisions during setup", value: "3 rounds" },
      { label: "Blog", value: "CMS and blog set up; writing articles is the Blog management add-on" },
    ],
    exclusions: [
      "Writing blog articles (Blog management add-on)",
      "Posting and community management (Social media management add-on)",
      "Paid advertising management and ad budget",
      "Online payments or e-commerce",
      "Domain, hosting and third-party tool subscriptions, where separate",
    ],
    maintenance:
      "Technical maintenance, regular backups, security and performance monitoring, SEO health checks and fixes, and help with content updates through the dashboard.",
    terms: STANDARD_TERMS,
    faqs: [
      { question: "Why is Growth Pro recommended?", answer: "For most businesses that want enquiries from their website, it is the smallest plan that includes lead management, advanced SEO and regular social media creatives together. If you only need a presence online, Launch or Business Plus may suit you better." },
      { question: "Do the 8 creatives include posting them?", answer: "The creatives are designed and delivered to you. Scheduling, posting and replying are part of the Social media management add-on." },
    ],
    addonSlugs: ["additional-page", "blog-management", "social-media-management", "meta-ads-management", "whatsapp-automation"],
  },
  {
    slug: "commerce-pro",
    name: "Commerce Pro",
    tagline: "A complete online store, set up and looked after.",
    description:
      "An e-commerce website with up to 100 initial products, inventory, cart and checkout, Razorpay and COD, orders, coupons, shipping integration, sales analytics and product SEO.",
    bestFor: "Businesses that want to sell products online with their own store.",
    monthlyPricePaise: rupees(7999),
    setupFeePaise: rupees(14999),
    priceIsStarting: false,
    commitmentMonths: 12,
    isRecommended: false,
    featuredOnHomepage: false,
    features: [
      f("pages", "Website pages", "Store with product, policy and information pages", "website", "Store pages", false),
      ESSENTIALS.responsive,
      f("custom_ui", "Custom UI/UX design", "Custom storefront design", "website"),
      ESSENTIALS.contactForms,
      f("ecommerce", "E-commerce store", "E-commerce website", "commerce", null, true),
      f("products", "Products included", "Up to 100 initial products", "commerce", "Up to 100 initial", true),
      f("product_management", "Product management", "Product management", "commerce"),
      f("inventory", "Inventory management", "Inventory management", "commerce"),
      f("cart_checkout", "Cart & checkout", "Shopping cart and checkout", "commerce", null, true),
      f("razorpay", "Razorpay payments", "Razorpay payment integration", "commerce", null, true),
      f("cod", "Cash on delivery", "COD configuration", "commerce"),
      f("orders", "Order management", "Order management", "commerce", null, true),
      f("coupons", "Coupons & discounts", "Coupons and discounts", "commerce"),
      f("shipping", "Shipping integration", "Shipping integration", "commerce"),
      f("sales_analytics", "Sales analytics", "Sales analytics", "commerce"),
      f("admin_panel", "Admin panel", "Store admin dashboard", "platform", "Store admin"),
      ESSENTIALS.whatsapp,
      f("seo", "SEO", "Product SEO", "growth", "Product SEO", true),
      ESSENTIALS.ssl,
      f("backup", "Backups", "Regular backups", "care", "Included"),
      f("maintenance", "Maintenance", "Technical maintenance", "care", "Technical"),
    ],
    limits: [
      { label: "Products at launch", value: "Up to 100 uploaded by us; more at ₹30 per product" },
      { label: "Payment gateway", value: "Razorpay account in your business name; gateway fees are charged by Razorpay" },
      { label: "Shipping", value: "Integration with one supported shipping partner; courier charges are separate" },
      { label: "Design revisions during setup", value: "3 rounds" },
    ],
    exclusions: [
      "Payment gateway transaction fees",
      "Shipping and courier charges",
      "Product photography and writing product descriptions",
      "Paid advertising management and ad budget",
      "Domain, hosting and third-party app subscriptions, where separate",
    ],
    maintenance:
      "Technical maintenance of the store, security and performance monitoring, backups, and fixing faults in checkout, payments or order flow. Bulk product uploads after launch are charged per product.",
    terms: STANDARD_TERMS,
    faqs: [
      { question: "Who owns the Razorpay account?", answer: "You do. The account is opened in your business name and payments settle to your bank. We integrate it with the store." },
      { question: "Can I add more than 100 products?", answer: "Yes. You can add products yourself from the admin panel at no charge, or have us upload them at ₹30 per product." },
    ],
    addonSlugs: ["additional-product-upload", "meta-pixel-setup", "google-analytics-setup", "social-media-management", "meta-ads-management", "whatsapp-automation"],
  },
  {
    slug: "enterprise-360",
    name: "Enterprise 360",
    tagline: "Custom software, automation and growth, run as one programme.",
    description:
      "A fully customised website or web application with a custom admin dashboard, CRM and workflows, API integrations, automation, managed SEO and digital growth, dedicated support and monthly reporting.",
    bestFor: "Businesses with their own processes to digitise, or several services to run together.",
    monthlyPricePaise: rupees(14999),
    setupFeePaise: rupees(29999),
    priceIsStarting: true,
    commitmentMonths: 12,
    isRecommended: false,
    featuredOnHomepage: true,
    features: [
      f("custom_app", "Custom web application", "Fully customised website or web application", "platform", "Fully custom", true),
      f("pages", "Website pages", "Pages and screens as agreed in scope", "website", "As scoped"),
      ESSENTIALS.responsive,
      f("custom_ui", "Custom UI/UX design", "Custom UI/UX design", "website"),
      ESSENTIALS.contactForms,
      f("admin_panel", "Admin panel", "Custom admin dashboard", "platform", "Custom", true),
      f("crm", "CRM & business workflows", "CRM and business workflows", "platform", null, true),
      f("enquiry_management", "Enquiry / lead management", "Lead and customer management", "platform", "CRM"),
      f("api_integrations", "API integrations", "API integrations", "platform", null, true),
      f("automation", "Automation", "Advanced automation", "platform", "Advanced"),
      ESSENTIALS.whatsapp,
      f("seo", "SEO", "SEO and digital growth management", "growth", "Managed growth", true),
      f("analytics", "Analytics", "Advanced analytics", "growth", "Advanced"),
      f("social_creatives", "Social media creatives", "Up to 12 agreed social media creatives/month", "growth", "Up to 12 / month"),
      ESSENTIALS.ssl,
      f("backup", "Backups", "Regular backups", "care", "Included"),
      f("maintenance", "Maintenance", "Technical maintenance", "care", "Technical"),
      f("dedicated_support", "Dedicated support", "Dedicated support allocation", "care", null, true),
      f("performance_report", "Monthly performance report", "Monthly performance report", "care"),
      f("dev_hours", "Custom development hours", "Custom development hours as per agreement", "platform", "As agreed"),
    ],
    limits: [
      { label: "Scope", value: "Set out in a written scope and quotation before work starts" },
      { label: "Development hours", value: "A monthly allocation agreed in the quotation; extra hours quoted separately" },
      { label: "Social media creatives", value: "Up to 12 per month, as agreed" },
      { label: "Price", value: "From ₹14,999 a month and ₹29,999 setup; the quotation sets the final figure" },
    ],
    exclusions: [
      "Work outside the agreed scope (quoted separately)",
      "Paid advertising budget",
      "Third-party software, API and SMS/WhatsApp provider charges",
      "Domain, hosting and cloud infrastructure charges, where separate",
    ],
    maintenance:
      "Technical maintenance of the application and integrations, monitoring, backups, security updates and a monthly performance report, with a named support allocation for your account.",
    terms: STANDARD_TERMS,
    faqs: [
      { question: "Why is the price shown as \"onwards\"?", answer: "Enterprise work is scoped to your processes. The figures shown are where it starts; your quotation sets the final monthly and setup price before anything is agreed." },
      { question: "Can you integrate our existing software?", answer: "Usually, if it offers an API or export. We confirm what is possible during discovery, before the quotation." },
    ],
    addonSlugs: ["meta-ads-management", "social-media-management", "whatsapp-automation", "additional-product-upload"],
  },
];

export const DEFAULT_ADDONS: SeedAddon[] = [
  { slug: "additional-page", name: "Additional website page", description: "One more designed page on your website.", pricePaise: rupees(999), unit: "per_page", priceIsStarting: false, note: null },
  { slug: "logo-design", name: "Logo design", description: "A logo with colour and mono versions for web and print.", pricePaise: rupees(1999), unit: "one_time", priceIsStarting: true, note: null },
  { slug: "meta-pixel-setup", name: "Meta Pixel setup", description: "Pixel installed and standard events configured for your ads.", pricePaise: rupees(1499), unit: "one_time", priceIsStarting: false, note: null },
  { slug: "google-analytics-setup", name: "Google Analytics setup", description: "Google Analytics 4 installed with key conversions configured.", pricePaise: rupees(999), unit: "one_time", priceIsStarting: false, note: null },
  { slug: "advanced-seo-setup", name: "Advanced SEO setup", description: "Keyword research, technical fixes, schema and on-page optimisation.", pricePaise: rupees(4999), unit: "one_time", priceIsStarting: true, note: null },
  { slug: "blog-management", name: "Blog management", description: "Blog articles planned, written and published on your website.", pricePaise: rupees(1499), unit: "monthly", priceIsStarting: false, note: "Number of articles as agreed in the quotation." },
  { slug: "social-media-management", name: "Social media management", description: "Content calendar, posting and page management.", pricePaise: rupees(4999), unit: "monthly", priceIsStarting: false, note: null },
  { slug: "meta-ads-management", name: "Meta Ads management", description: "Facebook and Instagram campaigns planned, run and reported.", pricePaise: rupees(3999), unit: "monthly", priceIsStarting: false, note: "Ad budget is separate and paid by you directly to Meta." },
  { slug: "whatsapp-automation", name: "WhatsApp automation", description: "Automated replies, order or enquiry updates over WhatsApp.", pricePaise: rupees(2999), unit: "one_time", priceIsStarting: true, note: "WhatsApp Business API provider charges are separate." },
  { slug: "additional-product-upload", name: "Additional product upload", description: "We add a product with its images, price and details to your store.", pricePaise: 3000, unit: "per_product", priceIsStarting: false, note: null },
];
