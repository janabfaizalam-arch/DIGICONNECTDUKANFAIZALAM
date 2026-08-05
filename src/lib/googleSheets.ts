import "server-only";

import { getGoogleAccessToken, loadGoogleSheetsConfig } from "@/lib/google";
import {
  CUSTOMER_MASTER_SHEET,
  CUSTOMER_WORK_SHEET,
  getSheetLayout as getBaseSheetLayout,
  isValidSheetDataRow,
  type SheetLayout as BaseSheetLayout,
} from "@/lib/googleSheetsLayout";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export {
  CUSTOMER_MASTER_FIRST_DATA_ROW,
  CUSTOMER_MASTER_HEADER_ROW,
  CUSTOMER_MASTER_SHEET,
  CUSTOMER_WORK_FIRST_DATA_ROW,
  CUSTOMER_WORK_HEADER_ROW,
  CUSTOMER_WORK_SHEET,
  isValidSheetDataRow,
} from "@/lib/googleSheetsLayout";

export const CUSTOMER_WORK_HEADERS = [
  "Work ID",
  "Customer ID",
  "Entry Date",
  "Customer Name",
  "Mobile",
  "Alternate Mobile",
  "Address",
  "Pincode",
  "City",
  "District",
  "State",
  "Service",
  "Applied By",
  "Applied By Type",
  "Assigned To",
  "Team Type",
  "Work Status",
  "Total Fee",
  "Amount Received",
  "Balance",
  "Payment Status",
  "Next Follow-up",
  "Expected Completion",
  "Completed Date",
  "Invoice No",
  "Invoice Link",
  "Payment ID",
  "Application ID",
  "Supabase ID",
  "WhatsApp Status",
  "Last Updated",
  "Notes",
] as const;

export const CUSTOMER_MASTER_HEADERS = [
  "Customer ID",
  "Name",
  "Mobile",
  "Address",
  "City",
  "District",
  "State",
  "Total Works",
  "Lifetime Value",
  "Last Visit",
] as const;

export type SheetLayout = BaseSheetLayout & {
  headers: readonly string[];
};

export function getSheetLayout(sheetName: string): SheetLayout {
  const base = getBaseSheetLayout(sheetName);
  return {
    ...base,
    headers: sheetName === CUSTOMER_WORK_SHEET ? CUSTOMER_WORK_HEADERS : CUSTOMER_MASTER_HEADERS,
  };
}

function encodeA1Sheet(sheetName: string, range: string) {
  const escaped = sheetName.replace(/'/g, "''");
  return `'${escaped}'!${range}`;
}

async function sheetsFetch(path: string, init?: RequestInit) {
  const token = await getGoogleAccessToken();
  if (!token.ok) {
    return { ok: false as const, status: 0, error: token.error, code: token.code, body: null };
  }

  const response = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? JSON.stringify((body as { error: unknown }).error).slice(0, 500)
        : text.slice(0, 500);
    return { ok: false as const, status: response.status, error: message, code: "sheets_api_error", body };
  }

  return { ok: true as const, status: response.status, body };
}

function columnIndexToLetter(index: number): string {
  let n = index + 1;
  let letter = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function lastColumnLetter(headerCount: number): string {
  return columnIndexToLetter(Math.max(headerCount - 1, 0));
}

/**
 * Ensure CRM sheets exist. Never writes Customer Work row 1 (title/dashboard).
 * Customer Work headers are expected on row 2; only seed when that row is empty.
 * Customer Master keeps header-on-row-1 behavior.
 */
export async function ensureCrmSheetsExist(): Promise<{ ok: true } | { ok: false; error: string }> {
  const loaded = loadGoogleSheetsConfig();
  if (!loaded.ok) return { ok: false, error: loaded.error };

  const meta = await sheetsFetch(`spreadsheets/${loaded.config.spreadsheetId}?fields=sheets.properties.title`);
  if (!meta.ok) return { ok: false, error: meta.error };

  const titles = new Set(
    (((meta.body as { sheets?: Array<{ properties?: { title?: string } }> })?.sheets ?? []).map(
      (sheet) => sheet.properties?.title || "",
    )),
  );

  const missing = [CUSTOMER_WORK_SHEET, CUSTOMER_MASTER_SHEET].filter((name) => !titles.has(name));
  if (missing.length) {
    const created = await sheetsFetch(`spreadsheets/${loaded.config.spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
      }),
    });
    if (!created.ok) return { ok: false, error: created.error };
  }

  // Customer Master — header row 1 only if empty / missing expected first header.
  {
    const layout = getSheetLayout(CUSTOMER_MASTER_SHEET);
    const headerRead = await sheetsFetch(
      `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(
        encodeA1Sheet(CUSTOMER_MASTER_SHEET, `${layout.headerRow}:${layout.headerRow}`),
      )}`,
    );
    if (!headerRead.ok) return { ok: false, error: headerRead.error };
    const existing = ((headerRead.body as { values?: string[][] })?.values?.[0] ?? []).map(String);
    const empty = existing.every((cell) => !cell.trim());
    if (empty) {
      const write = await sheetsFetch(
        `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(
          encodeA1Sheet(CUSTOMER_MASTER_SHEET, `${layout.headerRow}:${layout.headerRow}`),
        )}?valueInputOption=RAW`,
        {
          method: "PUT",
          body: JSON.stringify({ values: [Array.from(CUSTOMER_MASTER_HEADERS)] }),
        },
      );
      if (!write.ok) return { ok: false, error: write.error };
    }
  }

  // Customer Work — never touch row 1; seed headers on row 2 only when empty.
  {
    const layout = getSheetLayout(CUSTOMER_WORK_SHEET);
    const headerRead = await sheetsFetch(
      `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(
        encodeA1Sheet(CUSTOMER_WORK_SHEET, `${layout.headerRow}:${layout.headerRow}`),
      )}`,
    );
    if (!headerRead.ok) return { ok: false, error: headerRead.error };
    const existing = ((headerRead.body as { values?: string[][] })?.values?.[0] ?? []).map(String);
    const empty = existing.every((cell) => !cell.trim());
    if (empty) {
      const write = await sheetsFetch(
        `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(
          encodeA1Sheet(CUSTOMER_WORK_SHEET, `${layout.headerRow}:${layout.headerRow}`),
        )}?valueInputOption=RAW`,
        {
          method: "PUT",
          body: JSON.stringify({ values: [Array.from(CUSTOMER_WORK_HEADERS)] }),
        },
      );
      if (!write.ok) return { ok: false, error: write.error };
    }
  }

  return { ok: true };
}

/** Last occupied data row (1-based), scanning from firstDataRow. Ignores title/header rows. */
export async function findLastDataRow(
  sheetName: string,
): Promise<{ ok: true; lastDataRow: number | null; nextDataRow: number } | { ok: false; error: string }> {
  const loaded = loadGoogleSheetsConfig();
  if (!loaded.ok) return { ok: false, error: loaded.error };

  const layout = getSheetLayout(sheetName);
  const endCol = lastColumnLetter(layout.headers.length);
  const range = `${columnIndexToLetter(0)}${layout.firstDataRow}:${endCol}`;
  const read = await sheetsFetch(
    `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(encodeA1Sheet(sheetName, range))}`,
  );
  if (!read.ok) return { ok: false, error: read.error };

  const values = (read.body as { values?: string[][] })?.values ?? [];
  let lastOffset = -1;
  for (let i = 0; i < values.length; i += 1) {
    const row = values[i] ?? [];
    if (row.some((cell) => String(cell ?? "").trim())) {
      lastOffset = i;
    }
  }

  const lastDataRow = lastOffset >= 0 ? layout.firstDataRow + lastOffset : null;
  const nextDataRow = Math.max((lastDataRow ?? layout.firstDataRow - 1) + 1, layout.firstDataRow);
  return { ok: true, lastDataRow, nextDataRow };
}

/** Find 1-based row by unique key. Searches only the data range (never header/title). */
export async function findSheetRowByKey(
  sheetName: string,
  keyHeader: string,
  keyValue: string,
): Promise<{ ok: true; rowNumber: number | null } | { ok: false; error: string }> {
  const loaded = loadGoogleSheetsConfig();
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (!keyValue) return { ok: true, rowNumber: null };

  const layout = getSheetLayout(sheetName);
  const colIndex = layout.headers.indexOf(keyHeader);
  if (colIndex < 0) return { ok: false, error: `Unknown header ${keyHeader}` };

  const colLetter = columnIndexToLetter(colIndex);
  const read = await sheetsFetch(
    `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(
      encodeA1Sheet(sheetName, `${colLetter}${layout.firstDataRow}:${colLetter}`),
    )}`,
  );
  if (!read.ok) return { ok: false, error: read.error };

  const values = ((read.body as { values?: string[][] })?.values ?? []).map((row) => String(row[0] ?? "").trim());
  const idx = values.findIndex((value) => value === keyValue);
  return { ok: true, rowNumber: idx >= 0 ? idx + layout.firstDataRow : null };
}

async function writeSheetRow(
  sheetName: string,
  rowNumber: number,
  values: string[],
): Promise<{ ok: true; rowNumber: number } | { ok: false; error: string }> {
  const loaded = loadGoogleSheetsConfig();
  if (!loaded.ok) return { ok: false, error: loaded.error };

  if (!isValidSheetDataRow(sheetName, rowNumber)) {
    return {
      ok: false,
      error: `Refusing to write ${sheetName} row ${rowNumber} (data starts at ${getSheetLayout(sheetName).firstDataRow}).`,
    };
  }

  const range = encodeA1Sheet(sheetName, `${rowNumber}:${rowNumber}`);
  const update = await sheetsFetch(
    `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: "PUT",
      body: JSON.stringify({ values: [values] }),
    },
  );
  if (!update.ok) return { ok: false, error: update.error };
  return { ok: true, rowNumber };
}

async function clearSheetRow(
  sheetName: string,
  rowNumber: number,
  columnCount: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const loaded = loadGoogleSheetsConfig();
  if (!loaded.ok) return { ok: false, error: loaded.error };

  // Never clear Customer Work header/title via this helper for rows >= firstDataRow only.
  if (!isValidSheetDataRow(sheetName, rowNumber) && sheetName === CUSTOMER_WORK_SHEET) {
    // Allow clearing misplaced data that landed on row 1/2 during repair only.
    if (rowNumber !== 1 && rowNumber !== 2) {
      return { ok: false, error: `Refusing to clear ${sheetName} row ${rowNumber}` };
    }
  }

  const endCol = lastColumnLetter(columnCount);
  const range = encodeA1Sheet(sheetName, `A${rowNumber}:${endCol}${rowNumber}`);
  const cleared = await sheetsFetch(
    `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
    { method: "POST", body: JSON.stringify({}) },
  );
  if (!cleared.ok) return { ok: false, error: cleared.error };
  return { ok: true };
}

export async function upsertSheetRow(options: {
  sheetName: string;
  headers: readonly string[];
  values: string[];
  rowNumber?: number | null;
}): Promise<{ ok: true; rowNumber: number } | { ok: false; error: string }> {
  const loaded = loadGoogleSheetsConfig();
  if (!loaded.ok) return { ok: false, error: loaded.error };

  const layout = getSheetLayout(options.sheetName);
  const row = options.headers.map((_, index) => String(options.values[index] ?? ""));

  // Invalid mapped rows (e.g. Customer Work row 1/2) must not overwrite title/headers.
  if (isValidSheetDataRow(options.sheetName, options.rowNumber)) {
    return writeSheetRow(options.sheetName, options.rowNumber as number, row);
  }

  if (options.rowNumber && !isValidSheetDataRow(options.sheetName, options.rowNumber)) {
    console.warn("[crm-sheets] invalid_mapped_row_ignored", {
      sheetName: options.sheetName,
      rowNumber: options.rowNumber,
      firstDataRow: layout.firstDataRow,
    });
  }

  // Explicit next data row — never use Sheets append/INSERT_ROWS (can insert above headers).
  const last = await findLastDataRow(options.sheetName);
  if (!last.ok) return { ok: false, error: last.error };

  const nextRow = last.nextDataRow;
  console.info("[crm-sheets] append_data_row", {
    sheetName: options.sheetName,
    lastDataRow: last.lastDataRow,
    nextDataRow: nextRow,
    firstDataRow: layout.firstDataRow,
  });

  return writeSheetRow(options.sheetName, nextRow, row);
}

async function readSheetRowValues(
  sheetName: string,
  rowNumber: number,
  columnCount: number,
): Promise<{ ok: true; values: string[] } | { ok: false; error: string }> {
  const loaded = loadGoogleSheetsConfig();
  if (!loaded.ok) return { ok: false, error: loaded.error };

  const endCol = lastColumnLetter(columnCount);
  const read = await sheetsFetch(
    `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(
      encodeA1Sheet(sheetName, `A${rowNumber}:${endCol}${rowNumber}`),
    )}`,
  );
  if (!read.ok) return { ok: false, error: read.error };
  const values = ((read.body as { values?: string[][] })?.values?.[0] ?? []).map((cell) => String(cell ?? ""));
  return { ok: true, values };
}

/**
 * Move Customer Work rows incorrectly written on row 1/2 to the bottom data area.
 * Does not delete unrelated title/dashboard cells unless they contain a sync Application ID.
 */
export async function repairCustomerWorkRowPlacement(): Promise<{
  ok: boolean;
  repaired: number;
  clearedRows: number[];
  moved: Array<{ applicationId: string; fromRow: number; toRow: number }>;
  error?: string;
}> {
  const loaded = loadGoogleSheetsConfig();
  if (!loaded.ok) return { ok: false, repaired: 0, clearedRows: [], moved: [], error: loaded.error };

  const layout = getSheetLayout(CUSTOMER_WORK_SHEET);
  const appIdCol = layout.headers.indexOf("Application ID");
  if (appIdCol < 0) {
    return { ok: false, repaired: 0, clearedRows: [], moved: [], error: "Application ID column missing" };
  }

  const moved: Array<{ applicationId: string; fromRow: number; toRow: number }> = [];
  const clearedRows: number[] = [];
  const supabase = getSupabaseAdmin();

  // 1) Invalidate bad map entries (row 1/2).
  if (supabase) {
    const { data: badMaps } = await supabase
      .from("crm_sheet_row_map")
      .select("id, entity_key, row_number")
      .eq("spreadsheet_id", loaded.config.spreadsheetId)
      .eq("sheet_name", CUSTOMER_WORK_SHEET)
      .eq("entity_type", "customer_work")
      .lt("row_number", layout.firstDataRow);

    for (const row of badMaps ?? []) {
      console.warn("[crm-sheets] invalid_row_map_cleared", {
        entityKey: row.entity_key,
        rowNumber: row.row_number,
      });
      await supabase.from("crm_sheet_row_map").delete().eq("id", row.id);
    }
  }

  // 2) Scan title/header rows for misplaced Application IDs and move those rows.
  for (const fromRow of [1, 2] as const) {
    const read = await readSheetRowValues(CUSTOMER_WORK_SHEET, fromRow, layout.headers.length);
    if (!read.ok) return { ok: false, repaired: moved.length, clearedRows, moved, error: read.error };

    const applicationId = String(read.values[appIdCol] ?? "").trim();
    // Skip header label and empty cells.
    if (!applicationId || applicationId === "Application ID") continue;
    // Only move rows that look like synced application UUIDs / work keys.
    if (applicationId.length < 8) continue;

    const existing = await findSheetRowByKey(CUSTOMER_WORK_SHEET, "Application ID", applicationId);
    if (!existing.ok) {
      return { ok: false, repaired: moved.length, clearedRows, moved, error: existing.error };
    }

    let toRow = existing.rowNumber;
    if (!toRow) {
      const padded = [...read.values];
      while (padded.length < layout.headers.length) padded.push("");
      const written = await upsertSheetRow({
        sheetName: CUSTOMER_WORK_SHEET,
        headers: CUSTOMER_WORK_HEADERS,
        values: padded.slice(0, layout.headers.length),
        rowNumber: null,
      });
      if (!written.ok) {
        return { ok: false, repaired: moved.length, clearedRows, moved, error: written.error };
      }
      toRow = written.rowNumber;
    }

    // Clear only the misplaced row cells for our column span (leave other sheet areas alone).
    const cleared = await clearSheetRow(CUSTOMER_WORK_SHEET, fromRow, layout.headers.length);
    if (!cleared.ok) {
      return { ok: false, repaired: moved.length, clearedRows, moved, error: cleared.error };
    }
    clearedRows.push(fromRow);

    if (supabase && toRow) {
      await supabase.from("crm_sheet_row_map").upsert(
        {
          entity_type: "customer_work",
          entity_key: applicationId,
          sheet_name: CUSTOMER_WORK_SHEET,
          row_number: toRow,
          spreadsheet_id: loaded.config.spreadsheetId,
          application_id: applicationId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "spreadsheet_id,sheet_name,entity_type,entity_key" },
      );
    }

    moved.push({ applicationId, fromRow, toRow: toRow || 0 });
    console.info("[crm-sheets] repaired_misplaced_row", { applicationId, fromRow, toRow });
  }

  // Re-seed headers on row 2 if repair cleared a header-looking row incorrectly.
  const headerCheck = await sheetsFetch(
    `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(
      encodeA1Sheet(CUSTOMER_WORK_SHEET, `${layout.headerRow}:${layout.headerRow}`),
    )}`,
  );
  if (headerCheck.ok) {
    const existing = ((headerCheck.body as { values?: string[][] })?.values?.[0] ?? []).map(String);
    const empty = existing.every((cell) => !cell.trim());
    if (empty) {
      await sheetsFetch(
        `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(
          encodeA1Sheet(CUSTOMER_WORK_SHEET, `${layout.headerRow}:${layout.headerRow}`),
        )}?valueInputOption=RAW`,
        {
          method: "PUT",
          body: JSON.stringify({ values: [Array.from(CUSTOMER_WORK_HEADERS)] }),
        },
      );
    }
  }

  return { ok: true, repaired: moved.length, clearedRows, moved };
}
