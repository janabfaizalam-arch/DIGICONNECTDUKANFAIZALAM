import { DEFAULT_ITR_PRICING } from "@/lib/itr/defaults";

export type ItrComplexityTier = "basic" | "professional" | "business" | "capital_gains" | "complex";

export type ItrComplexityInput = {
  incomeSources?: string[];
  employerCount?: number;
  filingType?: string;
  hasHouseProperty?: boolean;
  hasBusiness?: boolean;
  hasCapitalGains?: boolean;
  hasFno?: boolean;
  hasIntraday?: boolean;
  hasCrypto?: boolean;
  hasForeignIncome?: boolean;
  hasForeignAssets?: boolean;
  multipleBusinesses?: boolean;
  noticeRelated?: boolean;
  auditLinked?: boolean;
};

export type ItrPricingRecommendation = {
  recommendedPlanKey: ItrComplexityTier;
  reasons: string[];
  startingPrice: number;
  isCustomQuote: boolean;
};

const PLAN_ORDER: ItrComplexityTier[] = ["basic", "professional", "business", "capital_gains", "complex"];

function planPrice(key: ItrComplexityTier) {
  const plan = DEFAULT_ITR_PRICING.find((p) => p.planKey === key);
  return plan?.price ?? 0;
}

export function classifyItrComplexity(input: ItrComplexityInput): ItrPricingRecommendation {
  const sources = new Set((input.incomeSources ?? []).map((s) => s.toLowerCase()));
  const reasons: string[] = [];
  let tier = "basic" as ItrComplexityTier;

  const bump = (next: ItrComplexityTier, reason: string) => {
    if (PLAN_ORDER.indexOf(next) > PLAN_ORDER.indexOf(tier)) {
      tier = next;
    }
    reasons.push(reason);
  };

  if ((input.employerCount ?? 0) > 1) bump("professional", "Multiple employers");
  if (input.hasHouseProperty || sources.has("house_property") || sources.has("rental")) {
    bump("professional", "House property / rental income");
  }
  if (input.hasBusiness || sources.has("business") || sources.has("profession") || sources.has("freelancing")) {
    bump("business", "Business / profession / freelancing income");
  }
  if (
    input.hasCapitalGains ||
    sources.has("shares") ||
    sources.has("mutual_funds") ||
    sources.has("property_cg")
  ) {
    bump("capital_gains", "Capital gains sources");
  }
  if (input.hasFno || sources.has("fno") || input.hasIntraday || sources.has("intraday")) {
    bump("complex", "F&O / intraday trading");
  }
  if (input.hasCrypto || sources.has("crypto")) bump("complex", "Crypto / VDA");
  if (input.hasForeignIncome || sources.has("foreign_income") || input.hasForeignAssets || sources.has("foreign_assets")) {
    bump("complex", "Foreign income / assets");
  }
  if (input.multipleBusinesses) bump("complex", "Multiple businesses");
  if (input.noticeRelated) bump("complex", "Notice-related work");
  if (input.auditLinked) bump("complex", "Audit-linked filing");
  if (String(input.filingType ?? "").toLowerCase() === "revised") bump("professional", "Revised return");

  if (!reasons.length) reasons.push("Simple filing profile");

  const startingPrice = planPrice(tier);
  return {
    recommendedPlanKey: tier,
    reasons,
    startingPrice,
    isCustomQuote: tier === "complex" || startingPrice === 0,
  };
}

/** Server-side: never trust client price; map selected plan to catalog starting price. */
export function resolveItrCatalogPrice(planKey: string | null | undefined, catalog = DEFAULT_ITR_PRICING): number {
  const key = String(planKey || "basic").toLowerCase();
  const plan = catalog.find((p) => p.planKey === key && p.isActive);
  if (!plan) return catalog.find((p) => p.planKey === "basic")?.price ?? 499;
  if (plan.price <= 0) return 0; // custom quote — payment blocked until admin sets amount
  return plan.price;
}

export function requiredItrDocuments(input: {
  incomeSources?: string[];
  profile?: string;
  documents?: Array<{
    documentKey: string;
    documentLabel: string;
    taxpayerProfiles: string[];
    incomeSources: string[];
    requiredDefault: boolean;
  }>;
}) {
  const sources = new Set((input.incomeSources ?? []).map((s) => s.toLowerCase()));
  const profile = String(input.profile ?? "").toLowerCase();
  const docs = input.documents ?? [];

  return docs.filter((doc) => {
    if (doc.requiredDefault) return true;
    if (doc.taxpayerProfiles.length && profile && doc.taxpayerProfiles.map((p) => p.toLowerCase()).includes(profile)) {
      return true;
    }
    if (doc.incomeSources.some((s) => sources.has(s.toLowerCase()))) return true;
    return false;
  });
}
