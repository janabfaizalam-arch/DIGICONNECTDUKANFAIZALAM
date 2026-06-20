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

const DEFAULT_BASE_URL = "https://bifrost.unifers.ai";
const TIMEOUT_MS = 15000; // 15s timeout

/**
 * Get configuration from environment variables
 */
function getProviderConfig() {
  const baseUrl = (process.env.UNIFERS_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
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
  requestPayload: any;
  responsePayload: any;
  statusCode: number | null;
  isSuccess: boolean;
  errorMessage: string | null;
}) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    // Mask PAN in the request payload JSON
    let maskedRequest = null;
    if (params.requestPayload) {
      maskedRequest = { ...params.requestPayload };
      if (maskedRequest.PAN_Number) {
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
  } catch (error: any) {
    clearTimeout(timeoutId);
    const isTimeout = error.name === "AbortError";
    
    if (retries > 0) {
      const nextDelay = backoff * 2;
      console.warn(
        `Unifers API call failed (${isTimeout ? "timeout" : error.message}). Retrying in ${backoff}ms... (${retries} attempts left)`
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, nextDelay);
    }
    throw error;
  }
}

/**
 * 1. Get Credit Info/Unused Credits
 */
export async function getCreditInfo(): Promise<UnifersCreditInfoResponse> {
  const { baseUrl, token } = getProviderConfig();
  const endpoint = "/enrich/get-credit-info";
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };

  let statusCode: number | null = null;
  let responseData: any = null;
  let isSuccess = false;
  let errorMessage: string | null = null;

  try {
    const res = await fetchWithRetry(url, {
      method: "GET",
      headers,
    });

    statusCode = res.status;
    responseData = await res.json();
    isSuccess = res.ok && responseData.error === false;

    if (!isSuccess) {
      errorMessage = responseData?.message || `API Error with status code ${res.status}`;
    }

    return responseData as UnifersCreditInfoResponse;
  } catch (err: any) {
    errorMessage = err.name === "AbortError" ? "API Request Timed Out" : err.message;
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
  const endpoint = "/enrich/get-cibil-report";
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };

  let statusCode: number | null = null;
  let responseData: any = null;
  let isSuccess = false;
  let errorMessage: string | null = null;

  try {
    const res = await fetchWithRetry(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    statusCode = res.status;
    responseData = await res.json();
    // Validate response payload shape (check if responseData has data and refId/result)
    isSuccess = res.ok && !!responseData?.data && !!responseData?.data?.result;

    if (!isSuccess) {
      errorMessage = responseData?.message || responseData?.error || `API Error with status code ${res.status}`;
    }

    return responseData as UnifersCibilResponse;
  } catch (err: any) {
    errorMessage = err.name === "AbortError" ? "API Request Timed Out" : err.message;
    throw new Error(`Unifers CIBIL Report request failed: ${errorMessage}`);
  } finally {
    await logApiCall({
      creditReportId: metadata.creditReportId,
      userId: metadata.userId,
      endpoint,
      requestPayload: payload,
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
  const endpoint = "/enrich/get-crif-report";
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };

  let statusCode: number | null = null;
  let responseData: any = null;
  let isSuccess = false;
  let errorMessage: string | null = null;

  try {
    const res = await fetchWithRetry(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    statusCode = res.status;
    responseData = await res.json();
    isSuccess = res.ok && !!responseData?.data && !!responseData?.data?.result;

    if (!isSuccess) {
      errorMessage = responseData?.message || responseData?.error || `API Error with status code ${res.status}`;
    }

    return responseData as UnifersCrifResponse;
  } catch (err: any) {
    errorMessage = err.name === "AbortError" ? "API Request Timed Out" : err.message;
    throw new Error(`Unifers CRIF Report request failed: ${errorMessage}`);
  } finally {
    await logApiCall({
      creditReportId: metadata.creditReportId,
      userId: metadata.userId,
      endpoint,
      requestPayload: payload,
      responsePayload: responseData,
      statusCode,
      isSuccess,
      errorMessage,
    });
  }
}
