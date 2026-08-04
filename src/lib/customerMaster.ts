import "server-only";

import {
  CUSTOMER_MASTER_HEADERS,
  CUSTOMER_MASTER_SHEET,
  findSheetRowByKey,
  upsertSheetRow,
} from "@/lib/googleSheets";
import { loadGoogleSheetsConfig } from "@/lib/google";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function normalizeMobile(input: string | null | undefined): string {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function buildCustomerCode(mobileLocal: string, customerUuid?: string | null): string {
  const mobile = normalizeMobile(mobileLocal);
  if (/^[6-9]\d{9}$/.test(mobile)) {
    return `C-${mobile}`;
  }
  const seed = String(customerUuid ?? "")
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase();
  return seed ? `C-${seed}` : `C-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Ensure a durable Customer ID (customer_code). Reuses existing row by mobile when possible.
 */
export async function ensureCustomerCode(options: {
  customerId?: string | null;
  mobile?: string | null;
  name?: string | null;
}): Promise<{ ok: true; customerCode: string; customerId: string | null } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Supabase admin unavailable" };

  const mobile = normalizeMobile(options.mobile);
  let customerId = options.customerId ?? null;

  if (!customerId && mobile) {
    const { data: byMobile } = await supabase
      .from("customers")
      .select("id, customer_code, mobile")
      .or(`mobile.eq.${mobile},phone.eq.${mobile}`)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (byMobile?.id) customerId = byMobile.id;
    if (byMobile?.customer_code) {
      return { ok: true, customerCode: String(byMobile.customer_code), customerId };
    }
  }

  if (customerId) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id, customer_code, mobile")
      .eq("id", customerId)
      .maybeSingle();
    if (existing?.customer_code) {
      return { ok: true, customerCode: String(existing.customer_code), customerId };
    }
    const code = buildCustomerCode(existing?.mobile || mobile, customerId);
    const { error } = await supabase.from("customers").update({ customer_code: code }).eq("id", customerId);
    if (error) {
      // Unique race: another row may already own C-mobile
      const { data: raced } = await supabase
        .from("customers")
        .select("id, customer_code")
        .eq("customer_code", code)
        .maybeSingle();
      if (raced?.customer_code) {
        return { ok: true, customerCode: String(raced.customer_code), customerId: raced.id };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true, customerCode: code, customerId };
  }

  // No customers row — still emit a stable code from mobile for Sheets.
  if (mobile) {
    return { ok: true, customerCode: buildCustomerCode(mobile), customerId: null };
  }

  return { ok: false, error: "Unable to resolve customer code without mobile or customer id" };
}

export async function upsertCustomerMasterRow(input: {
  customerCode: string;
  name: string;
  mobile: string;
  address: string;
  city: string;
  district: string;
  state: string;
  totalWorks: number;
  lifetimeValue: number;
  lastVisit: string;
  customerId?: string | null;
}): Promise<{ ok: true; rowNumber: number } | { ok: false; error: string }> {
  const loaded = loadGoogleSheetsConfig();
  if (!loaded.ok) return { ok: false, error: loaded.error };

  const supabase = getSupabaseAdmin();
  let rowNumber: number | null = null;

  if (supabase) {
    const { data: mapped } = await supabase
      .from("crm_sheet_row_map")
      .select("row_number")
      .eq("spreadsheet_id", loaded.config.spreadsheetId)
      .eq("sheet_name", CUSTOMER_MASTER_SHEET)
      .eq("entity_type", "customer_master")
      .eq("entity_key", input.customerCode)
      .maybeSingle();
    rowNumber = mapped?.row_number ?? null;
  }

  if (!rowNumber) {
    const found = await findSheetRowByKey(CUSTOMER_MASTER_SHEET, "Customer ID", input.customerCode);
    if (!found.ok) return { ok: false, error: found.error };
    rowNumber = found.rowNumber;
  }

  const values = [
    input.customerCode,
    input.name,
    input.mobile,
    input.address,
    input.city,
    input.district,
    input.state,
    String(input.totalWorks),
    String(input.lifetimeValue),
    input.lastVisit,
  ];

  const upserted = await upsertSheetRow({
    sheetName: CUSTOMER_MASTER_SHEET,
    headers: CUSTOMER_MASTER_HEADERS,
    values,
    rowNumber,
  });
  if (!upserted.ok) return upserted;

  let finalRow = upserted.rowNumber;
  if (!finalRow) {
    const found = await findSheetRowByKey(CUSTOMER_MASTER_SHEET, "Customer ID", input.customerCode);
    if (found.ok && found.rowNumber) finalRow = found.rowNumber;
  }

  if (supabase && finalRow) {
    await supabase.from("crm_sheet_row_map").upsert(
      {
        entity_type: "customer_master",
        entity_key: input.customerCode,
        sheet_name: CUSTOMER_MASTER_SHEET,
        row_number: finalRow,
        spreadsheet_id: loaded.config.spreadsheetId,
        customer_id: input.customerId ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "spreadsheet_id,sheet_name,entity_type,entity_key" },
    );
  }

  return { ok: true, rowNumber: finalRow || 0 };
}
