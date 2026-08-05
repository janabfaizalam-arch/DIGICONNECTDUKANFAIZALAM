/** Sheet layout constants shared by CRM sync (safe for unit tests — no server-only). */

export const CUSTOMER_WORK_SHEET = "Customer Work";
export const CUSTOMER_MASTER_SHEET = "Customer Master";

/** Customer Work: row 1 = title/dashboard; row 2 = headers; data from row 3. */
export const CUSTOMER_WORK_HEADER_ROW = 2;
export const CUSTOMER_WORK_FIRST_DATA_ROW = 3;

/**
 * Customer Master currently uses a simple header-on-row-1 layout.
 * Do not change without inspecting the live sheet.
 */
export const CUSTOMER_MASTER_HEADER_ROW = 1;
export const CUSTOMER_MASTER_FIRST_DATA_ROW = 2;

export type SheetLayout = {
  headerRow: number;
  firstDataRow: number;
};

export function getSheetLayout(sheetName: string): SheetLayout {
  if (sheetName === CUSTOMER_WORK_SHEET) {
    return {
      headerRow: CUSTOMER_WORK_HEADER_ROW,
      firstDataRow: CUSTOMER_WORK_FIRST_DATA_ROW,
    };
  }
  return {
    headerRow: CUSTOMER_MASTER_HEADER_ROW,
    firstDataRow: CUSTOMER_MASTER_FIRST_DATA_ROW,
  };
}

export function isValidSheetDataRow(sheetName: string, rowNumber: number | null | undefined): boolean {
  if (!rowNumber || !Number.isFinite(rowNumber) || rowNumber < 1) return false;
  return rowNumber >= getSheetLayout(sheetName).firstDataRow;
}
