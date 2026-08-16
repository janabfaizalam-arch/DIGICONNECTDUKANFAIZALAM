/**
 * Shared service-search core.
 *
 * The homepage hero and the Smart Search Hub both let a customer type "gst",
 * "pasport" or "gaadi ka insurance" and land on the right service page. That
 * matching used to live inside the Smart Search Hub component, so a second
 * search box could only be built by copying the synonym table and the scoring
 * with it. Both now import from here, and there is exactly one definition of
 * what a query means.
 *
 * Everything in this module is pure and framework-free so it can be unit
 * tested and used from a server component as easily as from the browser.
 */

import { servicesData } from "@/lib/services-data";

export type SearchCatalogItem = {
  slug: string;
  title: string;
  shortDescription: string;
  priceLabel: string;
  category: string;
  amount: number;
};

/**
 * Query terms customers actually type, mapped to the service they mean.
 *
 * Abbreviations ("dl", "cc"), Hindi and Hinglish ("gaadi", "khata",
 * "majdoor"), and the misspellings we see most often ("pasport", "gstr").
 */
export const SERVICE_SYNONYMS: Record<string, string[]> = {
  "gst-registration": ["gst", "g s t", "gst reg", "gstr", "gst registration", "register gst", "gst regisration", "tax", "bahi", "khata", "vyapar"],
  "gst-return-filing": ["gst filing", "gstr", "gstr1", "gstr3b", "gst returns", "return filing", "gstr file"],
  "itr-filing": ["itr", "i t r", "tax", "income tax", "tax return", "tax filing", "return filing", "itr filing", "income tax return", "audit"],
  passport: ["passport", "pass port", "pass-port", "pp", "p.p.", "visa", "abroad", "travel", "passprt", "pasport"],
  "learning-driving-license": ["driving licence", "driving license", "dl", "d l", "license", "licence", "rto", "vehicle driving", "learner", "chalan", "gaadi", "rto exam"],
  "pvc-card": ["pvc", "pvc card", "smart card", "plastic card", "print card", "identity card print", "plastic printing", "smart print"],
  "voter-id": ["voter", "voter id", "voter card", "epic", "election card", "vote card", "pehchan patra"],
  "eshram-card": ["eshram", "e shram", "shram card", "labor card", "uan", "labour card"],
  "labour-card": ["labour", "labor", "labour card", "labor card", "shramik", "majdoor", "majdoor card"],
  "pmegp-loan": ["pmegp", "subsidy loan", "business loan", "government loan", "pmegp loan", "loan"],
  "mudra-loan": ["mudra", "mudra loan", "business loan", "micro loan", "bank loan", "loan"],
  "pm-vishwakarma-yojana": ["vishwakarma", "pm vishwakarma", "artisan", "scheme", "carpenter", "craftsman", "skill training", "vishkarma"],
  "startup-india-assistance": ["startup", "startup india", "dpiit", "pitch deck", "funding", "business register"],
  "cm-yuva-entrepreneur-loan-assistance": ["cm yuva", "yuva loan", "yuva", "entrepreneur loan", "up loan", "chief minister loan"],
  "credit-cards": ["credit card", "credit cards", "cc", "bank card", "apply card", "card apply"],
  "saving-account-opening": ["savings account", "saving account", "zero balance", "bank account", "account opening", "khata", "open account"],
  "current-account-opening": ["current account", "business account", "firm account", "current bank account", "firm khata"],
  "cibil-report-increase": ["cibil", "cibil score", "credit score", "credit repair", "credit report", "cibil check", "cibil status", "finance", "cibil report increase", "credit health", "repair score"],
  dsc: ["dsc", "digital signature", "class 3", "signature token"],
  "msme-registration": ["msme", "udyam", "udyam registration", "msme registration", "udyam certificate"],
  "iso-certification": ["iso", "iso certificate", "iso certification", "quality standards"],
  insurance: ["insurance", "vehicle insurance", "bike insurance", "car insurance", "truck insurance", "renew policy", "third party insurance", "bima", "gaadi insurance"],
  "private-limited-registration": ["private limited", "pvt ltd", "company registration", "incorporation"],
  "opc-registration": ["opc", "one person company", "opc registration"],
  "private-limited-compliance": ["compliance", "roc compliance", "dir 3 kyc", "annual compliance"],
  "detailed-project-report": ["dpr", "project report", "detailed project report", "bank project report", "pmegp report", "loan project report", "prozect report"],
};

/** Edit distance, used only for short strings (a query word against a title word). */
export function levenshtein(a: string, b: string): number {
  const tmp: number[][] = [];
  for (let i = 0; i <= a.length; i++) tmp.push([i]);
  for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return tmp[a.length][b.length];
}

/**
 * Strip punctuation but keep Devanagari, so a query typed in Hindi still
 * reaches the synonym table.
 */
export function normalizeQuery(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9\sऀ-ॿ]/g, "").trim();
}

/** The whole catalog, for callers that have no server-loaded list to pass. */
export function fallbackCatalog(): SearchCatalogItem[] {
  return servicesData.map((service) => ({
    slug: service.slug,
    title: service.title,
    shortDescription: service.shortDescription,
    priceLabel: service.priceLabel,
    category: service.category,
    amount: service.amount,
  }));
}

/**
 * Rank the catalog against a query, best match first.
 *
 * Exact title beats a title prefix, which beats a title substring; a synonym
 * hit scores near an exact title so "dl" still finds the driving licence, and
 * a one-character typo in a long word is forgiven rather than dropped.
 */
export function rankServices(catalog: SearchCatalogItem[], rawQuery: string): SearchCatalogItem[] {
  const q = normalizeQuery(rawQuery);
  if (!q) return [];

  return catalog
    .map((service) => {
      let score = 0;
      const title = service.title.toLowerCase();
      const desc = (service.shortDescription || "").toLowerCase();
      const category = (service.category || "").toLowerCase();

      if (title === q) score += 100;
      else if (title.startsWith(q)) score += 80;
      else if (title.includes(q)) score += 50;

      if (desc.includes(q)) score += 15;
      if (category.includes(q)) score += 10;

      for (const synonym of SERVICE_SYNONYMS[service.slug] ?? []) {
        const syn = synonym.toLowerCase();
        if (syn === q) score += 95;
        else if (syn.includes(q)) score += 40;
        else if (q.includes(syn)) score += 30;
      }

      const queryWords = q.split(/\s+/);
      const titleWords = title.split(/\s+/);
      for (const qw of queryWords) {
        for (const tw of titleWords) {
          const distance = levenshtein(qw, tw);
          if (distance === 1 && qw.length > 3) score += 35;
          else if (distance === 2 && qw.length > 5) score += 15;
        }
      }

      return { service, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.service);
}

/**
 * "Did you mean …" for a query that matched nothing. Returns null rather than
 * a wild guess: showing a wrong correction is worse than showing none.
 */
export function suggestSpelling(rawQuery: string): string | null {
  const q = normalizeQuery(rawQuery);
  if (q.length <= 2) return null;

  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const synonym of Object.values(SERVICE_SYNONYMS).flat()) {
    const distance = levenshtein(q, synonym.toLowerCase());
    if (distance < bestDistance && distance <= 2) {
      bestDistance = distance;
      best = synonym;
    }
  }

  if (!best) return null;
  return best
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Canonical destination for a service. One definition, so no link can drift. */
export function serviceHref(slug: string): string {
  return `/services/${slug}`;
}

/** Where a query with no confident single match should land. */
export function serviceSearchHref(query: string): string {
  const trimmed = query.trim();
  return trimmed ? `/services?q=${encodeURIComponent(trimmed)}` : "/services";
}
