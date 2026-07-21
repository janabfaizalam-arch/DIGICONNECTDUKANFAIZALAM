/** Shared JSON POST helper for auth forms with a hard client-side timeout. */

export type JsonResult<T> = {
  ok: boolean;
  status: number;
  data: T;
  timedOut: boolean;
  networkError: boolean;
};

export async function postJson<T = Record<string, unknown>>(
  url: string,
  body: unknown,
  options: { timeoutMs?: number } = {},
): Promise<JsonResult<T>> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as T;
    return { ok: response.ok, status: response.status, data, timedOut: false, networkError: false };
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

export function messageFor(result: JsonResult<{ error?: string }>, fallback: string): string {
  if (result.timedOut) return "Request timed out. Please try again.";
  if (result.networkError) return "Network error. Check your connection and try again.";
  return result.data?.error ?? fallback;
}
