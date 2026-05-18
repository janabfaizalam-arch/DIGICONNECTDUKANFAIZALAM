import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type OfflineInvoicePaymentStatus = "Pending" | "Paid" | "Partial";
export type OfflineInvoicePaymentMethod = "Cash" | "UPI" | "Razorpay" | "Bank Transfer" | "Card";

export type OfflineInvoice = {
  id: string;
  invoice_number: string;
  customer_name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gst_number: string | null;
  service_name: string;
  service_category: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_percent: number;
  extra_charges: number;
  total_amount: number;
  payment_status: OfflineInvoicePaymentStatus;
  payment_method: OfflineInvoicePaymentMethod;
  amount_paid: number;
  balance_due: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OfflineInvoiceFilters = {
  query?: string;
  status?: string;
};

const paymentStatuses = new Set(["Pending", "Paid", "Partial"]);
const paymentMethods = new Set(["Cash", "UPI", "Razorpay", "Bank Transfer", "Card"]);

function numeric(value: unknown, fallback = 0) {
  const amount = Number(value ?? fallback);
  return Number.isFinite(amount) ? amount : fallback;
}

export function normalizeOfflineInvoiceMobile(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "").trim();
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function calculateOfflineInvoiceTotal(input: {
  quantity: unknown;
  unit_price: unknown;
  discount: unknown;
  tax_percent: unknown;
  extra_charges: unknown;
}) {
  const quantity = Math.max(numeric(input.quantity, 1), 0);
  const unitPrice = Math.max(numeric(input.unit_price), 0);
  const discount = Math.max(numeric(input.discount), 0);
  const taxPercent = Math.max(numeric(input.tax_percent), 0);
  const extraCharges = Math.max(numeric(input.extra_charges), 0);
  const taxable = Math.max(quantity * unitPrice - discount, 0);
  const taxAmount = (taxable * taxPercent) / 100;

  return Math.round((taxable + taxAmount + extraCharges) * 100) / 100;
}

export function normalizeOfflineInvoicePayload(input: Record<string, unknown>, createdBy?: string) {
  const quantity = Math.max(numeric(input.quantity, 1), 0);
  const unit_price = Math.max(numeric(input.unit_price), 0);
  const discount = Math.max(numeric(input.discount), 0);
  const tax_percent = Math.max(numeric(input.tax_percent), 0);
  const extra_charges = Math.max(numeric(input.extra_charges), 0);
  const total_amount = calculateOfflineInvoiceTotal({ quantity, unit_price, discount, tax_percent, extra_charges });
  const amount_paid = Math.max(numeric(input.amount_paid), 0);
  const payment_status = paymentStatuses.has(String(input.payment_status)) ? String(input.payment_status) : "Pending";
  const payment_method = paymentMethods.has(String(input.payment_method)) ? String(input.payment_method) : "Cash";

  return {
    customer_name: String(input.customer_name ?? input.customerName ?? "").trim(),
    mobile: normalizeOfflineInvoiceMobile(input.mobile),
    email: String(input.email ?? "").trim() || null,
    address: String(input.address ?? "").trim() || null,
    city: String(input.city ?? "").trim() || null,
    state: String(input.state ?? "").trim() || null,
    pincode: String(input.pincode ?? "").replace(/\D/g, "").trim() || null,
    gst_number: String(input.gst_number ?? input.gstNumber ?? "").trim().toUpperCase() || null,
    service_name: String(input.service_name ?? input.serviceName ?? "").trim(),
    service_category: String(input.service_category ?? input.serviceCategory ?? "").trim() || null,
    description: String(input.description ?? "").trim() || null,
    quantity,
    unit_price,
    discount,
    tax_percent,
    extra_charges,
    total_amount,
    payment_status,
    payment_method,
    amount_paid,
    balance_due: Math.max(Math.round((total_amount - amount_paid) * 100) / 100, 0),
    ...(createdBy ? { created_by: createdBy } : {}),
    updated_at: new Date().toISOString(),
  };
}

export function validateOfflineInvoicePayload(payload: ReturnType<typeof normalizeOfflineInvoicePayload>) {
  if (!payload.customer_name) return "Full name is required.";
  if (!payload.mobile) return "Mobile number is required.";
  if (payload.mobile.length < 10) return "Enter a valid mobile number.";
  if (!payload.service_name) return "Service name is required.";
  if (payload.quantity <= 0) return "Quantity must be greater than zero.";
  if (payload.unit_price <= 0) return "Unit price is required.";
  return null;
}

export async function getOfflineInvoices(filters: OfflineInvoiceFilters = {}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as OfflineInvoice[];

  let query = supabase.from("offline_invoices").select("*").order("created_at", { ascending: false }).limit(200);
  const search = String(filters.query ?? "").trim();
  const status = String(filters.status ?? "").trim();

  if (search) {
    const escaped = search.replace(/[%_]/g, "\\$&");
    query = query.or(`invoice_number.ilike.%${escaped}%,mobile.ilike.%${escaped}%,customer_name.ilike.%${escaped}%`);
  }

  if (status && status !== "all") {
    const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    query = query.eq("payment_status", normalizedStatus);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[offline-invoices] List failed", error.message);
    return [];
  }

  return (data ?? []) as OfflineInvoice[];
}

export async function getOfflineInvoice(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.from("offline_invoices").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[offline-invoices] Detail failed", error.message);
    return null;
  }

  return data as OfflineInvoice | null;
}

export async function createOrUpdateCrmCustomerFromOfflineInvoice(
  invoice: {
    customer_name: string;
    mobile: string;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    created_by?: string | null;
  },
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, message: "Supabase service role key is missing." };

  const mobile = normalizeOfflineInvoiceMobile(invoice.mobile);
  if (!mobile) return { ok: false, message: "Mobile number is required for CRM customer sync." };

  const basePayload = {
    full_name: invoice.customer_name,
    mobile,
    email: invoice.email ?? "",
    address: invoice.address ?? "",
    city: invoice.city ?? "",
    state: invoice.state ?? "",
    pincode: invoice.pincode ?? "",
    source: "offline",
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: readError } = await supabase
    .from("customers")
    .select("id, notes")
    .eq("mobile", mobile)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) return { ok: false, message: readError.message };

  if (existing?.id) {
    const { error } = await supabase.from("customers").update(basePayload).eq("id", existing.id);
    if (error) return { ok: false, message: error.message };
    return { ok: true, customerId: existing.id };
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      ...basePayload,
      created_by: invoice.created_by,
      notes: "Created from offline invoice.",
    })
    .select("id")
    .maybeSingle();

  if (error || !data) return { ok: false, message: error?.message ?? "CRM customer could not be created." };
  return { ok: true, customerId: data.id };
}
