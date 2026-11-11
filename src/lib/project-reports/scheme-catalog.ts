import type { SchemeId, SchemeSector } from "@/lib/balance-sheets/engine";

/**
 * Government loan schemes: who and what each one funds, with a version, the
 * date the rules were last checked, the sources, and — rule by rule —
 * whether the rule could be confirmed from an official or lending-bank
 * source ("verified") or only from secondary sources ("verification
 * required").
 *
 * The money figures themselves (own contribution, subsidy %, caps, limits,
 * lock-in) live in `balance-sheets/schemes.ts` so the balance sheet and the
 * DPR never disagree; this file adds what a DPR needs around them. Nothing
 * here is presented to a bank as confirmed unless its status says so, and
 * no report claims a loan or a subsidy will be sanctioned.
 */

export type Verification = "verified" | "verification_required";

export type SchemeRuleLine = {
  /** What the rule is, in English for the report. */
  rule: string;
  /** The requirement, in English for the report. */
  requirement: string;
  status: Verification;
  note?: string;
};

export type SchemeConfig = {
  id: SchemeId;
  name: string;
  short: string;
  jurisdiction: string;
  version: string;
  /** Rules as of this date. */
  effectiveFrom: string;
  lastVerified: string;
  sources: { label: string; url: string }[];
  sectors: SchemeSector[];
  /** Businesses limited to a template group (PMFME: food processing only). */
  onlyGroups: string[] | null;
  age: { min: number; max: number | null; status: Verification };
  education: { hi: string; en: string; status: Verification } | null;
  /** Hinglish line for the form on what the scheme does not fund. */
  excludes: string;
  /** Negative list, in English for the report. */
  negativeList: string[];
  documents: string[];
  /** Rule-by-rule status of the money terms, in the order the report prints them. */
  terms: SchemeRuleLine[];
};

const VERIFIED_ON = "2026-11-11";

export const SCHEME_CATALOG: Record<SchemeId, SchemeConfig> = {
  pmegp: {
    id: "pmegp",
    name: "Prime Minister's Employment Generation Programme",
    short: "PMEGP",
    jurisdiction: "All India (KVIC / KVIB / DIC)",
    version: "PMEGP guidelines as revised 2022 (project cost Rs. 50 lakh manufacturing / Rs. 20 lakh service)",
    effectiveFrom: "2022-04-01",
    lastVerified: VERIFIED_ON,
    sources: [
      { label: "myScheme — PMEGP", url: "https://www.myscheme.gov.in/schemes/pmegp" },
      { label: "SBI — PMEGP", url: "https://sbi.co.in/web/agri-rural/pmegp" },
      { label: "KVIC PMEGP e-portal", url: "https://www.kviconline.gov.in/pmegpeportal/" },
    ],
    sectors: ["manufacturing", "service"],
    onlyGroups: null,
    age: { min: 18, max: null, status: "verified" },
    education: {
      hi: "Manufacturing mein Rs. 10 lakh se aur service mein Rs. 5 lakh se bade project ke liye kam se kam 8th pass.",
      en: "Class VIII pass for projects above Rs. 10 lakh (manufacturing) / Rs. 5 lakh (service)",
      status: "verified",
    },
    excludes: "Sirf khareed-bikri (trading), meat, nasha (beedi, pan, gutkha, sharab), kheti-baadi aur sarkar dwara band kaam PMEGP mein nahi hote.",
    negativeList: [
      "Meat processing and sale; intoxicants such as beedi, pan, cigar, cigarette, liquor",
      "Plantation and cultivation of crops",
      "Pure trading without manufacturing or service backing",
      "Activities banned by the Government of India or the local authority",
    ],
    documents: [
      "EDP (Entrepreneurship Development Programme) training certificate",
      "PMEGP portal application (KVIC / KVIB / DIC) with applicant ID",
      "Caste / special category certificate (for higher subsidy)",
      "Rural area certificate from the gram pradhan / tehsil (for rural rate)",
    ],
    terms: [
      { rule: "Own contribution", requirement: "10% (general); 5% (special category)", status: "verified" },
      { rule: "Margin money subsidy", requirement: "15% / 25% urban / rural (general); 25% / 35% (special)", status: "verified" },
      { rule: "Subsidy treatment", requirement: "Kept as TDR for 3 years; no interest on the loan equal to the TDR; then adjusted against the loan", status: "verified" },
    ],
  },
  mysy: {
    id: "mysy",
    name: "Mukhyamantri Yuva Swarozgar Yojana",
    short: "MYSY",
    jurisdiction: "Uttar Pradesh (MSME & Export Promotion Department)",
    version: "MYSY as published on the UP MSME portal",
    effectiveFrom: "2018-01-01",
    lastVerified: VERIFIED_ON,
    sources: [
      { label: "UP MSME 1-Connect — MYSY", url: "https://msme1connect.up.gov.in/Home/SchemesList/5" },
      { label: "Udyami Launchpad UP", url: "https://msmeup.org.in/" },
    ],
    sectors: ["manufacturing", "service"],
    onlyGroups: null,
    age: { min: 18, max: 40, status: "verification_required" },
    education: { hi: "High school (10th) pass.", en: "High school (Class X) pass", status: "verification_required" },
    excludes: "MYSY mein udyog (Rs. 25 lakh tak) aur service (Rs. 10 lakh tak) project aate hain; sirf trading nahi.",
    negativeList: ["Pure trading", "Activities in the state's negative list"],
    documents: ["MYSY application on the UP MSME / Udyami Launchpad portal", "High school marksheet / certificate", "UP domicile certificate", "Caste / special category certificate, where applicable"],
    terms: [
      { rule: "Project cost limit", requirement: "Rs. 25 lakh (industry); Rs. 10 lakh (service)", status: "verified" },
      { rule: "Margin money", requirement: "25% of project cost, up to Rs. 6.25 lakh (industry) / Rs. 2.50 lakh (service)", status: "verification_required", note: "25% confirmed on the UP MSME portal; the caps are from secondary sources." },
      { rule: "Own contribution", requirement: "10% (general); 5% (special category)", status: "verification_required" },
      { rule: "Subsidy treatment", requirement: "Taken as adjusted against the term loan after 2 years", status: "verification_required", note: "Lock-in not found in an official source; confirm with the bank." },
    ],
  },
  cmyuva: {
    id: "cmyuva",
    name: "Mukhyamantri Yuva Udyami Vikas Abhiyan (CM-YUVA)",
    short: "CM-YUVA",
    jurisdiction: "Uttar Pradesh",
    version: "CM-YUVA phase 1 (first loan up to Rs. 5 lakh)",
    effectiveFrom: "2025-01-24",
    lastVerified: VERIFIED_ON,
    sources: [
      { label: "Canara Bank — CM-YUVA", url: "https://canarabank.com/pages/mukhyamantri-yuva-udyami-vikas-yojana-(cm-yuva)" },
      { label: "UP MSME 1-Connect — CM-YUVA", url: "https://msme1connect.up.gov.in/scheme-list/-mukhyamantri-yuva-udyami-vikas-abhiyan-yojana-(cm-yuva)" },
    ],
    sectors: ["manufacturing", "service", "trading"],
    onlyGroups: null,
    age: { min: 21, max: 40, status: "verification_required" },
    education: { hi: "Kam se kam 8th pass; skill / training certificate ho to behtar.", en: "At least Class VIII pass; skill training preferred", status: "verification_required" },
    excludes: "Tambaku, gutkha, pan masala, sharab, cold drink (aerated drinks), patakhe aur 40 micron se patli plastic thaili CM-YUVA mein nahi.",
    negativeList: ["Tobacco products, gutkha, pan masala", "Alcohol and aerated drinks", "Firecrackers", "Plastic carry bags below 40 micron", "Purchase of land or building"],
    documents: ["CM-YUVA application on the UP MSME portal", "Skill / training certificate (if any)", "UP domicile certificate", "Declaration that no earlier government-scheme loan was taken"],
    terms: [
      { rule: "Loan", requirement: "Up to Rs. 5 lakh, collateral-free, composite (term + working capital)", status: "verified" },
      { rule: "Interest subvention", requirement: "100% of interest for 4 years", status: "verified" },
      { rule: "Own contribution", requirement: "10% taken; some banks ask 15% / 12.5% / 10% by category", status: "verification_required" },
      { rule: "Margin money subsidy", requirement: "10% of project cost, up to Rs. 50,000", status: "verification_required" },
    ],
  },
  pmfme: {
    id: "pmfme",
    name: "PM Formalisation of Micro Food Processing Enterprises",
    short: "PMFME",
    jurisdiction: "All India (Ministry of Food Processing Industries)",
    version: "PMFME guidelines (scheme period 2020-21 to 2025-26)",
    effectiveFrom: "2020-06-29",
    lastVerified: VERIFIED_ON,
    sources: [
      { label: "PMFME portal", url: "https://pmfme.mofpi.gov.in/" },
      { label: "Canara Bank — PMFME", url: "https://canarabank.com/pages/PMFME" },
      { label: "SBI — PMFME", url: "https://sbi.co.in/web/agri-rural/agriculture-banking/government-schemes/pmfme-scheme" },
    ],
    sectors: ["manufacturing"],
    onlyGroups: ["food"],
    age: { min: 18, max: null, status: "verified" },
    education: { hi: "Kam se kam 8th pass.", en: "At least Class VIII pass", status: "verification_required" },
    excludes: "PMFME sirf khadya prasanskaran (food processing) ke micro unit ke liye hai.",
    negativeList: ["Activities other than food processing"],
    documents: ["PMFME portal application (with District Resource Person)", "FSSAI registration / licence or application", "Udyam registration"],
    terms: [
      { rule: "Credit-linked subsidy", requirement: "35% of eligible project cost, up to Rs. 10 lakh per unit", status: "verified" },
      { rule: "Own contribution", requirement: "At least 10% of project cost", status: "verification_required" },
      { rule: "Scheme period", requirement: "2020-21 to 2025-26; extension to be confirmed", status: "verification_required" },
    ],
  },
  mudra: {
    id: "mudra",
    name: "Pradhan Mantri Mudra Yojana",
    short: "Mudra",
    jurisdiction: "All India",
    version: "PMMY with Tarun Plus (Union Budget 2024-25)",
    effectiveFrom: "2024-10-24",
    lastVerified: VERIFIED_ON,
    sources: [{ label: "Mudra", url: "https://www.mudra.org.in/" }],
    sectors: ["manufacturing", "service", "trading"],
    onlyGroups: null,
    age: { min: 18, max: null, status: "verified" },
    education: null,
    excludes: "Mudra non-farm aay wale kaam ke liye hai: manufacturing, trading aur service.",
    negativeList: ["Direct agriculture (crop loans)"],
    documents: ["Mudra loan application form (Shishu / Kishore / Tarun / Tarun Plus)", "Quotations of machinery / stock to be bought", "Proof of business address"],
    terms: [
      { rule: "Loan", requirement: "Shishu Rs. 50,000; Kishore Rs. 5 lakh; Tarun Rs. 10 lakh; Tarun Plus Rs. 20 lakh", status: "verified" },
      { rule: "Subsidy", requirement: "None", status: "verified" },
    ],
  },
  none: {
    id: "none",
    name: "Bank finance (no government scheme)",
    short: "Bank loan",
    jurisdiction: "-",
    version: "-",
    effectiveFrom: "-",
    lastVerified: VERIFIED_ON,
    sources: [],
    sectors: ["manufacturing", "service", "trading"],
    onlyGroups: null,
    age: { min: 18, max: null, status: "verified" },
    education: null,
    excludes: "",
    negativeList: [],
    documents: [],
    terms: [],
  },
  other: {
    id: "other",
    name: "Other scheme",
    short: "Yojana",
    jurisdiction: "-",
    version: "-",
    effectiveFrom: "-",
    lastVerified: VERIFIED_ON,
    sources: [],
    sectors: ["manufacturing", "service", "trading"],
    onlyGroups: null,
    age: { min: 18, max: null, status: "verification_required" },
    education: null,
    excludes: "",
    negativeList: [],
    documents: [],
    terms: [{ rule: "Scheme terms", requirement: "As entered by the preparer", status: "verification_required" }],
  },
};

export function schemeConfig(id: SchemeId) {
  return SCHEME_CATALOG[id] ?? SCHEME_CATALOG.other;
}
