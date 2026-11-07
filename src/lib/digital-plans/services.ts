import type { DigitalAddon, DigitalPlan } from "./types";

/**
 * The RNOS Digital service catalogue. Each service names the plan features
 * and add-ons that deliver it, so "available in" is worked out from the live
 * packages rather than written down twice.
 */
export type DigitalService = {
  slug: string;
  name: string;
  description: string;
  category: "build" | "software" | "growth" | "care";
  featureKeys: string[];
  addonSlugs: string[];
};

export const SERVICE_CATEGORIES: { id: DigitalService["category"]; label: string; blurb: string }[] = [
  { id: "build", label: "Build", blurb: "Websites and stores that represent the business well." },
  { id: "software", label: "Software", blurb: "Applications, dashboards and integrations that run the business." },
  { id: "growth", label: "Grow", blurb: "Search, social and marketing that bring customers in." },
  { id: "care", label: "Look after", blurb: "Keeping everything secure, current and working." },
];

export const DIGITAL_SERVICES: DigitalService[] = [
  { slug: "website-development", name: "Website Development", description: "Business, corporate and landing-page websites, fast and responsive, built on Next.js.", category: "build", featureKeys: ["pages"], addonSlugs: ["additional-page"] },
  { slug: "ecommerce-development", name: "E-Commerce Development", description: "Online stores with catalogue, cart, Razorpay and COD, orders, coupons and shipping.", category: "build", featureKeys: ["ecommerce"], addonSlugs: ["additional-product-upload"] },
  { slug: "branding-graphic-design", name: "Branding & Graphic Design", description: "Logos, brand identity and social media creatives in a consistent visual language.", category: "build", featureKeys: ["social_creatives"], addonSlugs: ["logo-design"] },
  { slug: "custom-software", name: "Custom Software", description: "Software shaped around how your business actually works, not the other way round.", category: "software", featureKeys: ["custom_app"], addonSlugs: [] },
  { slug: "web-applications", name: "Web Applications", description: "Portals, booking systems and tools your customers or team use in the browser.", category: "software", featureKeys: ["custom_app"], addonSlugs: [] },
  { slug: "crm-admin-dashboards", name: "CRM & Admin Dashboards", description: "Enquiries, leads, customers and operations managed from one dashboard.", category: "software", featureKeys: ["crm", "admin_panel"], addonSlugs: [] },
  { slug: "api-integrations", name: "API Integrations", description: "Payments, shipping, accounting, messaging and other systems connected to yours.", category: "software", featureKeys: ["api_integrations"], addonSlugs: [] },
  { slug: "whatsapp-automation", name: "WhatsApp Automation", description: "Automated replies, enquiry routing and order updates over WhatsApp.", category: "software", featureKeys: ["whatsapp", "automation"], addonSlugs: ["whatsapp-automation"] },
  { slug: "seo", name: "SEO", description: "Technical, on-page and local search optimisation, measured in Search Console.", category: "growth", featureKeys: ["seo"], addonSlugs: ["advanced-seo-setup", "blog-management"] },
  { slug: "digital-marketing", name: "Digital Marketing", description: "Meta and Google campaigns planned, run and reported against your goals.", category: "growth", featureKeys: [], addonSlugs: ["meta-ads-management"] },
  { slug: "meta-integration", name: "Meta Integration", description: "Meta Pixel, conversion tracking and Facebook/Instagram connected to your website.", category: "growth", featureKeys: ["meta_pixel"], addonSlugs: ["meta-pixel-setup"] },
  { slug: "social-media-management", name: "Social Media Management", description: "Content calendars, creatives, posting and page management.", category: "growth", featureKeys: ["social_creatives"], addonSlugs: ["social-media-management"] },
  { slug: "website-maintenance", name: "Website Maintenance", description: "Security, backups, monitoring, updates and fixes, every month.", category: "care", featureKeys: ["maintenance"], addonSlugs: [] },
];

/** Which live plans include a service, and which live add-ons sell it on its own. */
export function serviceAvailability(service: DigitalService, plans: DigitalPlan[], addons: DigitalAddon[]) {
  return {
    plans: plans.filter((plan) => plan.features.some((feature) => service.featureKeys.includes(feature.key))),
    addons: addons.filter((addon) => service.addonSlugs.includes(addon.slug)),
  };
}
