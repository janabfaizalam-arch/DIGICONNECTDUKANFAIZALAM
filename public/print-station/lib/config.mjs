import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
  /*
    The download key this computer has already taken.

    Not a setting anybody edits — it is how the program tells "the folder I
    was started from carries a newer key" from "the shop typed its own key
    in". Without it a bundle's key would either be ignored forever, or
    clobber a hand-entered one on every restart.
  */
  seededFrom: "",
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
    seededFrom: String(input.seededFrom ?? "").trim(),
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

/**
 * The settings that came inside the download, if any.
 *
 * A partner who downloads from their own dashboard gets a bundle with their
 * key and their site address already in it, so there is nothing to paste and
 * nothing to mistype.
 */
function bundledConfig() {
  try {
    const beside = join(dirname(fileURLToPath(import.meta.url)), "..", "config.json");
    if (!existsSync(beside)) return null;
    return JSON.parse(readFileSync(beside, "utf8"));
  } catch {
    return null;
  }
}

function readStored() {
  const path = configPath();
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    // A corrupt file must not stop the shop from opening.
    return null;
  }
}

/**
 * The settings this computer runs on.
 *
 * The awkward case, and the one that actually bit a shop: a partner who had
 * already set the program up by hand downloaded a fresh bundle. Downloading
 * issues a new key and retires the old one — so the saved settings now held a
 * key certain to be refused, while the working key sat unread in the folder
 * they had just double-clicked. "Your key was refused", on the very action
 * meant to make keys somebody else's problem.
 *
 * So a bundle's key beats a saved one — but only once per bundle, and only
 * the key. Which printer this shop picked on this computer is not something a
 * download knows, and not something it should overwrite.
 */
export function loadConfig() {
  const stored = readStored();
  const bundled = bundledConfig();
  const bundledToken = String(bundled?.agentToken ?? "").trim();

  if (!stored) {
    // Written out now, so the first save from the settings page edits a real
    // file rather than re-seeding from the folder on every restart.
    return bundled ? saveConfig({ ...bundled, seededFrom: bundledToken }) : normalizeConfig({});
  }

  if (bundledToken && bundledToken !== String(stored.seededFrom ?? "").trim()) {
    return saveConfig({
      ...stored,
      agentToken: bundledToken,
      serverUrl: bundled.serverUrl || stored.serverUrl,
      seededFrom: bundledToken,
    });
  }

  return normalizeConfig(stored);
}

/** Did this start take its key from the folder it was run out of? */
export function adoptedBundledKey(config, bundled = bundledConfig()) {
  const token = String(bundled?.agentToken ?? "").trim();
  return Boolean(token) && token === config.agentToken && token === config.seededFrom;
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
