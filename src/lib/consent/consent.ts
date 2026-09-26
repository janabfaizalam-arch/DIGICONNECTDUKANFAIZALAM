/**
 * The visitor's cookie choices, stored in the one cookie that records them.
 *
 * The state is read by the banner, by the scripts that load trackers, and by
 * every `track*` helper, so none of them can drift from what the visitor said.
 *
 * Three states matter, not two:
 *   • `null`      — no decision yet (or one made under an older CONSENT_VERSION)
 *   • granted     — the category may load
 *   • denied      — it may not, and anything it already set is removed
 * Nothing non-essential loads while the state is `null`.
 */

import { CONSENT_VERSION } from "@/lib/compliance/config";

export const CONSENT_COOKIE = "dc_consent";
export const OPEN_SETTINGS_EVENT = "dc:open-cookie-settings";
const CHANGE_EVENT = "dc:consent-change";
/** About six months. Long enough not to nag, short enough to re-ask. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 182;

export type ConsentState = {
  v: number;
  analytics: boolean;
  marketing: boolean;
  /** ISO timestamp of the decision. */
  ts: string;
};

let cached: { raw: string | null; value: ConsentState | null } = { raw: null, value: null };

function readRawCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  return match ? match.slice(CONSENT_COOKIE.length + 1) : null;
}

export function parseConsent(raw: string | null): ConsentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentState>;
    if (parsed.v !== CONSENT_VERSION) return null;
    return {
      v: CONSENT_VERSION,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      ts: typeof parsed.ts === "string" ? parsed.ts : "",
    };
  } catch {
    return null;
  }
}

/** Current choice, or null when the visitor has not decided. Stable identity for useSyncExternalStore. */
export function getConsent(): ConsentState | null {
  const raw = readRawCookie();
  if (raw !== cached.raw) {
    cached = { raw, value: parseConsent(raw) };
  }
  return cached.value;
}

export function hasConsent(category: "analytics" | "marketing"): boolean {
  return getConsent()?.[category] === true;
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }) {
  if (typeof document === "undefined") return;
  const value: ConsentState = {
    v: CONSENT_VERSION,
    analytics: choice.analytics,
    marketing: choice.marketing,
    ts: new Date().toISOString(),
  };
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  if (!choice.analytics) removeCookies(/^_ga($|_)|^_gid$|^_gat/);
  if (!choice.marketing) removeCookies(/^_fbp$|^_fbc$/);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeConsent(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

/**
 * Best-effort removal of tracker cookies after consent is withdrawn.
 *
 * Trackers set cookies on the registrable domain (".rnos.in"), so each name is
 * expired on the current host and on every parent domain.
 */
function removeCookies(pattern: RegExp) {
  const names = document.cookie
    .split("; ")
    .map((part) => part.split("=")[0])
    .filter((name) => pattern.test(name));
  if (!names.length) return;

  const labels = window.location.hostname.split(".");
  const domains = [""];
  for (let i = 0; i < labels.length - 1; i += 1) {
    domains.push(`; Domain=.${labels.slice(i).join(".")}`);
  }

  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain}`;
    }
  }
}
