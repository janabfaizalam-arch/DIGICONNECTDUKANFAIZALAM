import "server-only";

import { buildStatements, defaultProjection, emptyActual, type Constitution } from "@/lib/balance-sheets/engine";
import { figuresOf, type BalanceSheetInput } from "@/lib/balance-sheets/schema";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type BalanceSheetRecord = BalanceSheetInput & {
  id: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
};

export type BalanceSheetListItem = {
  id: string;
  reference: string;
  businessName: string;
  ownerName: string;
  mobile: string | null;
  baseYear: number;
  hasActual: boolean;
  status: "draft" | "final";
  updatedAt: string;
};

type Row = Record<string, unknown>;

const LIST_COLUMNS = "id, serial_no, business_name, owner_name, mobile, base_year, has_actual, status, updated_at";

export function referenceFor(serial: unknown) {
  return `DIGI-BS-${String(serial ?? 0).padStart(5, "0")}`;
}

function rowToRecord(row: Row): BalanceSheetRecord {
  const figures = (row.figures ?? {}) as { actual?: Partial<BalanceSheetInput["actual"]>; projection?: Partial<BalanceSheetInput["projection"]> };
  return {
    id: String(row.id),
    reference: referenceFor(row.serial_no),
    businessName: String(row.business_name ?? ""),
    ownerName: String(row.owner_name ?? ""),
    constitution: (row.constitution as Constitution) ?? "proprietorship",
    natureOfBusiness: (row.nature_of_business as string | null) ?? null,
    pan: (row.pan as string | null) ?? null,
    gstin: (row.gstin as string | null) ?? null,
    udyamNumber: (row.udyam_number as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    pincode: (row.pincode as string | null) ?? null,
    mobile: (row.mobile as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    bankName: (row.bank_name as string | null) ?? null,
    loanPurpose: (row.loan_purpose as string | null) ?? null,
    loanAmount: row.loan_amount === null || row.loan_amount === undefined ? null : Number(row.loan_amount),
    baseYear: Number(row.base_year),
    hasActual: Boolean(row.has_actual),
    actual: { ...emptyActual(), ...(figures.actual ?? {}) },
    projection: { ...defaultProjection(), ...(figures.projection ?? {}) },
    status: row.status === "final" ? "final" : "draft",
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function inputToRow(input: BalanceSheetInput) {
  return {
    business_name: input.businessName,
    owner_name: input.ownerName,
    constitution: input.constitution,
    nature_of_business: input.natureOfBusiness,
    pan: input.pan,
    gstin: input.gstin,
    udyam_number: input.udyamNumber,
    address: input.address,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    mobile: input.mobile,
    email: input.email,
    bank_name: input.bankName,
    loan_purpose: input.loanPurpose,
    loan_amount: input.loanAmount,
    base_year: input.baseYear,
    has_actual: input.hasActual,
    figures: { version: 1, actual: input.actual, projection: input.projection },
    status: input.status,
  };
}

/**
 * A sheet can only be final when its actual year tallies. Checked here, on the
 * server, so a final PDF never goes to a bank with figures that do not agree.
 */
export function finalBlocker(input: BalanceSheetInput) {
  if (input.status !== "final") return null;
  const statements = buildStatements(figuresOf(input));
  return statements.tallies ? null : "The actual year does not tally, so this sheet cannot be marked final. Save it as a draft and correct the figures.";
}

export async function listBalanceSheets({ query = "", status = "all" }: { query?: string; status?: string } = {}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as BalanceSheetListItem[];

  let request = supabase.from("balance_sheets").select(LIST_COLUMNS).order("updated_at", { ascending: false }).limit(200);
  if (status === "draft" || status === "final") request = request.eq("status", status);
  const q = query.trim().replace(/[%,()]/g, " ").trim();
  if (q) {
    const serial = /^(?:DIGI-BS-)?0*(\d+)$/i.exec(q)?.[1];
    request = serial
      ? request.eq("serial_no", Number(serial))
      : request.or(`business_name.ilike.%${q}%,owner_name.ilike.%${q}%,mobile.ilike.%${q}%`);
  }

  const { data, error } = await request;
  if (error) {
    console.error("[balance-sheets] list failed", error.message);
    return [] as BalanceSheetListItem[];
  }

  return (data ?? []).map((row: Row) => ({
    id: String(row.id),
    reference: referenceFor(row.serial_no),
    businessName: String(row.business_name ?? ""),
    ownerName: String(row.owner_name ?? ""),
    mobile: (row.mobile as string | null) ?? null,
    baseYear: Number(row.base_year),
    hasActual: Boolean(row.has_actual),
    status: row.status === "final" ? ("final" as const) : ("draft" as const),
    updatedAt: String(row.updated_at ?? ""),
  }));
}

export async function getBalanceSheet(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase.from("balance_sheets").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return rowToRecord(data as Row);
}

export async function createBalanceSheet(input: BalanceSheetInput, userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, message: "The database is not configured on this server." };
  const { data, error } = await supabase
    .from("balance_sheets")
    .insert({ ...inputToRow(input), created_by: userId, updated_by: userId })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[balance-sheets] create failed", error?.message);
    return { ok: false as const, message: "The balance sheet could not be saved." };
  }
  return { ok: true as const, id: String(data.id) };
}

export async function updateBalanceSheet(id: string, input: BalanceSheetInput, userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, message: "The database is not configured on this server." };
  const { data, error } = await supabase
    .from("balance_sheets")
    .update({ ...inputToRow(input), updated_by: userId })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[balance-sheets] update failed", error.message);
    return { ok: false as const, message: "The balance sheet could not be saved." };
  }
  if (!data) return { ok: false as const, message: "Balance sheet not found." };
  return { ok: true as const, id };
}

export async function deleteBalanceSheet(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { error } = await supabase.from("balance_sheets").delete().eq("id", id);
  if (error) console.error("[balance-sheets] delete failed", error.message);
  return !error;
}
