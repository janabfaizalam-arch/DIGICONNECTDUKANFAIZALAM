import { z } from "zod";

import { CONSTITUTIONS, type BalanceSheetFigures, type Constitution } from "@/lib/balance-sheets/engine";

/**
 * The shape of a balance sheet record, validated the same way in the admin
 * form and in the API route. The server never trusts the browser's copy: it
 * parses the request body with this schema before anything is stored.
 */

const amount = z.coerce.number().finite().min(0, "Amount minus mein nahi ho sakta").max(1e12, "Amount bahut bada hai");
const optionalAmount = z.union([z.null(), amount]);
const pct = (max: number) => z.coerce.number().finite().min(0).max(max);
const optionalPct = (max: number) => z.union([z.null(), pct(max)]);
const optionalDays = z.union([z.null(), z.coerce.number().finite().min(0).max(730)]);
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional()
    .transform((value) => value ?? null);

const constitutionValues = CONSTITUTIONS.map((entry) => entry.value) as [Constitution, ...Constitution[]];

export const actualSchema = z.object({
  sales: amount,
  otherIncome: amount,
  openingStock: amount,
  purchases: amount,
  directExpenses: amount,
  closingStock: amount,
  salaries: amount,
  rent: amount,
  adminExpenses: amount,
  otherExpenses: amount,
  interest: amount,
  depreciation: amount,
  tax: amount,
  openingCapital: amount,
  capitalIntroduced: amount,
  drawings: amount,
  fixedAssets: amount,
  investments: amount,
  debtors: amount,
  cashAndBank: amount,
  otherCurrentAssets: amount,
  termLoan: amount,
  unsecuredLoans: amount,
  creditors: amount,
  otherCurrentLiabilities: amount,
});

export const projectionSchema = z.object({
  years: z.coerce.number().int().min(1).max(5),
  year1Sales: optionalAmount,
  salesGrowthPct: pct(200),
  materialCostPct: optionalPct(100),
  indirectExpensesYear1: optionalAmount,
  expenseGrowthPct: pct(200),
  otherIncomePerYear: optionalAmount,
  depreciationPct: pct(100),
  taxPct: pct(60),
  drawingsPerYear: amount,
  capitalIntroducedYear1: amount,
  newFixedAssets: amount,
  newTermLoan: amount,
  loanInterestPct: pct(40),
  loanTenureYears: z.coerce.number().int().min(1).max(30),
  existingLoanRepaymentPerYear: amount,
  existingLoanInterestPct: pct(40),
  debtorDays: optionalDays,
  creditorDays: optionalDays,
  stockDays: optionalDays,
  // Loan scheme fields came later; defaults keep older saved sheets and
  // callers valid.
  scheme: z.enum(["none", "cmyuva", "mysy", "pmegp", "pmfme", "mudra", "other"]).default("none"),
  schemeSector: z.enum(["manufacturing", "service", "trading"]).default("manufacturing"),
  schemeArea: z.enum(["urban", "rural"]).default("urban"),
  schemeCategory: z.enum(["general", "special"]).default("general"),
  workingCapitalNeed: amount.default(0),
  ccLimit: amount.default(0),
  ccInterestPct: pct(40).default(10),
  subsidyAmount: amount.default(0),
  interestSubventionPct: pct(100).default(0),
  interestSubventionYears: z.coerce.number().int().min(0).max(10).default(0),
});

export const balanceSheetSchema = z.object({
  businessName: z.string().trim().min(2, "Business ka naam bharein").max(160),
  ownerName: z.string().trim().min(2, "Owner ka naam bharein").max(160),
  constitution: z.enum(constitutionValues),
  natureOfBusiness: text(200),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === "" || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value), "PAN aisa hona chahiye: ABCDE1234F")
    .transform((value) => value || null)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === "" || /^[0-9]{2}[A-Z0-9]{13}$/.test(value), "GSTIN 15 character ka hona chahiye")
    .transform((value) => value || null)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  udyamNumber: text(40),
  address: text(400),
  city: text(80),
  state: text(80),
  pincode: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[1-9][0-9]{5}$/.test(value), "Pincode 6 digit ka hona chahiye")
    .transform((value) => value || null)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  mobile: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[6-9][0-9]{9}$/.test(value), "Mobile 10 digit ka hona chahiye")
    .transform((value) => value || null)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.email().safeParse(value).success, "Sahi email bharein")
    .transform((value) => value || null)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  bankName: text(120),
  loanPurpose: text(300),
  loanAmount: z.union([z.null(), z.literal("").transform(() => null), amount]).optional().transform((value) => value ?? null),
  baseYear: z.coerce.number().int().min(2000).max(2100),
  hasActual: z.boolean(),
  actual: actualSchema,
  projection: projectionSchema,
  status: z.enum(["draft", "final"]).default("draft"),
});

export type BalanceSheetInput = z.infer<typeof balanceSheetSchema>;

export function figuresOf(input: Pick<BalanceSheetInput, "baseYear" | "hasActual" | "constitution" | "actual" | "projection">): BalanceSheetFigures {
  return {
    baseYear: input.baseYear,
    hasActual: input.hasActual,
    constitution: input.constitution,
    actual: input.actual,
    projection: input.projection,
  };
}

/** The first problem in a failed parse, worded for a person. */
export function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Form check karein.";
  const field = issue.path.join(" › ");
  return field ? `${field}: ${issue.message}` : issue.message;
}
