import type { SchemeId, SchemeSector } from "@/lib/balance-sheets/engine";

import { GROUP_LABELS, type ActivityGroup } from "./activities";
import type { DprInput } from "./engine";
import { SCHEME_CATALOG } from "./scheme-catalog";
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
  /** Template groups the scheme is limited to (PMFME: food), or null. */
  onlyGroups: string[] | null;
};

const ALL: SchemeSector[] = ["manufacturing", "service", "trading"];

/** The eligibility side of each scheme, read from the versioned catalog. */
export const SCHEME_RULES = Object.fromEntries(
  Object.values(SCHEME_CATALOG).map((c) => [
    c.id,
    { sectors: c.sectors, age: { min: c.age.min, max: c.age.max }, education: c.education?.hi ?? null, educationEn: c.education?.en ?? null, documents: c.documents, excludes: c.excludes, onlyGroups: c.onlyGroups },
  ]),
) as Record<SchemeId, SchemeRule>;

export const SECTOR_LABEL: Record<SchemeSector, string> = {
  manufacturing: "Manufacturing (udyog)",
  service: "Service",
  trading: "Trading (vyapar / dukaan)",
};

export function sectorsFor(scheme: SchemeId): SchemeSector[] {
  return SCHEME_RULES[scheme]?.sectors ?? ALL;
}

export function isEligible(template: ProjectTemplate, scheme: SchemeId) {
  const only = SCHEME_RULES[scheme]?.onlyGroups;
  return sectorsFor(scheme).includes(template.sector) && !template.notFor.includes(scheme) && (!only || only.includes(template.group));
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

const SCHEME_NAME = Object.fromEntries(Object.values(SCHEME_CATALOG).map((c) => [c.id, c.short])) as Record<SchemeId, string>;

/** What would stop the scheme accepting this project, in Hinglish. Empty when it fits. */
export function eligibilityIssues(input: DprInput): string[] {
  const rule = SCHEME_RULES[input.scheme];
  if (!rule) return [];
  const name = SCHEME_NAME[input.scheme];
  const out: string[] = [];
  if (!rule.sectors.includes(input.sector)) out.push(`${name} mein ${SECTOR_LABEL[input.sector].toLowerCase()} project nahi hota. Yojana ya kaam badlein.`);
  const template = templateById(input.templateId);
  if (template && (template.notFor.includes(input.scheme) || (rule.onlyGroups && !rule.onlyGroups.includes(template.group)))) out.push(`"${template.label}" ${name} mein nahi aata. ${rule.excludes}`);
  if (template && template.sector !== input.sector) out.push(`Kaam "${template.label}" ${SECTOR_LABEL[template.sector].toLowerCase()} hai, lekin sector ${SECTOR_LABEL[input.sector].toLowerCase()} chuna hai. Sector theek karein.`);
  const lead = input.promoters.find((p) => p.name.trim());
  if (lead?.age) {
    if (lead.age < rule.age.min) out.push(`${name} mein promoter ki umr kam se kam ${rule.age.min} saal honi chahiye (abhi ${lead.age}).`);
    if (rule.age.max !== null && lead.age > rule.age.max) out.push(`${name} mein promoter ki umr ${rule.age.max} saal tak honi chahiye (abhi ${lead.age}).`);
  }
  return out;
}
