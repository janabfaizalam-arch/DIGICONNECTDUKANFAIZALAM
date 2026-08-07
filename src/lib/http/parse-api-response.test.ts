import { describe, expect, it } from "vitest";

import {
  extractSafeApiError,
  friendlyApiErrorMessage,
  isRawJsonParseExceptionMessage,
  parseApiResponse,
} from "@/lib/http/parse-api-response";

function mockResponse(input: {
  status: number;
  body?: string;
  contentType?: string | null;
}): Response {
  const headers = new Headers();
  if (input.contentType) headers.set("content-type", input.contentType);
  // 204/205/304 are null-body statuses — passing "" throws in undici.
  const nullBodyStatus = [204, 205, 304].includes(input.status);
  return new Response(nullBodyStatus ? null : input.body ?? "", {
    status: input.status,
    headers,
  });
}

describe("parseApiResponse", () => {
  it("parses normal JSON success", async () => {
    const parsed = await parseApiResponse(
      mockResponse({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          applicationId: "app-1",
          referenceNumber: "W-1",
          idempotentReplay: false,
          notificationStatus: "disabled",
        }),
      }),
    );
    expect(parsed.ok).toBe(true);
    expect(parsed.parseError).toBeNull();
    expect(parsed.data?.applicationId).toBe("app-1");
    expect(parsed.data?.idempotentReplay).toBe(false);
  });

  it("parses idempotent replay success", async () => {
    const parsed = await parseApiResponse(
      mockResponse({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, applicationId: "app-1", idempotentReplay: true, deduped: true }),
      }),
    );
    expect(parsed.data?.idempotentReplay).toBe(true);
  });

  it("parses validation JSON error", async () => {
    const parsed = await parseApiResponse(
      mockResponse({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid application payload.", correlationId: "c1" },
        }),
      }),
    );
    const err = extractSafeApiError(parsed);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Invalid application payload.");
    expect(err.ambiguous).toBe(false);
  });

  it("parses auth JSON error", async () => {
    const parsed = await parseApiResponse(
      mockResponse({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: { code: "UNAUTHORIZED", message: "Unauthorized", correlationId: "c2" },
        }),
      }),
    );
    const err = extractSafeApiError(parsed);
    expect(err.authRequired).toBe(true);
    expect(err.message).toMatch(/session expired|sign in/i);
  });

  it("parses rate-limit JSON error", async () => {
    const parsed = await parseApiResponse(
      mockResponse({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: { code: "RATE_LIMITED", message: "Too many requests. Please try again shortly." },
        }),
      }),
    );
    expect(extractSafeApiError(parsed).message).toMatch(/too many requests/i);
  });

  it("maps supabase/rpc safe error message without raw parser text", async () => {
    const parsed = await parseApiResponse(
      mockResponse({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: { code: "CREATE_FAILED", message: "Application could not be created.", correlationId: "c3" },
        }),
      }),
    );
    const err = extractSafeApiError(parsed);
    expect(err.message).toBe("Application could not be created.");
    expect(isRawJsonParseExceptionMessage(err.message)).toBe(false);
  });

  it("handles empty 200 response", async () => {
    const parsed = await parseApiResponse(mockResponse({ status: 200, contentType: "application/json", body: "" }));
    expect(parsed.parseError).toBe("empty");
    const err = extractSafeApiError(parsed);
    expect(err.ambiguous).toBe(true);
    expect(err.message).toMatch(/empty response|checking/i);
    expect(isRawJsonParseExceptionMessage(err.message)).toBe(false);
  });

  it("handles empty 204 response", async () => {
    const parsed = await parseApiResponse(mockResponse({ status: 204, body: "" }));
    expect(parsed.parseError).toBe("no_content");
    expect(extractSafeApiError(parsed).ambiguous).toBe(true);
  });

  it("handles HTML login response", async () => {
    const parsed = await parseApiResponse(
      mockResponse({
        status: 200,
        contentType: "text/html",
        body: "<!DOCTYPE html><html><body>Login</body></html>",
      }),
    );
    expect(parsed.parseError).toBe("html");
    const err = extractSafeApiError(parsed);
    expect(err.authRequired).toBe(true);
    expect(isRawJsonParseExceptionMessage(err.message)).toBe(false);
  });

  it("handles non-JSON 500 response", async () => {
    const parsed = await parseApiResponse(
      mockResponse({
        status: 500,
        contentType: "text/plain",
        body: "Internal Server Error",
      }),
    );
    expect(parsed.parseError).toBe("non_json");
    expect(extractSafeApiError(parsed).ambiguous).toBe(true);
  });

  it("never surfaces raw Response.json exception text", () => {
    expect(
      isRawJsonParseExceptionMessage("Failed to execute 'json' on 'Response': Unexpected end of JSON input"),
    ).toBe(true);
    expect(
      friendlyApiErrorMessage({
        status: 500,
        parseError: "empty",
        serverMessage: "Failed to execute 'json' on 'Response': Unexpected end of JSON input",
      }),
    ).not.toMatch(/Failed to execute/);
  });
});

describe("walk-in recovery UX contract", () => {
  it("treats timeout/connection ambiguity as recoverable without auto-retry create", () => {
    const message = friendlyApiErrorMessage({
      status: 502,
      parseError: "empty",
    });
    expect(message).toMatch(/checking|empty/i);
    expect(isRawJsonParseExceptionMessage(message)).toBe(false);
  });
});
