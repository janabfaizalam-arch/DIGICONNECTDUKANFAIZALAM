/**
 * India Post pincode lookup — response parsing only, no I/O.
 *
 * The upstream shape is awkward: a single-element array wrapping a status
 * string and a PostOffice list, where a miss is still HTTP 200. Everything
 * that decides "did we actually get a location" lives here so it can be
 * tested without a network.
 */

export type PincodeLocation = {
  pincode: string;
  /** Post-office / village / area names for this pincode, de-duplicated. */
  areas: string[];
  district: string;
  state: string;
};

export function isValidPincode(value: unknown): boolean {
  return /^[1-9]\d{5}$/.test(String(value ?? "").trim());
}

function text(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * India Post returns "Success" with a PostOffice array on a hit, and
 * "Error"/"No records found" with a null PostOffice on a miss — both as 200.
 */
export function parsePincodeResponse(body: unknown, pincode: string): PincodeLocation | null {
  const root = Array.isArray(body) ? body[0] : body;
  if (!root || typeof root !== "object") return null;

  const record = root as Record<string, unknown>;
  if (String(record.Status ?? "").toLowerCase() !== "success") return null;

  const offices = record.PostOffice;
  if (!Array.isArray(offices) || offices.length === 0) return null;

  const areas: string[] = [];
  let district = "";
  let state = "";

  for (const entry of offices) {
    if (!entry || typeof entry !== "object") continue;
    const office = entry as Record<string, unknown>;

    const name = text(office, "Name");
    if (name && !areas.includes(name)) areas.push(name);

    // Every office under one pincode shares district/state; take the first
    // non-empty rather than assuming index 0 is well-formed.
    if (!district) district = text(office, "District");
    if (!state) state = text(office, "State");
  }

  if (!areas.length || !district || !state) return null;

  return {
    pincode: String(pincode).trim(),
    areas: areas.sort((a, b) => a.localeCompare(b)),
    district,
    state,
  };
}
