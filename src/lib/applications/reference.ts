/**
 * A reference somebody can read out over the phone.
 *
 * An application was identified everywhere by its database id —
 * `c08ecef1-13fe-4491-8a99-bce9adc02069`, or `c08ecef1` where it had been
 * trimmed. Neither says anything. A customer reading it out loud gets it wrong
 * twice, and staff searching for it have to copy and paste, so in practice
 * nobody used it at all: they searched by name and hoped there was only one.
 *
 * The reference is built from what the application already is:
 *
 *     AAD-260830-C08E
 *      │    │      └── four characters of the id, so two filings of the same
 *      │    │          service on the same day never collide
 *      │    └───────── the day it was filed, YYMMDD, so it sorts by age and
 *      │               tells you how old a file is without opening it
 *      └────────────── the service, so you know what it is before you look
 *
 * It is derived, never stored: no migration, no second identity to keep in
 * step, and an old row gets one the moment it is read. The database id remains
 * the key and is still what every link and API call carries — this is a label
 * for people, and it is treated as one.
 */

/**
 * Short words that carry no meaning in a service name.
 *
 * "Pan Card With Only Aadhaar" should read PAN, not WIT.
 */
const FILLER = new Set([
  "the", "a", "an", "of", "for", "and", "with", "only", "new", "your", "my",
  "online", "service", "services", "apply", "application", "form", "card",
]);

/**
 * The service's short code.
 *
 * A name that already starts with an acronym keeps it whole — ITR, GST, DPR,
 * PVC read better than the first three letters of a word would. Anything else
 * takes three letters from its first word that means something.
 */
export function serviceCode(serviceName: string | null | undefined): string {
  const words = String(serviceName ?? "")
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const meaningful = words.filter((word) => !FILLER.has(word.toLowerCase()));
  const first = meaningful[0] ?? words[0];
  if (!first) return "APP";

  // Already an acronym: ITR, GST, PVC, DPR, HOF.
  if (first.length <= 4 && first === first.toUpperCase() && /^[A-Z]+$/.test(first)) {
    return first;
  }

  return first.slice(0, 3).toUpperCase().padEnd(3, "X");
}

/** YYMMDD in IST, which is the day the shop would call it. */
function filedOn(createdAt: string | null | undefined): string {
  const date = createdAt ? new Date(createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) return "000000";

  // The business runs on IST; a file taken at 11pm is that day's, not UTC's.
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const yy = String(ist.getUTCFullYear()).slice(-2);
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(ist.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

/** Four characters of the id, uppercased, with the ambiguous ones dropped. */
function tail(id: string | null | undefined): string {
  const clean = String(id ?? "")
    .replace(/[^A-Za-z0-9]/g, "")
    // Said aloud, letter O and digit 0 are the same sound, as are I and 1.
    // The digits stay and the letters go, so a code read down a phone can
    // only be written one way.
    .replace(/[OoIl]/g, "")
    .toUpperCase();
  return clean.slice(0, 4).padEnd(4, "X");
}

export type ApplicationReferenceInput = {
  id?: string | null;
  application_id?: string | null;
  service?: string | null;
  service_name?: string | null;
  created_at?: string | null;
};

/**
 * The reference for one application.
 *
 * Deliberately total: any row, however incomplete, gets a readable code
 * rather than an empty cell or a thrown error. A missing service reads APP,
 * a missing date reads 000000 — wrong, but obviously wrong, which is what a
 * placeholder should be.
 */
export function applicationReference(row: ApplicationReferenceInput): string {
  const id = row.application_id ?? row.id;
  return `${serviceCode(row.service ?? row.service_name)}-${filedOn(row.created_at)}-${tail(id)}`;
}

/**
 * Does this search term look like one of our references?
 *
 * Lets the applications search accept a reference somebody read off a receipt
 * without the customer having to know it is not what the database stores.
 */
export function looksLikeReference(term: string): boolean {
  return /^[A-Z]{2,4}-\d{6}-[A-Z0-9]{4}$/i.test(term.trim());
}

/** The id fragment inside a reference, for matching against stored ids. */
export function referenceTail(term: string): string | null {
  const match = term.trim().match(/^[A-Za-z]{2,4}-\d{6}-([A-Za-z0-9]{4})$/);
  return match ? match[1].toUpperCase() : null;
}
