import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

/**
 * What this computer remembers between restarts.
 *
 * A shop owner sets this up once. The file lives in the operating system's
 * own per-user config location rather than beside the program, so that
 * replacing the program folder — a re-download, an update — does not lose the
 * key and force a trip back to the website.
 */

export const DEFAULTS = {
  /** Where the counter lives. Overridable so a test install can point elsewhere. */
  serverUrl: "https://rnos.in",
  /** The key issued at /ap/print. Shown once, so it is stored here. */
  agentToken: "",
  /** The printer's name as the operating system spells it. */
  printerName: "",
  /**
   * How often to ask for work.
   *
   * Five seconds: a customer is standing at the counter watching, so a minute
   * feels broken, and anything under a second is a shop hammering a server
   * all day for nothing.
   */
  pollSeconds: 5,
  /** Print in colour only when the job asked for it. */
  duplex: false,
  /** Path to SumatraPDF, if the shop uses it. Found automatically when blank. */
  sumatraPath: "",
};

export function configDir() {
  const home = homedir();
  if (platform() === "win32") {
    return join(process.env.APPDATA || join(home, "AppData", "Roaming"), "DigiConnectPrintStation");
  }
  if (platform() === "darwin") {
    return join(home, "Library", "Application Support", "DigiConnectPrintStation");
  }
  return join(process.env.XDG_CONFIG_HOME || join(home, ".config"), "digiconnect-print-station");
}

export function configPath() {
  return join(configDir(), "config.json");
}

/**
 * Clean whatever was on disk, or in a form post, into a usable config.
 *
 * Written as a pure function so the rules can be tested without a filesystem:
 * every value a shop owner can type passes through here, and a mistyped poll
 * interval must never turn into an infinite loop.
 */
export function normalizeConfig(raw) {
  const input = raw && typeof raw === "object" ? raw : {};

  const serverUrl = String(input.serverUrl ?? DEFAULTS.serverUrl).trim().replace(/\/+$/, "");

  /*
    "Not provided" is checked before Number, not after.

    `Number(null)` and `Number("")` are both 0, which is perfectly finite —
    so a config file missing this field, or a form that left it blank, would
    clamp to the two-second floor and quietly triple this shop's traffic to
    the server forever.
  */
  const pollGiven = input.pollSeconds !== null && input.pollSeconds !== undefined && input.pollSeconds !== "";
  const pollRaw = pollGiven ? Number(input.pollSeconds) : NaN;

  return {
    serverUrl: serverUrl || DEFAULTS.serverUrl,
    agentToken: String(input.agentToken ?? "").trim(),
    printerName: String(input.printerName ?? "").trim(),
    // Clamped, not rejected: a shop owner who types 0 means "as fast as
    // possible", and a shop owner who types 3600 has made a typo they should
    // not have to diagnose from a stalled queue.
    pollSeconds: Number.isFinite(pollRaw) ? Math.min(60, Math.max(2, Math.round(pollRaw))) : DEFAULTS.pollSeconds,
    duplex: Boolean(input.duplex),
    sumatraPath: String(input.sumatraPath ?? "").trim(),
  };
}

/** Everything that must be true before the loop is allowed to start. */
export function configProblems(config) {
  const problems = [];
  if (!config.agentToken) problems.push("Paste the key from your DigiConnect partner dashboard.");
  else if (!config.agentToken.startsWith("dcp_")) problems.push("That key does not look right — it should start with dcp_.");
  if (!config.printerName) problems.push("Choose the printer that should print the jobs.");
  if (!/^https?:\/\//i.test(config.serverUrl)) problems.push("The server address must start with http:// or https://.");
  return problems;
}

export function isReady(config) {
  return configProblems(config).length === 0;
}

export function loadConfig() {
  const path = configPath();
  if (!existsSync(path)) return normalizeConfig({});
  try {
    return normalizeConfig(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    // A corrupt file must not stop the shop from opening: fall back to
    // defaults and let the setup page ask for the key again.
    return normalizeConfig({});
  }
}

export function saveConfig(config) {
  const clean = normalizeConfig(config);
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(clean, null, 2), { mode: 0o600 });
  return clean;
}

/** The config as it is safe to show on a screen or paste into a support chat. */
export function redactConfig(config) {
  const token = config.agentToken;
  return {
    ...config,
    agentToken: token ? `${token.slice(0, 8)}…${token.slice(-4)}` : "",
  };
}
