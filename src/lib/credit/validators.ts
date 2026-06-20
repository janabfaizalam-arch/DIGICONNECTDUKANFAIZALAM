// ============================================================
// Credit Module — Zod Validation Schemas
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import { z } from "zod";

/** PAN card format: 5 uppercase letters, 4 digits, 1 uppercase letter */
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Indian mobile number: 10 digits starting with 6-9 */
export const MOBILE_REGEX = /^[6-9]\d{9}$/;

/** Validate age is 18+ */
function isAtLeast18(dob: string): boolean {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 18;
}

/** Validate DOB is not in the future */
function isNotFutureDate(dob: string): boolean {
  return new Date(dob) < new Date();
}

/** Credit report request validation schema */
export const creditReportRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .max(100, "Full name must be under 100 characters")
    .regex(/^[a-zA-Z\s.'-]+$/, "Full name can only contain letters, spaces, dots, hyphens, and apostrophes"),

  mobile: z
    .string()
    .trim()
    .transform((val) => val.replace(/\D/g, ""))
    .pipe(
      z
        .string()
        .regex(MOBILE_REGEX, "Please enter a valid 10-digit Indian mobile number"),
    ),

  pan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PAN_REGEX, "Please enter a valid PAN number (e.g., ABCDE1234F)"),

  dob: z
    .string()
    .trim()
    .refine(isNotFutureDate, "Date of birth cannot be in the future")
    .refine(isAtLeast18, "You must be at least 18 years old"),

  consent: z
    .boolean()
    .refine((val) => val === true, "You must provide consent to check your credit score"),

  packageType: z.enum(["score_check", "report_pdf", "premium"]),
});

/** Type inferred from the Zod schema */
export type CreditReportRequestInput = z.infer<typeof creditReportRequestSchema>;

/** Payment verification schema */
export const creditPaymentVerifySchema = z.object({
  razorpay_payment_id: z
    .string()
    .trim()
    .min(1, "Payment ID is required"),

  razorpay_order_id: z
    .string()
    .trim()
    .min(1, "Order ID is required"),

  razorpay_signature: z
    .string()
    .trim()
    .min(1, "Signature is required"),

  credit_report_id: z
    .string()
    .trim()
    .uuid("Invalid credit report ID"),
});

/** Type inferred from payment verify schema */
export type CreditPaymentVerifyInput = z.infer<typeof creditPaymentVerifySchema>;

/** Order creation schema */
export const creditOrderCreateSchema = z.object({
  packageType: z.enum(["score_check", "report_pdf", "premium"]),
  creditReportId: z
    .string()
    .trim()
    .uuid("Invalid credit report ID"),
});

/** Type inferred from order creation schema */
export type CreditOrderCreateInput = z.infer<typeof creditOrderCreateSchema>;

/** Admin search/filter schema */
export const creditAdminFilterSchema = z.object({
  search: z.string().trim().max(50).optional(),
  status: z.enum(["pending", "payment_pending", "payment_verified", "processing", "completed", "failed", "expired"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Sanitize PAN for logging — never log full PAN */
export function sanitizePanForLog(pan: string): string {
  if (!pan || pan.length < 4) return "***";
  const upperPan = pan.toUpperCase();
  return `${upperPan.slice(0, 2)}****${upperPan.slice(-2)}`;
}

/**
 * -------------------------------------------------------------
 * Unifers Response Validation Schemas (Runtime validation)
 * -------------------------------------------------------------
 */

/** Unifers Credit Info API Response schema validation */
export const unifersCreditInfoResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    totalUnusedCredit: z.number(),
  }),
});

/** Unifers CIBIL API Response schema validation */
export const unifersCibilResponseSchema = z.object({
  data: z.object({
    currentCredit: z.number(),
    creditUsed: z.number(),
    result: z.object({
      reportUrl: z.string().min(1),
      webUrl: z.string().optional(),
      data: z.any(), // Flexible for raw JSON
    }),
    refId: z.string().min(1),
  }),
});

/** Unifers CRIF API Response schema validation */
export const unifersCrifResponseSchema = z.object({
  data: z.object({
    currentCredit: z.number(),
    creditUsed: z.number(),
    result: z.object({
      HEADER: z.object({
        "DATE-OF-REQUEST": z.string(),
        "DATE-OF-ISSUE": z.string(),
        "REPORT-ID": z.string(),
        "BATCH-ID": z.string(),
        "INQUIRY-ID": z.string().optional().nullable(),
      }),
    }).passthrough(),
  }),
});

/** Format validation errors into user-friendly messages */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}
