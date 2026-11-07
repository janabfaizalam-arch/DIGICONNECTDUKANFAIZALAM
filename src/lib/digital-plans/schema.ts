import { z } from "zod";

import { ADDON_UNITS, ENQUIRY_STATUSES, FEATURE_GROUPS } from "./types";

/**
 * Input validation for the admin panel and the public enquiry form. Money
 * arrives as integer paise; the admin form converts rupees before sending.
 */

const slug = z
  .string()
  .trim()
  .min(2, "Slug is too short.")
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.");

const paise = z.number().int("Amount must be in whole paise.").min(0, "Amount cannot be negative.").max(10_000_000_000);

const shortText = (max: number) => z.string().trim().max(max);

export const planFeatureSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/, "Feature keys use lowercase letters, numbers and underscores."),
  label: shortText(160).min(2, "Feature text is required."),
  compareLabel: shortText(80).min(2, "Comparison label is required."),
  value: shortText(40).nullable(),
  group: z.enum(FEATURE_GROUPS.map((group) => group.id) as [string, ...string[]]),
  highlight: z.boolean(),
});

export const planInputSchema = z
  .object({
    slug,
    name: shortText(60).min(2, "Name is required."),
    tagline: shortText(200),
    description: shortText(1000),
    bestFor: shortText(300),
    monthlyPricePaise: paise,
    setupFeePaise: paise,
    priceIsStarting: z.boolean(),
    commitmentMonths: z.number().int().min(0).max(60),
    isRecommended: z.boolean(),
    isActive: z.boolean(),
    featuredOnHomepage: z.boolean(),
    features: z.array(planFeatureSchema).max(60),
    limits: z.array(z.object({ label: shortText(80).min(1), value: shortText(300).min(1) })).max(20),
    exclusions: z.array(shortText(200).min(1)).max(20),
    maintenance: shortText(1500),
    terms: shortText(4000),
    faqs: z.array(z.object({ question: shortText(200).min(3), answer: shortText(1500).min(3) })).max(20),
    addonSlugs: z.array(slug).max(30),
  })
  .superRefine((plan, ctx) => {
    const seen = new Set<string>();
    plan.features.forEach((feature, index) => {
      if (seen.has(feature.key)) {
        ctx.addIssue({ code: "custom", path: ["features", index, "key"], message: `Feature key "${feature.key}" is used twice.` });
      }
      seen.add(feature.key);
    });
  });

export type PlanInput = z.infer<typeof planInputSchema>;

export const addonInputSchema = z.object({
  slug,
  name: shortText(80).min(2, "Name is required."),
  description: shortText(400),
  pricePaise: paise,
  unit: z.enum(ADDON_UNITS),
  priceIsStarting: z.boolean(),
  note: shortText(300).nullable(),
  isActive: z.boolean(),
});

export type AddonInput = z.infer<typeof addonInputSchema>;

const indianMobile = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
  .refine((value) => /^[6-9]\d{9}$/.test(value), "Enter a valid 10-digit Indian mobile number.");

export const enquiryInputSchema = z.object({
  planSlug: slug,
  name: shortText(80).min(2, "Please enter your name."),
  mobile: indianMobile,
  email: z
    .string()
    .trim()
    .max(120)
    .refine((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Enter a valid email address.")
    .transform((value) => value || null),
  businessName: shortText(120).transform((value) => value || null),
  requirements: shortText(2000).transform((value) => value || null),
  addonSlugs: z.array(slug).max(20).default([]),
  /** Honeypot: real people never fill it. */
  website: z.string().max(0).optional().default(""),
});

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;

export const quoteInputSchema = z.object({
  monthlyPaise: paise,
  setupPaise: paise,
  lines: z
    .array(z.object({ label: shortText(120).min(2), amountPaise: paise, unit: z.enum(ADDON_UNITS) }))
    .max(20),
  gstPercent: z.number().min(0).max(28),
  commitmentMonths: z.number().int().min(0).max(60),
  notes: shortText(3000).transform((value) => value || null),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;

export const enquiryUpdateSchema = z.object({
  status: z.enum(ENQUIRY_STATUSES).optional(),
  adminNotes: shortText(3000).nullable().optional(),
});

export const approvalSchema = z.object({
  name: shortText(80).min(2, "Please type your full name to approve."),
  agree: z.literal(true, { message: "Please confirm you agree to the quotation and terms." }),
});

/** The first error message, for a form that shows one line. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the details and try again.";
}
