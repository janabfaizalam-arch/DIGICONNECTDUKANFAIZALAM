/**
 * Safe Response parsing for browser fetch callers.
 * Never throws raw `Failed to execute 'json' on 'Response'`.
 */

export type ParsedApiResponse<T = Record<string, unknown>> = {
  ok: boolean;
  status: number;
  contentType: string | null;
  bodyText: string;
  data: T | null;
  parseError: "empty" | "non_json" | "invalid_json" | "html" | "no_content" | null;
};

export type SafeClientError = {
  code: string;
  message: string;
  correlationId?: string;
  ambiguous?: boolean;
  authRequired?: boolean;
};

const RAW_JSON_PARSE_RE =
  /failed to execute ['"]?json['"]? on ['"]?response['"]?|unexpected end of json input|unexpected token/i;

export function isRawJsonParseExceptionMessage(message: string): boolean {
  return RAW_JSON_PARSE_RE.test(message);
}

export function friendlyApiErrorMessage(input: {
  status: number;
  parseError: ParsedApiResponse["parseError"];
  serverMessage?: string | null;
  fallback?: string;
}): string {
  if (input.status === 401 || input.status === 403) {
    return "Your session expired or you are not allowed to continue. Please sign in again.";
  }
  if (input.status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (input.parseError === "empty" || input.parseError === "no_content") {
    return "The server returned an empty response. Checking whether the application was already created…";
  }
  if (input.parseError === "html" || input.parseError === "non_json") {
    return "The server returned an unexpected response. Checking application status before retrying…";
  }
  if (input.parseError === "invalid_json") {
    return "The server response could not be read. Checking application status before retrying…";
  }
  const server = String(input.serverMessage ?? "").trim();
  if (server && !isRawJsonParseExceptionMessage(server)) {
    return server;
  }
  return input.fallback || "Something went wrong. Please try again.";
}

export async function parseApiResponse<T = Record<string, unknown>>(
  response: Response,
): Promise<ParsedApiResponse<T>> {
  const status = response.status;
  const contentType = response.headers.get("content-type");
  let bodyText = "";

  try {
    bodyText = await response.text();
  } catch {
    return {
      ok: response.ok,
      status,
      contentType,
      bodyText: "",
      data: null,
      parseError: "empty",
    };
  }

  if (status === 204) {
    return {
      ok: response.ok,
      status,
      contentType,
      bodyText,
      data: null,
      parseError: "no_content",
    };
  }

  const trimmed = bodyText.trim();
  if (!trimmed) {
    return {
      ok: response.ok,
      status,
      contentType,
      bodyText,
      data: null,
      parseError: "empty",
    };
  }

  const looksHtml =
    /^\s*<(!doctype|html|head|body|script)/i.test(trimmed) ||
    (contentType != null && contentType.toLowerCase().includes("text/html"));

  if (looksHtml) {
    return {
      ok: response.ok,
      status,
      contentType,
      bodyText,
      data: null,
      parseError: "html",
    };
  }

  const jsonCompatible =
    contentType == null ||
    contentType.toLowerCase().includes("json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");

  if (!jsonCompatible) {
    return {
      ok: response.ok,
      status,
      contentType,
      bodyText,
      data: null,
      parseError: "non_json",
    };
  }

  try {
    return {
      ok: response.ok,
      status,
      contentType,
      bodyText,
      data: JSON.parse(trimmed) as T,
      parseError: null,
    };
  } catch {
    return {
      ok: response.ok,
      status,
      contentType,
      bodyText,
      data: null,
      parseError: "invalid_json",
    };
  }
}

export function extractSafeApiError(
  parsed: ParsedApiResponse<{
    error?: string | { code?: string; message?: string; correlationId?: string };
    message?: string;
    correlationId?: string;
  }>,
): SafeClientError {
  const nested = parsed.data?.error;
  const nestedObj = nested && typeof nested === "object" ? nested : null;
  const nestedString = typeof nested === "string" ? nested : null;
  const message = friendlyApiErrorMessage({
    status: parsed.status,
    parseError: parsed.parseError,
    serverMessage: nestedObj?.message || nestedString || parsed.data?.message || null,
  });

  const ambiguous =
    parsed.parseError === "empty" ||
    parsed.parseError === "no_content" ||
    parsed.parseError === "html" ||
    parsed.parseError === "non_json" ||
    parsed.parseError === "invalid_json" ||
    (parsed.status >= 500 && !nestedString && !nestedObj?.message);

  return {
    code: nestedObj?.code || (ambiguous ? "AMBIGUOUS_RESPONSE" : `HTTP_${parsed.status}`),
    message,
    correlationId: nestedObj?.correlationId || parsed.data?.correlationId,
    ambiguous,
    authRequired: parsed.status === 401 || parsed.status === 403 || parsed.parseError === "html",
  };
}
