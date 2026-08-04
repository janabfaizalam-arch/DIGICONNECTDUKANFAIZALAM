import "server-only";

import { SignJWT, importPKCS8 } from "jose";

export type GoogleSheetsConfig = {
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export function loadGoogleSheetsConfig():
  | { ok: true; config: GoogleSheetsConfig }
  | { ok: false; code: string; error: string } {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() || "";
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || "";
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() || "";
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  if (!spreadsheetId) {
    return { ok: false, code: "missing_spreadsheet_id", error: "GOOGLE_SHEETS_SPREADSHEET_ID is not configured." };
  }
  if (!clientEmail) {
    return { ok: false, code: "missing_client_email", error: "GOOGLE_SERVICE_ACCOUNT_EMAIL is not configured." };
  }
  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    return {
      ok: false,
      code: "missing_private_key",
      error: "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not configured.",
    };
  }

  return { ok: true, config: { spreadsheetId, clientEmail, privateKey } };
}

export function isGoogleSheetsConfigured(): boolean {
  return loadGoogleSheetsConfig().ok;
}

/**
 * OAuth2 access token for Google Sheets API via service-account JWT.
 * Never logs the private key.
 */
export async function getGoogleAccessToken(): Promise<
  { ok: true; accessToken: string } | { ok: false; error: string; code: string }
> {
  const loaded = loadGoogleSheetsConfig();
  if (!loaded.ok) {
    return { ok: false, code: loaded.code, error: loaded.error };
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return { ok: true, accessToken: cachedToken.accessToken };
  }

  try {
    const key = await importPKCS8(loaded.config.privateKey, "RS256");
    const assertion = await new SignJWT({
      scope: "https://www.googleapis.com/auth/spreadsheets",
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(loaded.config.clientEmail)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });

    const body = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };
    if (!response.ok || !body.access_token) {
      console.error("[google] token_exchange_failed", {
        status: response.status,
        error: body.error ?? "unknown",
      });
      return {
        ok: false,
        code: "token_exchange_failed",
        error: body.error || `Google token exchange failed (HTTP ${response.status})`,
      };
    }

    cachedToken = {
      accessToken: body.access_token,
      expiresAt: now + Math.max(60, Number(body.expires_in ?? 3600)) * 1000,
    };
    return { ok: true, accessToken: body.access_token };
  } catch (error) {
    console.error("[google] token_error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      code: "token_error",
      error: error instanceof Error ? error.message : "Google auth failed",
    };
  }
}

/** Test-only reset */
export function __resetGoogleTokenCacheForTests() {
  cachedToken = null;
}
