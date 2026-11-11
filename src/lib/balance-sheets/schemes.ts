import type { ProjectionAssumptions, SchemeArea, SchemeCategory, SchemeId, SchemeSector } from "@/lib/balance-sheets/engine";

/**
 * Government loan schemes the balance sheet form has presets for.
 *
 * These are DEFAULTS, not law. Scheme terms are revised by government order
 * and banks apply them with their own circulars, and published summaries do
 * not always agree (CM-YUVA's own-contribution rate and MYSY's margin money
 * cap differ between sources). So every figure a preset puts in the form is
 * an ordinary editable box, the form says "bank ya portal se confirm karein",
 * and the checks below only warn about a scheme limit rather than refuse.
 *
 * Figures as published by KVIC (PMEGP), the UP MSME department and lending
 * banks (CM-YUVA, MYSY) and the Finance Ministry (Mudra), checked November 2026.
 */

export type SchemeTerms = {
  id: SchemeId;
  label: string;
  /** One line under the scheme name. */
  summary: string;
  /** Largest project cost the scheme allows for this sector, if it has one. */
  maxProjectCost: number | null;
  /** Largest bank loan (term + CC) the scheme allows, if it has one. */
  maxLoan: number | null;
  /** Owner's own share of the project cost, percent. */
  ownContributionPct: number;
  /** Back-ended subsidy as a percent of project cost, and its cap. */
  subsidyPct: number;
  subsidyCap: number | null;
  interestSubventionPct: number;
  interestSubventionYears: number;
  defaultTenureYears: number;
  /** Must the loan have both a term part and a CC part? */
  needsComposite: boolean;
  /** Which of sector / area / category change the terms, so the form asks only for those. */
  asks: { sector: boolean; area: boolean; category: boolean };
  /** Points the admin should know, in Hinglish. */
  notes: string[];
  /**
   * Back-ended subsidy: years it stays in a TDR before it is adjusted against
   * the term loan (0 = credited at once / no subsidy), and whether the bank
   * charges no interest on the loan equal to it meanwhile.
   */
  lockInYears: number;
  interestFreeOnSubsidy: boolean;
};

export const SCHEME_OPTIONS: { value: SchemeId; label: string }[] = [
  { value: "none", label: "Koi yojana nahi (normal bank loan)" },
  { value: "cmyuva", label: "CM-YUVA (Mukhyamantri Yuva Udyami Vikas Abhiyan, UP)" },
  { value: "mysy", label: "MYSY (Mukhyamantri Yuva Swarozgar Yojana, UP)" },
  { value: "pmegp", label: "PMEGP (Prime Minister's Employment Generation Programme)" },
  { value: "pmfme", label: "PMFME (PM Formalisation of Micro Food Processing Enterprises)" },
  { value: "mudra", label: "PM Mudra (Shishu / Kishore / Tarun / Tarun Plus)" },
  { value: "other", label: "Koi aur yojana" },
];

export const SECTOR_OPTIONS: { value: SchemeSector; label: string }[] = [
  { value: "manufacturing", label: "Manufacturing (udyog)" },
  { value: "service", label: "Service" },
  { value: "trading", label: "Trading (vyapar)" },
];

export const AREA_OPTIONS: { value: SchemeArea; label: string }[] = [
  { value: "urban", label: "Urban (shahar)" },
  { value: "rural", label: "Rural (gaon)" },
];

export const CATEGORY_OPTIONS: { value: SchemeCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "special", label: "Special (SC/ST/OBC/Minority/Women/Ex-servicemen/Divyang)" },
];

const LAKH = 100_000;

export const MUDRA_CATEGORIES = [
  { name: "Shishu", upTo: 50_000 },
  { name: "Kishore", upTo: 5 * LAKH },
  { name: "Tarun", upTo: 10 * LAKH },
  { name: "Tarun Plus", upTo: 20 * LAKH },
] as const;

/** Mudra category for a loan amount, or null above Rs. 20 lakh. */
export function mudraCategory(loan: number) {
  return MUDRA_CATEGORIES.find((category) => loan <= category.upTo) ?? null;
}

type Borrower = { sector: SchemeSector; area: SchemeArea; category: SchemeCategory };

export function schemeTerms(id: SchemeId, borrower: Borrower): SchemeTerms | null {
  const special = borrower.category === "special";
  const rural = borrower.area === "rural";

  switch (id) {
    case "cmyuva":
      return {
        id,
        label: "CM-YUVA",
        summary: "Pehle charan mein Rs. 5 lakh tak ka bina byaaj, bina guarantee composite loan (term + working capital).",
        maxProjectCost: 5 * LAKH,
        maxLoan: 5 * LAKH,
        ownContributionPct: 10,
        subsidyPct: 10,
        subsidyCap: 50_000,
        interestSubventionPct: 100,
        interestSubventionYears: 4,
        defaultTenureYears: 4,
        needsComposite: true,
        lockInYears: 2,
        interestFreeOnSubsidy: false,
        asks: { sector: false, area: false, category: false },
        notes: [
          "Loan composite hona chahiye: term loan aur working capital (CC) dono.",
          "Pehle 4 saal ka poora byaaj UP sarkar deti hai (100% interest subvention).",
          "Margin money subsidy project cost ka 10%, zyada se zyada Rs. 50,000 (default). Kuch bank own contribution General 15%, OBC 12.5%, SC/ST 10% maangte hain; bank se confirm karein.",
          "Umr 21 se 40 saal; dusre charan ka loan pehla loan samay par chukane ke baad hi milta hai.",
        ],
      };

    case "mysy": {
      const service = borrower.sector !== "manufacturing";
      const maxProjectCost = service ? 10 * LAKH : 25 * LAKH;
      return {
        id,
        label: "MYSY",
        summary: `${service ? "Service" : "Udyog"} project Rs. ${service ? "10" : "25"} lakh tak; project cost ka 25% margin money (subsidy).`,
        maxProjectCost,
        maxLoan: null,
        ownContributionPct: special ? 5 : 10,
        subsidyPct: 25,
        subsidyCap: maxProjectCost * 0.25,
        interestSubventionPct: 0,
        interestSubventionYears: 0,
        defaultTenureYears: 5,
        needsComposite: false,
        lockInYears: 2,
        interestFreeOnSubsidy: false,
        asks: { sector: true, area: false, category: true },
        notes: [
          "Project cost = machine / capital kharcha (zameen chhod kar) + ek cycle ka working capital.",
          `Own contribution: General 10%, special category 5% (yahan ${special ? "5" : "10"}%).`,
          `Margin money project cost ka 25%; cap Rs. ${service ? "2.5" : "6.25"} lakh mana gaya hai. Government order se confirm karein.`,
        ],
      };
    }

    case "pmegp": {
      const service = borrower.sector !== "manufacturing";
      const subsidyPct = special ? (rural ? 35 : 25) : rural ? 25 : 15;
      return {
        id,
        label: "PMEGP",
        summary: `${service ? "Service / business" : "Manufacturing"} project Rs. ${service ? "20" : "50"} lakh tak; ${subsidyPct}% margin money subsidy.`,
        maxProjectCost: service ? 20 * LAKH : 50 * LAKH,
        maxLoan: null,
        ownContributionPct: special ? 5 : 10,
        subsidyPct,
        subsidyCap: null,
        interestSubventionPct: 0,
        interestSubventionYears: 0,
        defaultTenureYears: 5,
        needsComposite: false,
        lockInYears: 3,
        interestFreeOnSubsidy: true,
        asks: { sector: true, area: true, category: true },
        notes: [
          "Subsidy: General urban 15%, rural 25%; special category urban 25%, rural 35%.",
          "Own contribution: General 10%, special category 5%. Baaki bank loan (term loan + working capital).",
          "Subsidy back-ended hai: bank 3 saal tak TDR mein rakhta hai, phir loan mein adjust karta hai. Isliye balance sheet mein ye dono taraf barabar dikhti hai.",
          "Project cost mein zameen nahi aati; machine aur ek cycle ka working capital aata hai.",
        ],
      };
    }

    case "pmfme":
      return {
        id,
        label: "PMFME",
        summary: "Food processing micro unit: eligible project cost ka 35% credit-linked subsidy, zyada se zyada Rs. 10 lakh.",
        maxProjectCost: null,
        maxLoan: null,
        ownContributionPct: 10,
        subsidyPct: 35,
        subsidyCap: 10 * LAKH,
        interestSubventionPct: 0,
        interestSubventionYears: 0,
        defaultTenureYears: 6,
        needsComposite: false,
        lockInYears: 3,
        interestFreeOnSubsidy: false,
        asks: { sector: false, area: false, category: false },
        notes: [
          "Sirf food processing (khadya prasanskaran) ke micro unit; naya ya chalu dono.",
          "Subsidy credit-linked hai: bank loan ke saath hi milti hai, kam se kam 10% apna paisa.",
          "Yojana 2020-21 se 2025-26 tak ke liye thi; aage badhi hai ya nahi, PMFME portal se confirm karein.",
        ],
      };

    case "mudra":
      return {
        id,
        label: "PM Mudra",
        summary: "Bina guarantee loan Rs. 20 lakh tak: Shishu 50 hazaar, Kishore 5 lakh, Tarun 10 lakh, Tarun Plus 20 lakh tak.",
        maxProjectCost: null,
        maxLoan: 20 * LAKH,
        ownContributionPct: 10,
        subsidyPct: 0,
        subsidyCap: null,
        interestSubventionPct: 0,
        interestSubventionYears: 0,
        defaultTenureYears: 5,
        needsComposite: false,
        lockInYears: 0,
        interestFreeOnSubsidy: false,
        asks: { sector: false, area: false, category: false },
        notes: [
          "Koi subsidy nahi; loan term loan, CC/OD ya dono ho sakta hai.",
          "Tarun Plus (10 se 20 lakh) sirf unhe milta hai jinhone pehle Tarun loan samay par chuka diya ho.",
          "Own contribution bank ke norm ke hisaab se, aam taur par 10 se 25%.",
        ],
      };

    case "other":
      return {
        id,
        label: "Yojana",
        summary: "Yojana ki shartein khud bharein: own contribution, subsidy aur byaaj mein chhoot.",
        maxProjectCost: null,
        maxLoan: null,
        ownContributionPct: 10,
        subsidyPct: 0,
        subsidyCap: null,
        interestSubventionPct: 0,
        interestSubventionYears: 0,
        defaultTenureYears: 5,
        needsComposite: false,
        lockInYears: 0,
        interestFreeOnSubsidy: false,
        asks: { sector: false, area: false, category: false },
        notes: ["Yojana ke guideline ke hisaab se neeche ke box bharein."],
      };

    default:
      return null;
  }
}

/** Terms for the scheme currently picked in a projection. */
export function termsFor(p: Pick<ProjectionAssumptions, "scheme" | "schemeSector" | "schemeArea" | "schemeCategory">) {
  return schemeTerms(p.scheme, { sector: p.schemeSector, area: p.schemeArea, category: p.schemeCategory });
}

const roundRupee = (value: number) => Math.round(value);

/**
 * The figures a scheme implies for a project: what the owner puts in, what
 * the subsidy comes to and how much the bank lends. The bank loan is split
 * between the term loan (for the machinery) and the CC limit (for working
 * capital) in proportion to what each part of the project costs.
 */
export function schemeSuggestion(terms: SchemeTerms, project: { fixedAssets: number; workingCapital: number }) {
  const cost = Math.max(0, project.fixedAssets) + Math.max(0, project.workingCapital);
  const ownContribution = roundRupee((cost * terms.ownContributionPct) / 100);
  const rawSubsidy = (cost * terms.subsidyPct) / 100;
  const subsidy = roundRupee(terms.subsidyCap === null ? rawSubsidy : Math.min(rawSubsidy, terms.subsidyCap));
  const bankLoan = Math.max(0, cost - ownContribution);
  const wcShare = cost > 0 ? Math.max(0, project.workingCapital) / cost : 0;
  const ccLimit = roundRupee(bankLoan * wcShare);
  const termLoan = bankLoan - ccLimit;
  return { cost, ownContribution, subsidy, termLoan, ccLimit, bankLoan };
}
