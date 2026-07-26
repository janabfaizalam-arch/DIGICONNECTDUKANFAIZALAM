import type { ItrSectionKey } from "@/lib/itr/constants";

export type ItrPageSettings = {
  serviceName: string;
  shortName: string;
  assessmentYear: string;
  filingOpenNotice: string | null;
  startingPrice: number;
  heroHeading: string | null;
  heroDescription: string | null;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  supportCtaLabel: string | null;
  supportCtaUrl: string | null;
  estimatedTurnaround: string | null;
  stickyCtaEnabled: boolean;
  stickyCtaLabel: string;
  stickyCtaUrl: string;
  videoUrl: string | null;
  whatsappNumber: string;
  supportPhone: string;
  defaultPlanId: string;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  twitterImageUrl: string | null;
  robotsIndex: boolean;
  pricingDisclaimer: string | null;
  finalQuoteDisclaimer: string | null;
  taxLiabilityDisclaimer: string | null;
  refundDisclaimer: string | null;
  customerDeclaration: string | null;
};

export type ItrSection = {
  id?: string;
  sectionKey: ItrSectionKey | string;
  enabled: boolean;
  sortOrder: number;
  heading: string | null;
  subheading: string | null;
  description: string | null;
  content: Record<string, unknown>;
  layoutStyle: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  animationType: string | null;
};

export type ItrBanner = {
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
  badgeText: string | null;
  textAlignment: string | null;
  overlayStrength: number;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type ItrPricingPlan = {
  id?: string;
  planKey: string;
  name: string;
  price: number;
  oldPrice: number | null;
  description: string | null;
  features: string[];
  eligibleProfiles: string[];
  complexityNotes: string | null;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  ctaLabel: string | null;
};

export type ItrFaq = {
  id?: string;
  question: string;
  answer: string;
  isActive: boolean;
  sortOrder: number;
};

export type ItrReview = {
  id?: string;
  name: string;
  location: string | null;
  profileImageUrl: string | null;
  rating: number;
  text: string;
  filingCategory: string | null;
  isVerified: boolean;
  isDemo: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type ItrComparisonRow = {
  id?: string;
  feature: string;
  formCode: string | null;
  typicalTaxpayer: string | null;
  commonSources: string | null;
  commonExclusions: string | null;
  complexity: string | null;
  suggestedPackage: string | null;
  digiconnect: string | null;
  selfFiling: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type ItrRelatedService = {
  id?: string;
  serviceSlug: string;
  title: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type ItrDocumentItem = {
  id?: string;
  categoryKey: string;
  categoryLabel: string;
  documentKey: string;
  documentLabel: string;
  taxpayerProfiles: string[];
  incomeSources: string[];
  requiredDefault: boolean;
  helpText: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type ItrCmsPayload = {
  settings: ItrPageSettings;
  sections: ItrSection[];
  banners: ItrBanner[];
  pricing: ItrPricingPlan[];
  faqs: ItrFaq[];
  reviews: ItrReview[];
  comparison: ItrComparisonRow[];
  related: ItrRelatedService[];
  documents: ItrDocumentItem[];
};
