import type { DprSectionKey } from "@/lib/dpr/constants";

export type DprPageSettings = {
  stickyCtaEnabled: boolean;
  stickyCtaLabel: string;
  stickyCtaUrl: string;
  videoUrl: string | null;
  whatsappNumber: string;
  supportPhone: string;
  defaultPlanId: string;
  metaTitle: string | null;
  metaDescription: string | null;
};

export type DprSection = {
  id?: string;
  sectionKey: DprSectionKey | string;
  enabled: boolean;
  sortOrder: number;
  heading: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  animationType: string | null;
};

export type DprBanner = {
  id: string;
  sectionKey: string;
  title: string | null;
  description: string | null;
  altText: string | null;
  imageUrl: string;
  imagePath: string | null;
  mobileImageUrl: string | null;
  mobileImagePath: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type DprPricingPlan = {
  id?: string;
  planKey: string;
  name: string;
  price: number;
  oldPrice: number | null;
  description: string | null;
  features: string[];
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  ctaLabel: string | null;
};

export type DprFaq = {
  id?: string;
  question: string;
  answer: string;
  isActive: boolean;
  sortOrder: number;
};

export type DprReview = {
  id?: string;
  name: string;
  location: string | null;
  rating: number;
  text: string;
  isActive: boolean;
  sortOrder: number;
};

export type DprComparisonRow = {
  id?: string;
  feature: string;
  digiconnect: string;
  others: string;
  isActive: boolean;
  sortOrder: number;
};

export type DprRelatedService = {
  id?: string;
  serviceSlug: string;
  title: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

/**
 * One published blog article, reduced to what the landing page renders.
 *
 * The DPR page links to the site's own `/blog`, so this is a projection of a
 * real `articles` row rather than a second copy of the content.
 */
export type DprArticleCard = {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  imageUrl: string | null;
};

export type DprCmsPayload = {
  settings: DprPageSettings;
  sections: DprSection[];
  banners: DprBanner[];
  pricing: DprPricingPlan[];
  faqs: DprFaq[];
  reviews: DprReview[];
  comparison: DprComparisonRow[];
  related: DprRelatedService[];
};
