// ============================================================
// Credit Module — Unifers API Provider Adapter
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import { getSupabaseAdmin } from "@/lib/supabase";
import { sanitizePanForLog } from "./validators";
import type {
  UnifersCibilRequest,
  UnifersCibilResponse,
  UnifersCrifRequest,
  UnifersCrifResponse,
  UnifersCreditInfoResponse,
} from "./types";

const DEFAULT_BASE_URL = "https://app.unifers.ai/api";
const TIMEOUT_MS = 15000; // 15s timeout

// 1. Verify UNIFERS_API_BASE_URL
let rawBaseUrl = process.env.UNIFERS_API_BASE_URL || DEFAULT_BASE_URL;

// 2. Ensure URL starts with: https://
if (!rawBaseUrl.startsWith("http://") && !rawBaseUrl.startsWith("https://")) {
  rawBaseUrl = "https://" + rawBaseUrl;
}

export const UNIFERS_API_BASE_URL = rawBaseUrl;

// 4. Add startup validation:
if (!UNIFERS_API_BASE_URL.startsWith("http")) {
  throw new Error("Invalid UNIFERS_API_BASE_URL");
}

/**
 * Build endpoints using: new URL()
 */
export function getEndpointUrl(path: string, baseUrl: string): string {
  // Normalize base URL (strip trailing slash)
  const base = baseUrl.replace(/\/$/, "");
  
  // Clean path: ensure it starts with /
  let relativePath = path.startsWith("/") ? path : "/" + path;

  // If base ends with /api and path starts with /api/, strip /api from path to avoid duplication.
  if (base.endsWith("/api") && relativePath.startsWith("/api/")) {
    relativePath = relativePath.slice(4);
  } else if (base.endsWith("/api") && relativePath === "/api") {
    relativePath = "/";
  } else if (!base.endsWith("/api") && !relativePath.startsWith("/api/")) {
    // If base doesn't end with /api and path doesn't start with /api/, prepend it
    relativePath = "/api" + relativePath;
  }

  // Ensure final base ends with a slash for relative path resolution in new URL
  const finalBase = base + "/";
  const finalPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;

  return new URL(finalPath, finalBase).toString();
}

/**
 * Get configuration from environment variables
 */
function getProviderConfig() {
  const baseUrl = UNIFERS_API_BASE_URL.replace(/\/$/, "");
  const token = process.env.UNIFERS_API_TOKEN;

  if (!token) {
    throw new Error("UNIFERS_API_TOKEN environment variable is not configured.");
  }

  return { baseUrl, token };
}

/**
 * Inserts an API log entry into the database.
 * Masks PAN numbers in the request payload.
 */
async function logApiCall(params: {
  creditReportId: string | null;
  userId: string | null;
  endpoint: string;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  statusCode: number | null;
  isSuccess: boolean;
  errorMessage: string | null;
}) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    // Mask PAN in the request payload JSON
    let maskedRequest: Record<string, unknown> | null = null;
    if (params.requestPayload) {
      maskedRequest = { ...params.requestPayload };
      if (typeof maskedRequest.PAN_Number === "string") {
        maskedRequest.PAN_Number = sanitizePanForLog(maskedRequest.PAN_Number);
      }
    }

    await supabase.from("credit_api_logs").insert({
      credit_report_id: params.creditReportId,
      user_id: params.userId,
      endpoint: params.endpoint,
      request_payload: maskedRequest,
      response_payload: params.responsePayload,
      status_code: params.statusCode,
      is_success: params.isSuccess,
      error_message: params.errorMessage,
    });
  } catch (error) {
    console.error("Failed to write to credit_api_logs table:", error);
  }
}

/**
 * Fetch helper with timeout and retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  backoff = 1000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const err = error as Error;
    const isTimeout = err.name === "AbortError";
    
    if (retries > 0) {
      const nextDelay = backoff * 2;
      console.warn(
        `Unifers API call failed (${isTimeout ? "timeout" : err.message}). Retrying in ${backoff}ms... (${retries} attempts left)`
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, nextDelay);
    }
    throw error;
  }
}

/**
 * Robust JSON response parser with debugging logs
 */
async function parseJsonResponse(res: Response, endpointName: string): Promise<Record<string, unknown>> {
  const contentType = res.headers.get("content-type") || "";
  console.log(`[Unifers API Debug - ${endpointName}] URL:`, res.url);
  console.log(`[Unifers API Debug - ${endpointName}] Status:`, res.status);
  console.log(`[Unifers API Debug - ${endpointName}] StatusText:`, res.statusText);
  console.log(`[Unifers API Debug - ${endpointName}] Content-Type:`, contentType);

  const clone = res.clone();
  const raw = await clone.text();
  console.log(`[Unifers API Debug - ${endpointName}] Raw Response (First 1000 chars):`, raw.slice(0, 1000));

  if (contentType.includes("text/html")) {
    console.log(`[Unifers API Debug - ${endpointName}] Full HTML Response:`, raw);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`Unexpected response content-type: "${contentType}". Expected "application/json".`);
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    console.error(`[Unifers API Debug - ${endpointName}] JSON parse error:`, err);
    throw err;
  }
}

/**
 * 1. Get Credit Info/Unused Credits
 */
export async function getCreditInfo(): Promise<UnifersCreditInfoResponse> {
  const { baseUrl, token } = getProviderConfig();
  const endpoint = "/api/enrich/get-credit-info";
  const url = getEndpointUrl(endpoint, baseUrl);

  // 5. Log final generated URL before request.
  console.log("[Unifers API] Request URL (getCreditInfo):", url);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };

  let statusCode: number | null = null;
  let responseData: Record<string, unknown> | null = null;
  let isSuccess = false;
  let errorMessage: string | null = null;

  try {
    const res = await fetchWithRetry(url, {
      method: "GET",
      headers,
    });

    statusCode = res.status;
    const json = await parseJsonResponse(res, "getCreditInfo");
    responseData = json;
    isSuccess = res.ok && responseData.error === false;

    if (!isSuccess) {
      errorMessage = (responseData?.message as string) || `API Error with status code ${res.status}`;
    }

    return responseData as unknown as UnifersCreditInfoResponse;
  } catch (err: unknown) {
    const error = err as Error;
    errorMessage = error.name === "AbortError" ? "API Request Timed Out" : error.message;
    throw new Error(`Unifers API Credit Info request failed: ${errorMessage}`);
  } finally {
    await logApiCall({
      creditReportId: null,
      userId: null,
      endpoint,
      requestPayload: null,
      responsePayload: responseData,
      statusCode,
      isSuccess,
      errorMessage,
    });
  }
}

/**
 * 2. Get CIBIL Report
 */
export async function getCibilReport(
  payload: UnifersCibilRequest,
  metadata: { creditReportId: string; userId: string }
): Promise<UnifersCibilResponse> {
  const { baseUrl, token } = getProviderConfig();
  const endpoint = "/api/enrich/get-cibil-report";
  const url = getEndpointUrl(endpoint, baseUrl);

  // 5. Log final generated URL before request.
  console.log("[Unifers API] Request URL (getCibilReport):", url);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };

  let statusCode: number | null = null;
  let responseData: Record<string, unknown> | null = null;
  let isSuccess = false;
  let errorMessage: string | null = null;

  try {
    const res = await fetchWithRetry(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    statusCode = res.status;
    const json = await parseJsonResponse(res, "getCibilReport");
    responseData = json;
    // Validate response payload shape (check if responseData has data and refId/result)
    isSuccess = res.ok && !!responseData?.data && !!(responseData?.data as Record<string, unknown>)?.result;

    if (!isSuccess) {
      errorMessage = (responseData?.message as string) || (responseData?.error as string) || `API Error with status code ${res.status}`;
    }

    return responseData as unknown as UnifersCibilResponse;
  } catch (err: unknown) {
    const error = err as Error;
    errorMessage = error.name === "AbortError" ? "API Request Timed Out" : error.message;
    throw new Error(`Unifers CIBIL Report request failed: ${errorMessage}`);
  } finally {
    await logApiCall({
      creditReportId: metadata.creditReportId,
      userId: metadata.userId,
      endpoint,
      requestPayload: payload as unknown as Record<string, unknown>,
      responsePayload: responseData,
      statusCode,
      isSuccess,
      errorMessage,
    });
  }
}

/**
 * 3. Get CRIF Report
 */
export async function getCrifReport(
  payload: UnifersCrifRequest,
  metadata: { creditReportId: string; userId: string }
): Promise<UnifersCrifResponse> {
  const { baseUrl, token } = getProviderConfig();
  const endpoint = "/api/enrich/get-crif-report";
  const url = getEndpointUrl(endpoint, baseUrl);

  // 5. Log final generated URL before request.
  console.log("[Unifers API] Request URL (getCrifReport):", url);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };

  let statusCode: number | null = null;
  let responseData: Record<string, unknown> | null = null;
  let isSuccess = false;
  let errorMessage: string | null = null;

  try {
    const res = await fetchWithRetry(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    statusCode = res.status;
    const json = await parseJsonResponse(res, "getCrifReport");
    responseData = json;
    isSuccess = res.ok && !!responseData?.data && !!(responseData?.data as Record<string, unknown>)?.result;

    if (!isSuccess) {
      errorMessage = (responseData?.message as string) || (responseData?.error as string) || `API Error with status code ${res.status}`;
    }

    return responseData as unknown as UnifersCrifResponse;
  } catch (err: unknown) {
    const error = err as Error;
    errorMessage = error.name === "AbortError" ? "API Request Timed Out" : error.message;
    throw new Error(`Unifers CRIF Report request failed: ${errorMessage}`);
  } finally {
    await logApiCall({
      creditReportId: metadata.creditReportId,
      userId: metadata.userId,
      endpoint,
      requestPayload: payload as unknown as Record<string, unknown>,
      responsePayload: responseData,
      statusCode,
      isSuccess,
      errorMessage,
    });
  }
}

/**
 * 4. Download Report PDF
 */
export async function downloadReport(reportId: string): Promise<Buffer> {
  const { baseUrl, token } = getProviderConfig();
  const endpoint = "/api/enrich/download-report";
  const url = getEndpointUrl(endpoint, baseUrl);

  // 5. Log final generated URL before request.
  console.log("[Unifers API] Request URL (downloadReport):", url);

  const headers: Record<string, string> = {
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };

  const res = await fetchWithRetry(url + `?refId=${reportId}`, {
    method: "GET",
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  console.log("[Unifers API Debug - downloadReport] URL:", res.url);
  console.log("[Unifers API Debug - downloadReport] Status:", res.status);
  console.log("[Unifers API Debug - downloadReport] StatusText:", res.statusText);
  console.log("[Unifers API Debug - downloadReport] Content-Type:", contentType);

  const clone = res.clone();
  const raw = await clone.text();
  console.log("[Unifers API Debug - downloadReport] Raw Response (First 1000 chars):", raw.slice(0, 1000));

  if (contentType.includes("text/html")) {
    console.log("[Unifers API Debug - downloadReport] Full HTML Response:", raw);
  }

  if (!res.ok) {
    throw new Error(`Failed to download report PDF: Status ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * 5. Provider Authentication / Login
 */
export async function login(credentials: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { baseUrl, token } = getProviderConfig();
  const endpoint = "/api/login";
  const url = getEndpointUrl(endpoint, baseUrl);

  // 5. Log final generated URL before request.
  console.log("[Unifers API] Request URL (login):", url);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers,
    body: JSON.stringify(credentials),
  });

  const json = await parseJsonResponse(res, "login");
  return json;
}
