import "server-only";

import { getGoogleAccessToken, loadGoogleSheetsConfig } from "@/lib/google";

export const CUSTOMER_WORK_SHEET = "Customer Work";
export const CUSTOMER_MASTER_SHEET = "Customer Master";

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

  for (const [sheet, headers] of [
    [CUSTOMER_WORK_SHEET, CUSTOMER_WORK_HEADERS],
    [CUSTOMER_MASTER_SHEET, CUSTOMER_MASTER_HEADERS],
  ] as const) {
    const headerRead = await sheetsFetch(
      `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(encodeA1Sheet(sheet, "1:1"))}`,
    );
    if (!headerRead.ok) return { ok: false, error: headerRead.error };
    const existing = ((headerRead.body as { values?: string[][] })?.values?.[0] ?? []).map(String);
    const needsHeader =
      existing.length === 0 || headers.some((header, index) => (existing[index] || "").trim() !== header);
    if (needsHeader) {
      const write = await sheetsFetch(
        `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(encodeA1Sheet(sheet, "1:1"))}?valueInputOption=RAW`,
        {
          method: "PUT",
          body: JSON.stringify({ values: [Array.from(headers)] }),
        },
      );
      if (!write.ok) return { ok: false, error: write.error };
    }
  }

  return { ok: true };
}

/** Find 1-based row number by unique key column (header name). Returns null if missing. */
export async function findSheetRowByKey(
  sheetName: string,
  keyHeader: string,
  keyValue: string,
): Promise<{ ok: true; rowNumber: number | null } | { ok: false; error: string }> {
  const loaded = loadGoogleSheetsConfig();
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (!keyValue) return { ok: true, rowNumber: null };

  const headers: readonly string[] =
    sheetName === CUSTOMER_MASTER_SHEET ? CUSTOMER_MASTER_HEADERS : CUSTOMER_WORK_HEADERS;
  const colIndex = headers.indexOf(keyHeader);
  if (colIndex < 0) return { ok: false, error: `Unknown header ${keyHeader}` };

  const colLetter = columnIndexToLetter(colIndex);
  const read = await sheetsFetch(
    `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(encodeA1Sheet(sheetName, `${colLetter}2:${colLetter}`))}`,
  );
  if (!read.ok) return { ok: false, error: read.error };

  const values = ((read.body as { values?: string[][] })?.values ?? []).map((row) => String(row[0] ?? "").trim());
  const idx = values.findIndex((value) => value === keyValue);
  return { ok: true, rowNumber: idx >= 0 ? idx + 2 : null };
}

export async function upsertSheetRow(options: {
  sheetName: string;
  headers: readonly string[];
  values: string[];
  rowNumber?: number | null;
}): Promise<{ ok: true; rowNumber: number } | { ok: false; error: string }> {
  const loaded = loadGoogleSheetsConfig();
  if (!loaded.ok) return { ok: false, error: loaded.error };

  const row = options.headers.map((_, index) => String(options.values[index] ?? ""));

  if (options.rowNumber && options.rowNumber >= 2) {
    const range = encodeA1Sheet(options.sheetName, `${options.rowNumber}:${options.rowNumber}`);
    const update = await sheetsFetch(
      `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      {
        method: "PUT",
        body: JSON.stringify({ values: [row] }),
      },
    );
    if (!update.ok) return { ok: false, error: update.error };
    return { ok: true, rowNumber: options.rowNumber };
  }

  const append = await sheetsFetch(
    `spreadsheets/${loaded.config.spreadsheetId}/values/${encodeURIComponent(encodeA1Sheet(options.sheetName, "A:A"))}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({ values: [row] }),
    },
  );
  if (!append.ok) return { ok: false, error: append.error };

  const updatedRange = String((append.body as { updates?: { updatedRange?: string } })?.updates?.updatedRange || "");
  const match = updatedRange.match(/![A-Z]+(\d+)/);
  const rowNumber = match ? Number(match[1]) : 0;
  if (!rowNumber) {
    // Fallback: re-scan is handled by caller via findSheetRowByKey
    return { ok: true, rowNumber: 0 };
  }
  return { ok: true, rowNumber };
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
