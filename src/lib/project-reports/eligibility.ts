import type { SchemeId, SchemeSector } from "@/lib/balance-sheets/engine";

import { GROUP_LABELS, type ActivityGroup } from "./activities";
import type { DprInput } from "./engine";
import { TEMPLATES, templateById, type ProjectTemplate } from "./templates";

/**
 * Which businesses each loan scheme funds, and who can apply.
 *
 * From the scheme guidelines and lending banks' pages, checked November
 * 2026: PMEGP (KVIC) and MYSY (UP MSME department) fund new manufacturing
 * and service units but not pure trading; CM-YUVA (UP) and PM Mudra fund
 * manufacturing, service and trading. These are defaults to guide the
 * admin — the bank and the scheme portal have the final word, which is why
 * the form warns rather than refuses.
 */

export type SchemeRule = {
  sectors: SchemeSector[];
  /** Promoter's age on the date of application. */
  age: { min: number; max: number | null };
  /** Minimum education, in Hinglish for the form and in English for the report, or null if none. */
  education: string | null;
  educationEn: string | null;
  /** Documents the bank / portal asks for beyond the common ones. */
  documents: string[];
  /** One line on what the scheme does not fund. */
  excludes: string;
};

const ALL: SchemeSector[] = ["manufacturing", "service", "trading"];

export const SCHEME_RULES: Record<SchemeId, SchemeRule> = {
  pmegp: {
    sectors: ["manufacturing", "service"],
    age: { min: 18, max: null },
    education: "Manufacturing mein Rs. 10 lakh se aur service mein Rs. 5 lakh se bade project ke liye kam se kam 8th pass.",
    educationEn: "Class VIII pass for projects above Rs. 10 lakh (manufacturing) / Rs. 5 lakh (service)",
    documents: [
      "EDP (Entrepreneurship Development Programme) training certificate",
      "PMEGP portal application (KVIC / KVIB / DIC) with applicant ID",
      "Caste / special category certificate (for higher subsidy)",
      "Rural area certificate from the gram pradhan / tehsil (for rural rate)",
    ],
    excludes: "Sirf khareed-bikri (trading), meat, nasha (beedi, pan, gutkha, sharab), kheti-baadi aur sarkar dwara band kaam PMEGP mein nahi hote.",
  },
  mysy: {
    sectors: ["manufacturing", "service"],
    age: { min: 18, max: 40 },
    education: "High school (10th) pass.",
    educationEn: "High school (Class X) pass",
    documents: ["MYSY application on the UP MSME / Udyami Launchpad portal", "High school marksheet / certificate", "UP domicile certificate", "Caste / special category certificate, where applicable"],
    excludes: "MYSY mein udyog (Rs. 25 lakh tak) aur service (Rs. 10 lakh tak) project aate hain; sirf trading nahi.",
  },
  cmyuva: {
    sectors: ALL,
    age: { min: 21, max: 40 },
    education: "Kam se kam 8th pass; skill / training certificate ho to behtar.",
    educationEn: "At least Class VIII pass; skill training preferred",
    documents: ["CM-YUVA application on the UP MSME portal", "Skill / training certificate (if any)", "UP domicile certificate", "Declaration that no earlier government-scheme loan was taken"],
    excludes: "Tambaku, gutkha, pan masala, sharab, cold drink (aerated drinks), patakhe aur 40 micron se patli plastic thaili CM-YUVA mein nahi.",
  },
  mudra: {
    sectors: ALL,
    age: { min: 18, max: null },
    education: null,
    educationEn: null,
    documents: ["Mudra loan application form (Shishu / Kishore / Tarun / Tarun Plus)", "Quotations of machinery / stock to be bought", "Proof of business address"],
    excludes: "Mudra non-farm aay wale kaam ke liye hai: manufacturing, trading aur service.",
  },
  none: { sectors: ALL, age: { min: 18, max: null }, education: null, educationEn: null, documents: [], excludes: "" },
  other: { sectors: ALL, age: { min: 18, max: null }, education: null, educationEn: null, documents: [], excludes: "" },
};

export const SECTOR_LABEL: Record<SchemeSector, string> = {
  manufacturing: "Manufacturing (udyog)",
  service: "Service",
  trading: "Trading (vyapar / dukaan)",
};

export function sectorsFor(scheme: SchemeId): SchemeSector[] {
  return SCHEME_RULES[scheme]?.sectors ?? ALL;
}

export function isEligible(template: ProjectTemplate, scheme: SchemeId) {
  return sectorsFor(scheme).includes(template.sector) && !template.notFor.includes(scheme);
}

/** The businesses a scheme funds, grouped the way the form lists them. */
export function templatesFor(scheme: SchemeId, sector: SchemeSector | "all" = "all") {
  const groups = new Map<ActivityGroup, ProjectTemplate[]>();
  for (const template of TEMPLATES) {
    if (!isEligible(template, scheme)) continue;
    if (sector !== "all" && template.sector !== sector) continue;
    groups.set(template.group, [...(groups.get(template.group) ?? []), template]);
  }
  return (Object.keys(GROUP_LABELS) as ActivityGroup[])
    .filter((group) => groups.has(group))
    .map((group) => ({ group, label: GROUP_LABELS[group], templates: [...groups.get(group)!].sort((a, b) => a.label.localeCompare(b.label)) }));
}

const SCHEME_NAME: Record<SchemeId, string> = { pmegp: "PMEGP", mysy: "MYSY", cmyuva: "CM-YUVA", mudra: "Mudra", none: "Bank loan", other: "Yojana" };

/** What would stop the scheme accepting this project, in Hinglish. Empty when it fits. */
export function eligibilityIssues(input: DprInput): string[] {
  const rule = SCHEME_RULES[input.scheme];
  if (!rule) return [];
  const name = SCHEME_NAME[input.scheme];
  const out: string[] = [];
  if (!rule.sectors.includes(input.sector)) out.push(`${name} mein ${SECTOR_LABEL[input.sector].toLowerCase()} project nahi hota. Yojana ya kaam badlein.`);
  const template = templateById(input.templateId);
  if (template?.notFor.includes(input.scheme)) out.push(`"${template.label}" ${name} mein nahi aata. ${rule.excludes}`);
  const lead = input.promoters.find((p) => p.name.trim());
  if (lead?.age) {
    if (lead.age < rule.age.min) out.push(`${name} mein promoter ki umr kam se kam ${rule.age.min} saal honi chahiye (abhi ${lead.age}).`);
    if (rule.age.max !== null && lead.age > rule.age.max) out.push(`${name} mein promoter ki umr ${rule.age.max} saal tak honi chahiye (abhi ${lead.age}).`);
  }
  return out;
}
