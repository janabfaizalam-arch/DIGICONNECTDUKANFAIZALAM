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
  // These were live in the catalogue with no synonym row at all, which meant a
  // customer typing the only word they know for them — "aadhar", "ration",
  // "fssai" — got nothing back.
  "pan-card": ["pan", "pan card", "pancard", "permanent account number", "new pan", "pan correction"],
  "aadhaar-services": ["aadhaar", "aadhar", "adhar", "aadhaar card", "aadhar card", "uidai", "aadhaar update", "aadhar correction"],
  "ayushman-card": ["ayushman", "ayushman card", "ayushman bharat", "golden card", "health card", "pmjay"],
  "food-license": ["fssai", "food license", "food licence", "food registration", "restaurant license", "hotel license", "khana license"],
  "eshram-card": ["eshram", "e shram", "shram card", "labor card", "uan", "labour card"],
  "caste-certificate": ["caste", "caste certificate", "jati praman patra", "sc st obc certificate"],
  "income-certificate": ["income certificate", "aay praman patra", "income praman"],
  "domicile-certificate": ["domicile", "domicile certificate", "nivas praman patra", "residence certificate"],
  "csc-olympiad": ["olympiad", "csc olympiad", "student exam", "school olympiad"],
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
 * Words that carry no intent, so they must not be allowed to match anything.
 *
 * Without this, "gst registration ke liye apply karna hai" scores every service
 * whose description happens to contain "apply" as highly as the one the person
 * actually asked for.
 */
const STOPWORDS = new Set([
  // English
  "a", "an", "and", "for", "from", "how", "i", "in", "is", "me", "my", "need",
  "of", "on", "online", "or", "please", "the", "to", "want", "what", "with",
  // Hinglish
  "aur", "chahiye", "hai", "ka", "kaise", "karna", "karwana", "ke", "ki", "ko",
  "kya", "liye", "mein", "mujhe", "par", "se",
]);

/** Query terms split into scoreable tokens. */
function tokenize(normalized: string): string[] {
  const words = normalized.split(/\s+/).filter(Boolean);
  const meaningful = words.filter((w) => !STOPWORDS.has(w));
  // A query that is nothing but stopwords ("kaise karna hai") still deserves a
  // try rather than an empty result, so fall back to the raw words.
  return meaningful.length ? meaningful : words;
}

/** The initials of a multi-word title — "Detailed Project Report" → "dpr". */
function initialsOf(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  return words.length >= 2 ? words.map((w) => w[0]).join("") : "";
}

/**
 * How well one query token matches one candidate word, 0 when it does not.
 *
 * The edit-distance thresholds scale with token length on purpose. Forgiving
 * one edit in a four-letter word makes "card" match "cars", "cart" and "care";
 * forgiving one edit in "licence" is the difference between finding the driving
 * licence and not. Long tokens are where typo tolerance pays for itself.
 */
function tokenScore(token: string, word: string): number {
  if (!token || !word) return 0;
  if (token === word) return 30;
  if (token.length >= 3 && word.startsWith(token)) return 22;
  if (token.length >= 4) {
    const distance = levenshtein(token, word);
    if (distance === 1) return 14;
    if (distance === 2 && token.length >= 7) return 7;
  }
  return 0;
}

export type RankOptions = {
  /** Maximum results to return. */
  limit?: number;
  /**
   * Drop results scoring below this fraction of the best result. A long tail of
   * weak matches is worse than a short list: it buries the right answer and
   * teaches people the search does not work.
   */
  minScoreRatio?: number;
};

/**
 * Rank the catalog against a query, best match first.
 *
 * Scoring has two halves. The *phrase* half rewards the whole query matching a
 * title or a synonym, and is what makes "dl" and "pasport" land instantly. The
 * *token* half scores each meaningful word of the query against the best word
 * it can find in the service, then scales the total by how much of the query
 * was covered.
 *
 * That coverage term is the important part, and it exists because of a real
 * failure: typing "driving licence" used to return **Food License** alongside
 * the driving licence, because "licence" is one edit from "license" and a
 * single fuzzy word was enough to qualify a service on its own. Squaring
 * coverage means a service that answers half the query scores a quarter, not a
 * half — enough to keep genuinely partial matches alive while pushing
 * accidental single-word collisions below the relevance floor.
 */
export function rankServices(
  catalog: SearchCatalogItem[],
  rawQuery: string,
  options: RankOptions = {},
): SearchCatalogItem[] {
  const { limit, minScoreRatio = 0.22 } = options;

  const q = normalizeQuery(rawQuery);
  if (!q) return [];

  const tokens = tokenize(q);

  const scored = catalog
    .map((service) => {
      const title = service.title.toLowerCase();
      const desc = (service.shortDescription || "").toLowerCase();
      const category = (service.category || "").toLowerCase();
      const synonyms = (SERVICE_SYNONYMS[service.slug] ?? []).map((s) => s.toLowerCase());

      // ── Phrase half — the whole query against the whole field ──────────
      let phrase = 0;

      if (title === q) phrase += 100;
      else if (title.startsWith(q)) phrase += 80;
      else if (title.includes(q)) phrase += 50;

      if (desc.includes(q)) phrase += 15;
      if (category.includes(q)) phrase += 10;

      for (const syn of synonyms) {
        if (syn === q) phrase += 95;
        else if (syn.includes(q)) phrase += 40;
        else if (q.includes(syn)) phrase += 30;
      }

      // An acronym typed for a multi-word title, without needing a synonym row.
      if (q.length >= 2 && q === initialsOf(title)) phrase += 90;

      // ── Token half — each query word against its best candidate ────────
      const candidates = [
        ...title.split(/\s+/),
        ...category.split(/\s+/),
        ...synonyms.flatMap((syn) => syn.split(/\s+/)),
      ].filter((w) => w.length > 1);

      let tokenTotal = 0;
      let matched = 0;

      for (const token of tokens) {
        let best = 0;
        for (const candidate of candidates) {
          const value = tokenScore(token, candidate);
          if (value > best) best = value;
        }
        // A word appearing only in the description is weak evidence, but it is
        // evidence — enough to break a tie, not enough to qualify alone.
        if (best === 0 && token.length >= 4 && desc.includes(token)) best = 5;

        if (best > 0) {
          tokenTotal += best;
          matched += 1;
        }
      }

      const coverage = tokens.length ? matched / tokens.length : 0;
      const score = phrase + tokenTotal * coverage * coverage;

      return { service, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return [];

  const floor = scored[0].score * minScoreRatio;
  const relevant = scored.filter((entry) => entry.score >= floor).map((entry) => entry.service);

  return typeof limit === "number" ? relevant.slice(0, limit) : relevant;
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
