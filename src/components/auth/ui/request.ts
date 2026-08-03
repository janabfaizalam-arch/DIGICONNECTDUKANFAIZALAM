/** Shared JSON POST helper for auth forms with a hard client-side timeout. */

export type JsonResult<T> = {
  ok: boolean;
  status: number;
  data: T;
  timedOut: boolean;
  networkError: boolean;
  nonJson?: boolean;
  redirected?: boolean;
};

function isExplicitSuccessPayload(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  return record.ok === true || record.success === true;
}

/**
 * POST JSON to an auth API. Success requires:
 * - HTTP 2xx
 * - JSON body
 * - explicit `ok: true` or `success: true` in the payload
 *
 * Redirects / HTML responses are treated as failures so the OTP UI never opens
 * without a real provider-accepted send.
 */
export async function postJson<T = Record<string, unknown>>(
  url: string,
  body: unknown,
  options: { timeoutMs?: number } = {},
): Promise<JsonResult<T>> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
      redirect: "manual",
      credentials: "same-origin",
    });

    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
      return {
        ok: false,
        status: response.status || 0,
        data: { error: "Unexpected redirect from OTP API. Please refresh and try again." } as T,
        timedOut: false,
        networkError: false,
        redirected: true,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();
    let data = {} as T;
    let nonJson = false;

    if (contentType.includes("application/json") || rawText.trim().startsWith("{") || rawText.trim().startsWith("[")) {
      try {
        data = JSON.parse(rawText) as T;
      } catch {
        nonJson = true;
      }
    } else {
      nonJson = true;
    }

    if (nonJson) {
      return {
        ok: false,
        status: response.status,
        data: { error: "OTP API returned a non-JSON response. Please refresh the page." } as T,
        timedOut: false,
        networkError: false,
        nonJson: true,
      };
    }

    const explicitOk = isExplicitSuccessPayload(data);
    return {
      ok: response.ok && explicitOk,
      status: response.status,
      data,
      timedOut: false,
      networkError: false,
    };
  } catch (error) {
    const aborted = controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError");
    return {
      ok: false,
      status: 0,
      data: {} as T,
      timedOut: aborted,
      networkError: !aborted,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function messageFor(result: JsonResult<{ error?: string; code?: string }>, fallback: string): string {
  if (result.timedOut) return "Request timed out. Please try again.";
  if (result.networkError) return "Network error. Check your connection and try again.";
  if (result.redirected) return "Unexpected redirect from OTP API. Please refresh and try again.";
  if (result.nonJson) return "OTP API returned an invalid response. Please hard-refresh (Ctrl+Shift+R) and try again.";
  return result.data?.error ?? fallback;
}
