import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { safeCurrency, safeDate } from "@/lib/admin-format";

export const insuranceQuotationStatuses = ["draft", "sent", "accepted", "rejected", "expired"] as const;
export const vehicleTypes = ["Two Wheeler", "Four Wheeler", "Commercial", "Auto", "Other"] as const;
export const fuelTypes = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"] as const;
export const insuranceTypes = ["Third Party", "Comprehensive", "Own Damage"] as const;

export type InsuranceQuotationStatus = (typeof insuranceQuotationStatuses)[number];

export type InsuranceQuotation = {
  id: string;
  quote_number: string;
  customer_name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  vehicle_type: string;
  vehicle_number: string;
  make: string | null;
  model: string | null;
  variant: string | null;
  fuel_type: string | null;
  registration_year: string | null;
  previous_policy_expiry: string | null;
  ncb: string | null;
  idv_amount: number | null;
  insurance_type: string;
  policy_duration: string | null;
  insurer_company: string | null;
  premium_amount: number;
  gst_amount: number;
  total_amount: number;
  addons: string | null;
  documents_required: string | null;
  notes: string | null;
  valid_till: string;
  status: InsuranceQuotationStatus;
  public_token: string;
  created_at: string;
  updated_at: string;
};

export type InsuranceQuotationPayload = Omit<InsuranceQuotation, "id" | "quote_number" | "public_token" | "created_at" | "updated_at">;

const quotationSelect = `
  id, quote_number, customer_name, mobile, email, address, vehicle_type, vehicle_number, make, model, variant,
  fuel_type, registration_year, previous_policy_expiry, ncb, idv_amount, insurance_type, policy_duration,
  insurer_company, premium_amount, gst_amount, total_amount, addons, documents_required, notes, valid_till,
  status, public_token, created_at, updated_at
`;

export function formatInsuranceCurrency(value: number | string | null | undefined) {
  return safeCurrency(value);
}

export function formatInsuranceDate(value: string | null | undefined) {
  return safeDate(value, "Not specified");
}

/**
 * The link a customer is sent.
 *
 * The fallback used to be digiconnectdukan.com — a domain this business does
 * not run. With `NEXT_PUBLIC_SITE_URL` unset, every quotation ever shared
 * pointed at nothing, and nothing in the flow would have said so.
 */
export function getInsuranceQuotationPublicUrl(publicToken: string) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in").replace(/\/$/, "");

  return `${siteUrl}/insurance-quotation/${publicToken}`;
}


/* ─────────────────────────────────────────────────────────────────────────
   The arithmetic
   ───────────────────────────────────────────────────────────────────────── */

/**
 * GST on a motor insurance premium.
 *
 * Eighteen per cent, and it was being typed by hand on every quotation along
 * with the total — three independent numbers where there is really only one.
 * A slip in any of them sends a customer a figure the shop cannot honour, and
 * nothing in the form ever checked that they agreed.
 */
export const INSURANCE_GST_RATE = 0.18;

/** Rounded to the paisa, so two computations of the same premium always match. */
function toPaise(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeGst(premium: number, rate = INSURANCE_GST_RATE): number {
  if (!Number.isFinite(premium) || premium <= 0) return 0;
  return toPaise(premium * rate);
}

export function computeTotal(premium: number, gst: number): number {
  const base = Number.isFinite(premium) ? premium : 0;
  const tax = Number.isFinite(gst) ? gst : 0;
  return toPaise(base + tax);
}

/**
 * Whether the three figures on a quotation agree.
 *
 * A rupee of slack, because a hand-entered GST rounded differently is a
 * rounding difference and not a mistake — but ₹4,500 against ₹45,000 is.
 */
export function totalsAgree(premium: number, gst: number, total: number, tolerance = 1): boolean {
  return Math.abs(computeTotal(premium, gst) - total) <= tolerance;
}

/* ─────────────────────────────────────────────────────────────────────────
   Validity
   ───────────────────────────────────────────────────────────────────────── */

/** How long a quotation is offered for, when nobody says otherwise. */
export const DEFAULT_VALIDITY_DAYS = 15;

/** An ISO date `n` days out, in the timezone the shop actually works in. */
export function isoDateInDays(days: number, from = new Date()): string {
  const target = new Date(from.getTime() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(target);
}

export function defaultValidTill(): string {
  return isoDateInDays(DEFAULT_VALIDITY_DAYS);
}

/** Whole days left before the offer lapses. Negative once it has. */
export function daysUntilExpiry(validTill: string | null | undefined, now = new Date()): number | null {
  if (!validTill) return null;
  const end = Date.parse(`${validTill}T23:59:59+05:30`);
  if (!Number.isFinite(end)) return null;
  return Math.ceil((end - now.getTime()) / 86_400_000);
}

/**
 * The status a customer should actually see.
 *
 * `status` is set by hand and nothing ever moved a quotation to "expired", so
 * a quote whose validity ran out in March still greeted its customer as
 * "Sent" — with a premium the shop could no longer honour. Expiry is a fact
 * about the date, so it is derived from the date. A quotation already
 * accepted or rejected keeps that outcome: those happened, and a lapsed date
 * does not undo them.
 */
export function effectiveStatus(
  quote: Pick<InsuranceQuotation, "status" | "valid_till">,
  now = new Date(),
): InsuranceQuotationStatus {
  if (quote.status === "accepted" || quote.status === "rejected") return quote.status;
  const left = daysUntilExpiry(quote.valid_till, now);
  return left !== null && left < 0 ? "expired" : quote.status;
}

export function createInsuranceQuotationWhatsappText(quote: Pick<InsuranceQuotation, "customer_name" | "quote_number" | "total_amount" | "valid_till" | "public_token">) {
  const link = getInsuranceQuotationPublicUrl(quote.public_token);

  return [
    "I need help regarding this vehicle insurance quotation.",
    `Customer: ${quote.customer_name}`,
    `Quotation No: ${quote.quote_number}`,
    `Quotation Link: ${link}`,
    `Total Payable: ${formatInsuranceCurrency(quote.total_amount)}`,
    `Valid Till: ${formatInsuranceDate(quote.valid_till)}`,
  ].join("\n");
}

export function normalizeInsuranceQuotationStatus(value: FormDataEntryValue | string | null | undefined): InsuranceQuotationStatus {
  const status = String(value ?? "draft").trim().toLowerCase();

  return insuranceQuotationStatuses.includes(status as InsuranceQuotationStatus) ? (status as InsuranceQuotationStatus) : "draft";
}

export function createPublicToken() {
  return crypto.randomUUID().replaceAll("-", "");
}

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableTextValue(formData: FormData, key: string) {
  const value = textValue(formData, key);

  return value || null;
}

function nullableNumberValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  if (!value) return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function requiredNumberValue(formData: FormData, key: string) {
  const number = Number(textValue(formData, key));

  return Number.isFinite(number) ? number : null;
}

export function buildInsuranceQuotationPayload(formData: FormData) {
  const customerName = textValue(formData, "customer_name");
  const mobile = textValue(formData, "mobile");
  const vehicleType = textValue(formData, "vehicle_type");
  const vehicleNumber = textValue(formData, "vehicle_number").toUpperCase();
  const insuranceType = textValue(formData, "insurance_type");
  const premiumAmount = requiredNumberValue(formData, "premium_amount");
  const validTill = textValue(formData, "valid_till") || defaultValidTill();

  if (!customerName || !mobile || !vehicleType || !vehicleNumber || !insuranceType || premiumAmount === null || !validTill) {
    return {
      error: "Customer name, mobile, vehicle type, vehicle number, insurance type, premium amount, and valid till date are required.",
      payload: null,
    };
  }

  if (premiumAmount <= 0) {
    return { error: "Premium amount must be greater than zero.", payload: null };
  }

  /*
    GST and the total are derived when they are not given. They used to be
    three independent hand-typed numbers, and nothing checked that they added
    up — a mistyped total is a figure the shop then has to honour or retract
    in front of the customer.
  */
  const gstEntered = nullableNumberValue(formData, "gst_amount");
  const gstAmount = gstEntered ?? computeGst(premiumAmount);
  const totalEntered = requiredNumberValue(formData, "total_amount");
  const totalAmount = totalEntered ?? computeTotal(premiumAmount, gstAmount);

  if (!totalsAgree(premiumAmount, gstAmount, totalAmount)) {
    return {
      error: `Premium ${formatInsuranceCurrency(premiumAmount)} + GST ${formatInsuranceCurrency(gstAmount)} is ${formatInsuranceCurrency(computeTotal(premiumAmount, gstAmount))}, but the total says ${formatInsuranceCurrency(totalAmount)}. Fix one of the three before saving.`,
      payload: null,
    };
  }

  return {
    error: null,
    payload: {
      customer_name: customerName,
      mobile,
      email: nullableTextValue(formData, "email"),
      address: nullableTextValue(formData, "address"),
      vehicle_type: vehicleType,
      vehicle_number: vehicleNumber,
      make: nullableTextValue(formData, "make"),
      model: nullableTextValue(formData, "model"),
      variant: nullableTextValue(formData, "variant"),
      fuel_type: nullableTextValue(formData, "fuel_type"),
      registration_year: nullableTextValue(formData, "registration_year"),
      previous_policy_expiry: nullableTextValue(formData, "previous_policy_expiry"),
      ncb: nullableTextValue(formData, "ncb"),
      idv_amount: nullableNumberValue(formData, "idv_amount"),
      insurance_type: insuranceType,
      policy_duration: nullableTextValue(formData, "policy_duration"),
      insurer_company: nullableTextValue(formData, "insurer_company"),
      premium_amount: premiumAmount,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      addons: nullableTextValue(formData, "addons"),
      documents_required: nullableTextValue(formData, "documents_required"),
      notes: nullableTextValue(formData, "notes"),
      valid_till: validTill,
      status: normalizeInsuranceQuotationStatus(formData.get("status")),
    } satisfies InsuranceQuotationPayload,
  };
}

export async function generateInsuranceQuoteNumber() {
  const datePart = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("-", "");
  const prefix = `DCD-INS-${datePart}`;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return `${prefix}-0001`;
  }

  let count = 0;

  try {
    const result = await supabase
      .from("insurance_quotations")
      .select("id", { count: "exact", head: true })
      .like("quote_number", `${prefix}-%`);
    count = result.error ? 0 : result.count ?? 0;
  } catch (error) {
    console.error("[insurance-quotations] Failed to count quote numbers", error);
  }
  const nextNumber = String((count ?? 0) + 1).padStart(4, "0");

  return `${prefix}-${nextNumber}`;
}

export async function getAdminInsuranceQuotations() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("insurance_quotations")
      .select(quotationSelect)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[insurance-quotations] Failed to fetch admin quotations", error);
      return [];
    }

    return (data ?? []) as InsuranceQuotation[];
  } catch (error) {
    console.error("[insurance-quotations] Failed to fetch admin quotations", error);
    return [];
  }
}

export async function getPublicInsuranceQuotation(quoteId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  /*
    By token only. It used to accept the row id as well, which made the
    unguessable token pointless: anyone holding a quotation's UUID — from an
    admin screenshot, a log line, an API response — could open the customer's
    quotation, with their name, mobile and address on it.
  */
  const safeToken = quoteId.replace(/[^a-zA-Z0-9-]/g, "");
  if (!safeToken) return null;

  try {
    const { data, error } = await supabase
      .from("insurance_quotations")
      .select(quotationSelect)
      .eq("public_token", safeToken)
      .maybeSingle();

    if (error) {
      console.error("[insurance-quotations] Failed to fetch public quotation", error);
      return null;
    }

    return data as InsuranceQuotation | null;
  } catch (error) {
    console.error("[insurance-quotations] Failed to fetch public quotation", error);
    return null;
  }
}


/**
 * A customer accepting their own quotation.
 *
 * The "Accept Quotation" button used to open WhatsApp with exactly the same
 * message as the button beside it — two controls, one behaviour, and nothing
 * recorded anywhere. Acceptance is a fact worth keeping: the shop needs to
 * know which quotes converted, and the customer needs to see that their tap
 * did something.
 *
 * Keyed on the public token, never the row id, and it refuses a quotation
 * that has lapsed — accepting a price the shop can no longer honour helps
 * nobody. Already-accepted is not an error; the customer tapped twice.
 */
export async function acceptInsuranceQuotation(
  publicToken: string,
): Promise<{ ok: boolean; status?: InsuranceQuotationStatus; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Quotations are not configured on the server." };

  const safeToken = publicToken.replace(/[^a-zA-Z0-9-]/g, "");
  if (!safeToken) return { ok: false, error: "That quotation link is not valid." };

  const { data: quote, error: readError } = await supabase
    .from("insurance_quotations")
    .select("id, status, valid_till, quote_number, customer_name")
    .eq("public_token", safeToken)
    .maybeSingle();

  if (readError) return { ok: false, error: "That quotation could not be read." };
  if (!quote) return { ok: false, error: "That quotation was not found." };

  const current = effectiveStatus(quote as Pick<InsuranceQuotation, "status" | "valid_till">);
  if (current === "accepted") return { ok: true, status: "accepted" };
  if (current === "expired") {
    return { ok: false, error: "This quotation has expired. Please ask us for a fresh one." };
  }
  if (current === "rejected") {
    return { ok: false, error: "This quotation was already closed. Please ask us for a fresh one." };
  }

  const { error: writeError } = await supabase
    .from("insurance_quotations")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("public_token", safeToken);

  if (writeError) return { ok: false, error: "Your acceptance could not be saved. Please try again." };

  return { ok: true, status: "accepted" };
}
