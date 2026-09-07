import { describe, expect, it, vi } from "vitest";

import {
  ExternalError,
  callExternal,
  classifyExternal,
  failureForStatus,
  isRetryable,
  redact,
} from "@/lib/content-engine/errors";

/**
 * Nothing here fails silently, and nothing leaks a token on the way out.
 *
 * The failure that matters most is the quiet one: a publish that returned 500
 * and got logged as done. After that comes the one nobody notices for months
 * — a live access token written into a hosting provider's log because an SDK
 * put the request URL in an error message.
 */

const noSleep = async () => {};

describe("telling one failure from another", () => {
  it("separates an expired connection from a rate limit", () => {
    expect(failureForStatus(401)).toBe("auth_expired");
    expect(failureForStatus(403)).toBe("auth_expired");
    expect(failureForStatus(429)).toBe("rate_limited");
  });

  it("separates content the platform refused from the platform being down", () => {
    expect(failureForStatus(400)).toBe("invalid_content");
    expect(failureForStatus(422)).toBe("invalid_content");
    expect(failureForStatus(503)).toBe("unavailable");
  });

  it("recognises an unsupported operation rather than calling it a failure", () => {
    expect(failureForStatus(405)).toBe("unsupported");
    expect(failureForStatus(501)).toBe("unsupported");
  });

  it("reads a message when there is no status", () => {
    expect(classifyExternal(new Error("fetch failed"), "meta").failure).toBe("unavailable");
    expect(classifyExternal(new Error("invalid_token"), "meta").failure).toBe("auth_expired");
    expect(classifyExternal(new Error("quota exceeded"), "meta").failure).toBe("rate_limited");
    expect(classifyExternal(new Error("ETIMEDOUT"), "meta").failure).toBe("timeout");
  });

  it("falls back to a generic upstream failure rather than guessing", () => {
    expect(classifyExternal(new Error("something odd"), "meta").failure).toBe("upstream");
  });

  it("only retries what is worth retrying", () => {
    expect(isRetryable("rate_limited")).toBe(true);
    expect(isRetryable("unavailable")).toBe(true);
    // Retrying an expired token just spends the rate limit.
    expect(isRetryable("auth_expired")).toBe(false);
    expect(isRetryable("invalid_content")).toBe(false);
    expect(isRetryable("not_configured")).toBe(false);
  });
});

describe("nothing credential-shaped reaches a log", () => {
  it("removes a token from a query string", () => {
    expect(redact("https://graph.facebook.com/me?access_token=EAAxyz123&fields=id")).toContain("[redacted]");
    expect(redact("https://graph.facebook.com/me?access_token=EAAxyz123")).not.toContain("EAAxyz123");
  });

  it("removes a bearer token from a header echo", () => {
    expect(redact("Authorization: Bearer ya29.someverylongtokenvalue")).not.toContain("ya29.someverylongtokenvalue");
  });

  it("removes a Google key and a Meta token wherever they appear", () => {
    expect(redact("failed with AIzaSyABCDEFGHIJKLMNOPQRSTUVWX")).not.toContain("AIzaSyABCDEFGHIJKLMNOPQRSTUVWX");
    expect(redact("token EAABBBCCCDDDEEEFFFGGGHHHIII")).not.toContain("EAABBBCCCDDDEEEFFFGGGHHHIII");
  });

  it("leaves an ordinary message alone", () => {
    expect(redact("The caption is too long for this platform.")).toBe(
      "The caption is too long for this platform.",
    );
  });

  it("bounds the length, so a stack trace does not fill the log", () => {
    expect(redact("x".repeat(5000)).length).toBeLessThanOrEqual(500);
  });

  it("never puts the raw message in what a browser sees", () => {
    const error = new ExternalError("instagram", "auth_expired", "token=EAAsecret expired at ...");
    expect(JSON.stringify(error.toPublic())).not.toContain("EAAsecret");
    expect(error.toPublic().message).toContain("Reconnect");
  });
});

describe("making the call", () => {
  it("returns the value when it works first time", async () => {
    const run = vi.fn(async () => "ok");
    const result = await callExternal(run, {
      service: "test",
      operation: "publish",
      timeoutMs: 1000,
      maxAttempts: 3,
      sleep: noSleep,
    });

    expect(result).toBe("ok");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("retries an outage and succeeds", async () => {
    let attempts = 0;
    const run = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) throw Object.assign(new Error("down"), { status: 503 });
      return "ok";
    });

    const result = await callExternal(run, {
      service: "test",
      operation: "publish",
      timeoutMs: 1000,
      maxAttempts: 3,
      backoffMs: 1,
      sleep: noSleep,
    });

    expect(result).toBe("ok");
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("does not retry an expired connection", async () => {
    const run = vi.fn(async () => {
      throw Object.assign(new Error("unauthorized"), { status: 401 });
    });

    await expect(
      callExternal(run, {
        service: "test",
        operation: "publish",
        timeoutMs: 1000,
        maxAttempts: 3,
        sleep: noSleep,
      }),
    ).rejects.toThrow(ExternalError);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("gives up after the last attempt rather than looping", async () => {
    const run = vi.fn(async () => {
      throw Object.assign(new Error("still down"), { status: 503 });
    });

    await expect(
      callExternal(run, {
        service: "test",
        operation: "publish",
        timeoutMs: 1000,
        maxAttempts: 2,
        backoffMs: 1,
        sleep: noSleep,
      }),
    ).rejects.toMatchObject({ failure: "unavailable" });

    expect(run).toHaveBeenCalledTimes(2);
  });

  it("waits longer between each attempt", async () => {
    const waits: number[] = [];
    const run = vi.fn(async () => {
      throw Object.assign(new Error("down"), { status: 503 });
    });

    await callExternal(run, {
      service: "test",
      operation: "publish",
      timeoutMs: 1000,
      maxAttempts: 3,
      backoffMs: 100,
      sleep: async (ms) => {
        waits.push(ms);
      },
    }).catch(() => undefined);

    expect(waits).toHaveLength(2);
    expect(waits[1]).toBeGreaterThan(waits[0]);
  });

  it("hands the callee a signal, so a timeout cancels rather than abandons", async () => {
    // A call raced against a timer keeps running in the background, and a
    // publish that finishes after we gave up posts twice.
    let seen: AbortSignal | null = null;
    await callExternal(
      async (signal) => {
        seen = signal;
        return "ok";
      },
      { service: "test", operation: "publish", timeoutMs: 1000, maxAttempts: 1, sleep: noSleep },
    );

    expect(seen).toBeInstanceOf(AbortSignal);
  });
});
