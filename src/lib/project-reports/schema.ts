import { z } from "zod";

import { CONSTITUTIONS, type Constitution } from "@/lib/balance-sheets/engine";
import { AREA_OPTIONS, CATEGORY_OPTIONS, SCHEME_OPTIONS, SECTOR_OPTIONS } from "@/lib/balance-sheets/schemes";

import { ASSET_KINDS, NARRATIVE_KEYS, type AssetKind, type DprInput } from "./engine";

/**
 * Validation for a DPR, used by the API before anything is stored. The
 * browser's copy is never trusted.
 */

const amount = z.coerce.number().finite().min(0, "Amount minus mein nahi ho sakta").max(1e12, "Amount bahut bada hai");
const optionalAmount = z.union([z.null(), amount]);
const pct = (max: number) => z.coerce.number().finite().min(0, "Percent minus mein nahi ho sakta").max(max, `Percent ${max} se zyada nahi ho sakta`);
const days = z.coerce.number().finite().min(0).max(730);
const text = (max: number) => z.string().trim().max(max).default("");
const enumOf = <T extends string>(values: readonly { value: T }[]) => z.enum(values.map((v) => v.value) as [T, ...T[]]);

const promoterSchema = z.object({
  name: text(120),
  fatherName: text(120),
  age: z.union([z.null(), z.coerce.number().int().min(18, "Umr 18 se kam nahi ho sakti").max(100)]),
  gender: text(20),
  qualification: text(160),
  experience: text(300),
  socialCategory: text(40),
  mobile: text(20),
  email: text(120),
  address: text(300),
});

export const dprInputSchema = z.object({
  templateId: z.union([z.null(), z.string().max(40)]).default(null),
  businessName: z.string().trim().min(2, "Business ka naam bharein").max(160),
  constitution: z.enum(CONSTITUTIONS.map((c) => c.value) as [Constitution, ...Constitution[]]),
  activity: text(300),
  sector: enumOf(SECTOR_OPTIONS),
  area: enumOf(AREA_OPTIONS),
  category: enumOf(CATEGORY_OPTIONS),
  address: text(400),
  district: text(80),
  state: text(80),
  pincode: z.string().trim().max(6).regex(/^(\d{6})?$/, "Pincode 6 ank ka hota hai").default(""),
  udyamNumber: text(40),
  gstin: text(20),
  pan: text(10),
  premises: z.enum(["owned", "rented", "leased"]),
  bankName: text(120),
  bankBranch: text(120),
  promoters: z.array(promoterSchema).min(1).max(10),

  startFy: z.coerce.number().int().min(2000).max(2100),
  years: z.coerce.number().int().min(3, "Kam se kam 3 saal").max(10),
  scheme: enumOf(SCHEME_OPTIONS),

  capitalItems: z
    .array(
      z.object({
        kind: z.enum(ASSET_KINDS.map((k) => k.value) as [AssetKind, ...AssetKind[]]),
        description: z.string().trim().min(1, "Item ka naam bharein").max(200),
        quantity: amount,
        rate: amount,
        supplier: text(160),
        quotationRef: text(80),
      }),
    )
    .max(100),
  contingencyPct: pct(25).default(0),
  depreciationMethod: z.enum(["auto", "wdv", "slm"]).default("auto"),
  depreciationRates: z.record(z.string(), pct(100)).default({}),
  preliminaryWriteOffYears: z.coerce.number().int().min(1).max(10),

  products: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Product ka naam bharein").max(160),
        unit: text(30),
        capacity: amount,
        price: amount,
        processLossPct: pct(90).default(0),
        rejectionPct: pct(90).default(0),
      }),
    )
    .max(30),
  utilisationPct: z.array(pct(100)).min(1).max(10),
  priceGrowthPct: pct(50),
  rawMaterials: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Raw material ka naam bharein").max(160),
        unit: text(30),
        quantity: amount,
        rate: amount,
        productIndex: z.union([z.null(), z.coerce.number().int().min(0).max(29)]).default(null),
        perUnit: z.union([z.null(), amount]).default(null),
        lossPct: pct(90).default(0),
      }),
    )
    .max(50),
  staff: z.array(z.object({ role: z.string().trim().min(1, "Post ka naam bharein").max(120), count: z.coerce.number().int().min(0).max(10000), monthlySalary: amount, direct: z.boolean() })).max(50),
  employerContributionPct: z.union([z.null(), pct(30)]).default(null),
  overheads: z
    .array(z.object({ name: z.string().trim().min(1, "Kharche ka naam bharein").max(120), monthly: amount, variable: z.boolean(), direct: z.boolean(), estimated: z.boolean().default(false) }))
    .max(50),
  costGrowthPct: pct(50),

  rawMaterialDays: days,
  workInProgressDays: days.default(0),
  finishedGoodsDays: days,
  debtorDays: days,
  creditorDays: days,
  minimumCashDays: days.default(0),

  includeLand: z.boolean(),
  ownContributionPct: z.union([z.null(), pct(100)]),
  otherFunding: amount.default(0),
  termLoanOverride: optionalAmount,
  ccLimitOverride: optionalAmount,
  workingCapitalOverride: optionalAmount.default(null),
  subsidyOverride: optionalAmount,
  termLoanInterestPct: pct(30),
  ccInterestPct: pct(30),
  tenureYears: z.coerce.number().finite().min(1).max(15),
  moratoriumMonths: z.coerce.number().int().min(0).max(36),
  repaymentMethod: z.enum(["equal_principal", "emi"]).default("equal_principal"),
  repaymentFrequency: z.enum(["monthly", "quarterly"]).default("monthly"),
  interestSubventionPct: z.union([z.null(), pct(100)]),
  interestSubventionYears: z.union([z.null(), z.coerce.number().int().min(0).max(10)]),
  taxRegime: z.enum(["new", "old", "manual"]).default("new"),
  taxPct: pct(60),
  drawingsPerYear: amount,

  narrative: z.object(Object.fromEntries(NARRATIVE_KEYS.map((key) => [key, z.string().max(6000).optional()]))).partial().default({}),
});

export const projectReportSchema = z.object({
  status: z.enum(["draft", "final"]).default("draft"),
  input: dprInputSchema,
});

export type ProjectReportPayload = { status: "draft" | "final"; input: DprInput };

export function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Details check karein.";
  return issue.message;
}
