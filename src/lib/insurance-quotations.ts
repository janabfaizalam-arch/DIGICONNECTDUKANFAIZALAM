import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatInsuranceDate(value: string | null | undefined) {
  if (!value) return "Not specified";

  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export function getInsuranceQuotationPublicUrl(publicToken: string) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://digiconnectdukan.com").replace(/\/$/, "");

  return `${siteUrl}/insurance-quotation/${publicToken}`;
}

export function createInsuranceQuotationWhatsappText(quote: Pick<InsuranceQuotation, "customer_name" | "total_amount" | "valid_till" | "public_token">) {
  const link = getInsuranceQuotationPublicUrl(quote.public_token);

  return [
    `Assalamu Alaikum / Namaste ${quote.customer_name},`,
    "Aapka vehicle insurance quotation ready hai.",
    `Quotation Link: ${link}`,
    `Total Payable: ${formatInsuranceCurrency(quote.total_amount)}`,
    `Valid Till: ${formatInsuranceDate(quote.valid_till)}`,
    "DigiConnect Dukan",
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
  const totalAmount = requiredNumberValue(formData, "total_amount");
  const validTill = textValue(formData, "valid_till");

  if (!customerName || !mobile || !vehicleType || !vehicleNumber || !insuranceType || premiumAmount === null || totalAmount === null || !validTill) {
    return {
      error: "Customer name, mobile, vehicle type, vehicle number, insurance type, premium amount, total payable amount, and valid till date are required.",
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
      gst_amount: nullableNumberValue(formData, "gst_amount") ?? 0,
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

  const { count } = await supabase
    .from("insurance_quotations")
    .select("id", { count: "exact", head: true })
    .like("quote_number", `${prefix}-%`);
  const nextNumber = String((count ?? 0) + 1).padStart(4, "0");

  return `${prefix}-${nextNumber}`;
}

export async function getAdminInsuranceQuotations() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("insurance_quotations")
    .select(quotationSelect)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[insurance-quotations] Failed to fetch admin quotations", error);
    return [];
  }

  return (data ?? []) as InsuranceQuotation[];
}

export async function getPublicInsuranceQuotation(quoteId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const safeQuoteId = quoteId.replace(/[^a-zA-Z0-9-]/g, "");
  const { data, error } = await supabase
    .from("insurance_quotations")
    .select(quotationSelect)
    .or(`public_token.eq.${safeQuoteId},id.eq.${safeQuoteId}`)
    .maybeSingle();

  if (error) {
    console.error("[insurance-quotations] Failed to fetch public quotation", error);
    return null;
  }

  return data as InsuranceQuotation | null;
}
