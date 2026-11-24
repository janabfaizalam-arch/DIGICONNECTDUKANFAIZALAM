import "server-only";

import { createHash, randomBytes, randomInt } from "crypto";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/schema-drift";
import { PRINT_STATION_VERSION } from "@/lib/print/bundle-version.generated";
import type { PartnerDefaults } from "@/lib/print/smart-print";

/**
 * A shop's print counter.
 *
 * The print system was built for one printer: a global agent key, a rate card
 * compiled into the code, and jobs belonging to nobody. This is what turns
 * that into something a partner runs — their own code, their own rates, their
 * own printer, and files their customers can trust.
 */

export type PrintRates = {
  a4_mono: number;
  a4_color: number;
  a3_mono: number;
  a3_color: number;
};

export type PrintStation = {
  id: string;
  partner_id: string;
  code: string;
  display_name: string;
  address: string | null;
  rates: PrintRates;
  accepting_orders: boolean;
  is_active: boolean;
  auto_delete_minutes: number;
  printer_name: string | null;
  /** Colour jobs go here when set; otherwise to printer_name. */
  color_printer_name: string | null;
  /** What the counter PC reported it can print to, on its last poll. */
  available_printers: string[];
  /** Platform's cut per job, percent. Null = platform default. */
  platform_fee_percent: number | null;
  agent_connected: boolean;
  agent_last_seen_at: string | null;
  has_agent_token: boolean;
  /** This shop's own Smart Print defaults and permissions, keyed by service id. */
  smart_print_defaults: PartnerDefaults;
  /** When true, a paid job waits for the partner before it prints. */
  require_approval: boolean;
  /** Shop's switches: does this counter sell A3 / colour at all. */
  offer_a3: boolean;
  offer_color: boolean;
  /** Version the shop's connector last reported, if any. */
  agent_version: string | null;
  /** The partner asked the connector to update itself and it has not yet. */
  update_requested: boolean;
};

/**
 * What the platform will allow a shop to charge.
 *
 * A floor because a station selling below cost is a station about to stop
 * answering its phone, and a ceiling because a customer scanning a QR has
 * already walked into the shop — the price should not be a surprise they
 * discover at payment. Held in code rather than the schema so it can be
 * widened without a migration.
 */
export const RATE_LIMITS = { min: 1, max: 60 } as const;

export const DEFAULT_RATES: PrintRates = {
  a4_mono: 2,
  a4_color: 10,
  a3_mono: 5,
  a3_color: 20,
};

/* ─────────────────────────────────────────────────────────────────────────
   Codes and tokens
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The alphabet a station code is drawn from.
 *
 * No O/0, no I/1/L, no U (which is misheard as "you" over a phone). The code
 * ends up on a card taped to a counter, read by a camera in bad light, and
 * occasionally typed by hand — every character it contains has to survive all
 * three.
 */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomCode(length = 6): string {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/** The agent's credential, stored only as a hash. */
export function hashAgentToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * A fresh agent token.
 *
 * Shown to the partner once, at setup, and never again — the row keeps only
 * its hash, so a database dump does not hand somebody every shop's printer.
 */
export function newAgentToken(): string {
  return `dcp_${randomBytes(24).toString("base64url")}`;
}

/** The four digits printed on the slip, quoted to collect the pages. */
export function newPickupPin(): string {
  return String(randomInt(1000, 10000));
}

/* ─────────────────────────────────────────────────────────────────────────
   Reading
   ───────────────────────────────────────────────────────────────────────── */

type StationRow = Record<string, unknown>;

function toStation(row: StationRow): PrintStation {
  const lastSeen = typeof row.agent_last_seen_at === "string" ? row.agent_last_seen_at : null;

  return {
    id: String(row.id ?? ""),
    partner_id: String(row.partner_id ?? ""),
    code: String(row.code ?? ""),
    display_name: String(row.display_name ?? "Print counter"),
    address: (row.address as string | null) ?? null,
    rates: {
      a4_mono: Number(row.rate_a4_mono ?? DEFAULT_RATES.a4_mono),
      a4_color: Number(row.rate_a4_color ?? DEFAULT_RATES.a4_color),
      a3_mono: Number(row.rate_a3_mono ?? DEFAULT_RATES.a3_mono),
      a3_color: Number(row.rate_a3_color ?? DEFAULT_RATES.a3_color),
    },
    accepting_orders: row.accepting_orders !== false,
    is_active: row.is_active !== false,
    auto_delete_minutes: Number(row.auto_delete_minutes ?? 15),
    printer_name: (row.printer_name as string | null) ?? null,
    color_printer_name: (row.color_printer_name as string | null) ?? null,
    available_printers: Array.isArray(row.available_printers)
      ? (row.available_printers as unknown[]).map(String).filter(Boolean)
      : [],
    platform_fee_percent:
      row.platform_fee_percent === null || row.platform_fee_percent === undefined
        ? null
        : Number(row.platform_fee_percent),
    agent_last_seen_at: lastSeen,
    // A shop's counter is "connected" if its agent spoke to us recently. Two
    // minutes: the agent polls far more often than that, so a longer window
    // would tell a partner their printer is fine while it sits unplugged.
    agent_connected: Boolean(lastSeen && Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000),
    has_agent_token: Boolean(row.agent_token_hash),
    /*
      The shop's own Smart Print defaults.

      Read defensively: the column arrives with the migration, and a station
      row read before it is applied would otherwise crash the counter page
      rather than simply using the platform presets.
    */
    smart_print_defaults:
      row.smart_print_defaults && typeof row.smart_print_defaults === "object"
        ? (row.smart_print_defaults as PartnerDefaults)
        : {},
    require_approval: row.require_approval === true,
    // Missing column (older schema) reads as "on" — what every shop had before.
    offer_a3: row.offer_a3 !== false,
    offer_color: row.offer_color !== false,
    agent_version: typeof row.agent_version === "string" ? row.agent_version : null,
    update_requested: Boolean(row.update_requested_at),
  };
}

/*
  Every column, whatever exists.

  An explicit column list fails the whole query when one column is missing —
  a deploy that landed before its migration took every counter offline,
  because the station could not be read at all. toStation reads each field
  defensively, so "*" keeps a counter printing on an older schema and simply
  shows the newer settings as their defaults.
*/
const COLUMNS = "*";

/** The station behind a QR code. Case-insensitive: a code may be typed by hand. */
export async function getStationByCode(code: string): Promise<PrintStation | null> {
  const supabase = getSupabaseAdmin();
  const clean = String(code ?? "").trim();
  if (!supabase || !clean) return null;

  try {
    const { data, error } = await supabase
      .from("print_stations")
      .select(COLUMNS)
      .ilike("code", clean)
      .maybeSingle();

    if (error || !data) return null;
    return toStation(data as StationRow);
  } catch {
    return null;
  }
}

/** A station by its id — for server code that already holds a job's station_id. */
export async function getStationById(stationId: string): Promise<PrintStation | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !stationId) return null;

  try {
    const { data, error } = await supabase
      .from("print_stations")
      .select(COLUMNS)
      .eq("id", stationId)
      .maybeSingle();

    if (error || !data) return null;
    return toStation(data as StationRow);
  } catch {
    return null;
  }
}

/** A partner's own station, if they have set one up. */
export async function getStationForPartner(partnerId: string): Promise<PrintStation | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !partnerId) return null;

  try {
    const { data, error } = await supabase
      .from("print_stations")
      .select(COLUMNS)
      .eq("partner_id", partnerId)
      .maybeSingle();

    if (error || !data) return null;
    return toStation(data as StationRow);
  } catch {
    return null;
  }
}

/**
 * The station an agent's token belongs to.
 *
 * Looked up by hash, so the plain token is never compared in the database and
 * never appears in a query log.
 */
export async function getStationByAgentToken(token: string): Promise<PrintStation | null> {
  const supabase = getSupabaseAdmin();
  const clean = String(token ?? "").trim();
  if (!supabase || !clean) return null;

  try {
    const { data, error } = await supabase
      .from("print_stations")
      .select(COLUMNS)
      .eq("agent_token_hash", hashAgentToken(clean))
      .maybeSingle();

    if (error || !data) return null;
    return toStation(data as StationRow);
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Writing
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Create a partner's station, with a code nobody else holds.
 *
 * The code is random rather than derived from the partner, so it leaks
 * nothing about how many shops there are or who joined when. Collisions are
 * retried rather than assumed away — six characters from a thirty-letter
 * alphabet is roughly 729 million, but "unlikely" is not a guarantee and this
 * value is unique in the schema.
 */
export async function createStation(input: {
  partnerId: string;
  displayName: string;
  address?: string | null;
}): Promise<{ station: PrintStation; agentToken: string } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const agentToken = newAgentToken();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode();
    const { data, error } = await supabase
      .from("print_stations")
      .insert({
        partner_id: input.partnerId,
        code,
        display_name: input.displayName.trim().slice(0, 80) || "Print counter",
        address: input.address?.trim().slice(0, 200) || null,
        rate_a4_mono: DEFAULT_RATES.a4_mono,
        rate_a4_color: DEFAULT_RATES.a4_color,
        rate_a3_mono: DEFAULT_RATES.a3_mono,
        rate_a3_color: DEFAULT_RATES.a3_color,
        agent_token_hash: hashAgentToken(agentToken),
      })
      .select(COLUMNS)
      .single();

    if (!error && data) return { station: toStation(data as StationRow), agentToken };

    // 23505 is a unique violation — try another code. Anything else is real.
    if (error && error.code !== "23505") return null;
  }

  return null;
}

/**
 * Clamp a rate to what the platform allows, rejecting nonsense outright.
 *
 * `null`, `undefined` and an empty string mean "not provided" and keep the
 * rate the shop already had. They are checked before `Number`, because
 * `Number(null)` and `Number("")` are both `0` — which would silently drop a
 * shop's colour rate to the platform minimum every time a form left the field
 * blank.
 */
export function clampRate(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === "") return fallback;

  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(RATE_LIMITS.max, Math.max(RATE_LIMITS.min, Math.round(number * 100) / 100));
}

export async function updateStation(
  partnerId: string,
  patch: {
    display_name?: string;
    address?: string | null;
    rates?: Partial<PrintRates>;
    accepting_orders?: boolean;
    auto_delete_minutes?: number;
    printer_name?: string | null;
    color_printer_name?: string | null;
    /** Per-service Smart Print defaults, merged over what the shop already had. */
    smart_print_defaults?: PartnerDefaults;
    require_approval?: boolean;
    offer_a3?: boolean;
    offer_color?: boolean;
  },
): Promise<PrintStation | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const current = await getStationForPartner(partnerId);
  if (!current) return null;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (patch.display_name !== undefined) {
    update.display_name = patch.display_name.trim().slice(0, 80) || current.display_name;
  }
  if (patch.address !== undefined) update.address = patch.address?.trim().slice(0, 200) || null;
  if (patch.accepting_orders !== undefined) update.accepting_orders = Boolean(patch.accepting_orders);
  if (patch.printer_name !== undefined) update.printer_name = patch.printer_name?.trim().slice(0, 120) || null;
  if (patch.color_printer_name !== undefined) {
    update.color_printer_name = patch.color_printer_name?.trim().slice(0, 120) || null;
  }

  if (patch.auto_delete_minutes !== undefined) {
    // The schema's check would reject an out-of-range value with a database
    // error; clamping turns a mistyped 500 into the longest we allow.
    update.auto_delete_minutes = Math.min(120, Math.max(5, Math.round(Number(patch.auto_delete_minutes) || 15)));
  }

  if (patch.require_approval !== undefined) update.require_approval = Boolean(patch.require_approval);
  if (patch.offer_a3 !== undefined) update.offer_a3 = Boolean(patch.offer_a3);
  if (patch.offer_color !== undefined) update.offer_color = Boolean(patch.offer_color);

  /*
    Merged, not replaced.

    A shop changing its passport-photo count should not lose the Aadhaar
    default it set last month — and the screen only ever sends the service it
    is editing.
  */
  if (patch.smart_print_defaults) {
    update.smart_print_defaults = { ...current.smart_print_defaults, ...patch.smart_print_defaults };
  }

  if (patch.rates) {
    if (patch.rates.a4_mono !== undefined) update.rate_a4_mono = clampRate(patch.rates.a4_mono, current.rates.a4_mono);
    if (patch.rates.a4_color !== undefined) update.rate_a4_color = clampRate(patch.rates.a4_color, current.rates.a4_color);
    if (patch.rates.a3_mono !== undefined) update.rate_a3_mono = clampRate(patch.rates.a3_mono, current.rates.a3_mono);
    if (patch.rates.a3_color !== undefined) update.rate_a3_color = clampRate(patch.rates.a3_color, current.rates.a3_color);
  }

  try {
    let { data, error } = await supabase
      .from("print_stations")
      .update(update)
      .eq("partner_id", partnerId)
      .select(COLUMNS)
      .single();

    // Save what can be saved: drop the newer optional fields and try again.
    if (error && isMissingColumnError(error)) {
      const core = { ...update };
      delete core.color_printer_name;
      delete core.smart_print_defaults;
      delete core.require_approval;
      delete core.offer_a3;
      delete core.offer_color;
      ({ data, error } = await supabase
        .from("print_stations")
        .update(core)
        .eq("partner_id", partnerId)
        .select(COLUMNS)
        .single());
    }

    if (error || !data) return null;
    return toStation(data as StationRow);
  } catch {
    return null;
  }
}

/** Issue a new agent token, invalidating the old one. */
export async function rotateAgentToken(partnerId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !partnerId) return null;

  const token = newAgentToken();
  try {
    const { data, error } = await supabase
      .from("print_stations")
      .update({ agent_token_hash: hashAgentToken(token), updated_at: new Date().toISOString() })
      .eq("partner_id", partnerId)
      /*
        Confirm a row was actually written before handing the token out.

        An update that matches nothing is not an error in PostgREST — it
        succeeds, having changed nothing. Without this select, a partner whose
        station row could not be found for any reason would be shown a brand
        new key, told to paste it in, and then be refused by the server
        forever, because that key exists nowhere but on their screen. There is
        no way to tell that apart from a wrong key from the outside, which is
        exactly the loop it put a real shop through.
      */
      .select("id");

    if (error) return null;
    if (!data || data.length === 0) return null;

    return token;
  } catch {
    return null;
  }
}

/**
 * Compare two "x.y.z" versions. Negative when a < b. Anything unparseable
 * counts as 0.0.0, so an unknown connector is always offered the update.
 */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
  const parts = (value: string | null | undefined) =>
    String(value ?? "0.0.0")
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);
  const left = parts(a);
  const right = parts(b);
  for (let index = 0; index < 3; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

/** The partner pressed "Update install karo". */
export async function requestAgentUpdate(partnerId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !partnerId) return false;
  const { data, error } = await supabase
    .from("print_stations")
    .update({ update_requested_at: new Date().toISOString() })
    .eq("partner_id", partnerId)
    .select("id");
  return !error && Boolean(data && data.length);
}

/**
 * Clean a printer list reported by a counter PC.
 *
 * It arrives in a query string the PC controls, so it is bounded before it is
 * stored: at most 20 names of at most 120 characters, no blanks, no repeats.
 */
export function cleanPrinterList(raw: string | null | undefined): string[] | null {
  if (raw === null || raw === undefined) return null;
  const names = String(raw)
    .split(",")
    .map((name) => name.trim().slice(0, 120))
    .filter(Boolean);
  return Array.from(new Set(names)).slice(0, 20);
}

/**
 * Note that a station's agent is alive, so the partner can see it is — and,
 * when the agent sent one, what printers its computer has, so the partner can
 * pick one from the panel instead of at the counter PC.
 */
export async function touchAgent(
  stationId: string,
  printers?: string[] | null,
  agentVersion?: string | null,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const seenAt = new Date().toISOString();
  const update: Record<string, unknown> = { agent_last_seen_at: seenAt };
  if (printers && printers.length) update.available_printers = printers;
  if (agentVersion) {
    update.agent_version = agentVersion;
    // Up to date: whatever update was asked for has happened.
    if (agentVersion === PRINT_STATION_VERSION) update.update_requested_at = null;
  }
  try {
    const { error } = await supabase.from("print_stations").update(update).eq("id", stationId);
    // The heartbeat is what lets customers pay at this counter. It must not
    // be lost because an optional column has nowhere to go.
    if (error && isMissingColumnError(error)) {
      await supabase.from("print_stations").update({ agent_last_seen_at: seenAt }).eq("id", stationId);
    }
  } catch {
    /* A missed heartbeat must never fail the request that carried it. */
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Pricing
   ───────────────────────────────────────────────────────────────────────── */

/**
 * What a job costs at this station.
 *
 * Computed on the server from the station's own rates and never taken from
 * the browser: the price is the one thing on this page a customer has an
 * incentive to change.
 */
export function priceFor(
  rates: PrintRates,
  input: { pages: number; copies: number; paperSize: "A4" | "A3"; colorMode: "mono" | "color" },
): number {
  const key = `${input.paperSize.toLowerCase()}_${input.colorMode}` as keyof PrintRates;
  const rate = rates[key] ?? DEFAULT_RATES.a4_mono;
  const pages = Math.max(1, Math.round(input.pages));
  const copies = Math.max(1, Math.round(input.copies));
  return Math.round(rate * pages * copies * 100) / 100;
}

/**
 * Paid jobs this counter has not printed yet.
 *
 * The shop had no way to know. A customer paid at a counter whose computer
 * was not running the Print Station, the job queued, and the first anybody
 * heard of it was the customer coming back to complain. A number on the
 * partner's own screen is the difference between finding out now and finding
 * out from the person who paid.
 *
 * Counted, not listed: the shop needs to know that something is stuck, and
 * the customer's document is nobody else's business.
 */
export async function countWaitingJobs(stationId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("print_jobs")
    .select("id", { count: "exact", head: true })
    .eq("station_id", stationId)
    .eq("payment_status", "verified")
    .eq("print_status", "queued");

  if (error) {
    console.error("[print/stations] Could not count waiting jobs:", error.message);
    return 0;
  }
  return count ?? 0;
}
