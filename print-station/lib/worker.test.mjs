import { describe, expect, it, vi } from "vitest";

import { backoffSeconds, isRetryable } from "./api.mjs";
import { createWorker, describeFailure, isFatal, nextJob, runJob } from "./worker.mjs";

/**
 * The behaviour a shop actually experiences.
 *
 * Every case below is one that ends with a customer standing at a counter
 * holding a payment receipt: a job taken and never reported, a printer that
 * refused, a broadband drop, another computer racing for the same job.
 */

const noop = () => {};
const job = (over = {}) => ({
  id: "job-1",
  job_number: "PJ-9",
  copies: 1,
  pages: 2,
  paper_size: "A4",
  color_mode: "mono",
  created_at: "2026-09-01T10:00:00Z",
  claimed_by_agent: null,
  ...over,
});

describe("nextJob", () => {
  it("takes the oldest job, because that customer has waited longest", () => {
    const chosen = nextJob([
      job({ id: "b", created_at: "2026-09-01T10:05:00Z" }),
      job({ id: "a", created_at: "2026-09-01T10:00:00Z" }),
    ]);
    expect(chosen.id).toBe("a");
  });

  it("skips a job another computer holds a live claim on", () => {
    const held = job({ claimed_by_agent: "station:OTHER", claim_expires_at: "2026-09-01T10:20:00Z" });
    expect(nextJob([held], Date.parse("2026-09-01T10:10:00Z"))).toBeNull();
  });

  it("picks up a job whose claim has expired — the other computer died mid-print", () => {
    const stale = job({ claimed_by_agent: "station:OTHER", claim_expires_at: "2026-09-01T10:05:00Z" });
    expect(nextJob([stale], Date.parse("2026-09-01T10:10:00Z"))?.id).toBe("job-1");
  });

  it("treats an unreadable claim expiry as still claimed rather than racing for it", () => {
    const odd = job({ claimed_by_agent: "station:OTHER", claim_expires_at: "not a date" });
    expect(nextJob([odd])).toBeNull();
  });

  it("returns null for an empty or malformed queue instead of throwing", () => {
    expect(nextJob([])).toBeNull();
    expect(nextJob(null)).toBeNull();
    expect(nextJob([null, {}, { id: "" }])).toBeNull();
  });
});

describe("describeFailure", () => {
  it("names the real cause of a refused key, not a loop back to the dashboard", () => {
    // "Issue a new one" sent a shop round the same loop: downloading again
    // retires the key the older folder is still presenting.
    const message = describeFailure({ status: 401 });
    expect(message).toMatch(/newer download/i);
    expect(message).toMatch(/newest downloaded folder/i);
  });

  it("says a lost race is nothing to worry about", () => {
    expect(describeFailure({ status: 409 })).toMatch(/nothing to do/i);
  });

  it("names the broadband, not the error code", () => {
    expect(describeFailure(new Error("fetch failed ECONNREFUSED"))).toMatch(/no internet/i);
    expect(describeFailure(new Error("getaddrinfo EAI_AGAIN rnos.in"))).toMatch(/no internet/i);
  });

  it("sends the shop owner to the printer when the printer is the problem", () => {
    expect(describeFailure(new Error("lp: The printer is not responding"))).toMatch(/paper/i);
  });

  it("truncates anything else rather than filling the screen with a stack trace", () => {
    expect(describeFailure(new Error("x".repeat(900))).length).toBeLessThanOrEqual(200);
  });

  it("never returns an empty message", () => {
    expect(describeFailure(undefined).length).toBeGreaterThan(0);
  });
});

describe("isFatal", () => {
  it("stops on a credential the server refuses", () => {
    expect(isFatal({ status: 401 })).toBe(true);
    expect(isFatal({ status: 403 })).toBe(true);
  });

  it("keeps going through anything the shop cannot fix by typing", () => {
    // A shop's broadband coming back must not need somebody to walk over and
    // restart the program.
    expect(isFatal({ status: 500 })).toBe(false);
    expect(isFatal(new Error("fetch failed"))).toBe(false);
  });
});

describe("isRetryable and backoff", () => {
  it("retries a server fault and a rate limit", () => {
    expect(isRetryable(500)).toBe(true);
    expect(isRetryable(502)).toBe(true);
    expect(isRetryable(429)).toBe(true);
  });

  it("retries a request that got no reply at all", () => {
    expect(isRetryable(undefined)).toBe(true);
  });

  it("does not retry a request the server understood and rejected", () => {
    expect(isRetryable(400)).toBe(false);
    expect(isRetryable(401)).toBe(false);
    expect(isRetryable(404)).toBe(false);
  });

  it("backs off further each time but never past two minutes", () => {
    expect(backoffSeconds(1, 5)).toBe(10);
    expect(backoffSeconds(2, 5)).toBe(20);
    expect(backoffSeconds(50, 5)).toBe(120);
  });

  it("does not wait on the very first attempt", () => {
    expect(backoffSeconds(0, 5)).toBe(5);
  });
});

describe("runJob", () => {
  const okClaim = {
    success: true,
    job_number: "PJ-9",
    file: { file_name: "resume.pdf", download_url: "https://example.test/f.pdf" },
  };
  const download = async () => ({ path: "/tmp/job.pdf", cleanup: vi.fn() });

  it("claims, prints, and reports success", async () => {
    const api = { claim: vi.fn(async () => okClaim), report: vi.fn(async () => ({})) };
    const print = vi.fn(async () => {});

    const result = await runJob({ api, job: job(), print, log: noop, download });

    expect(result.outcome).toBe("printed");
    expect(print).toHaveBeenCalledOnce();
    expect(api.report).toHaveBeenCalledWith("job-1", "printed");
  });

  it("reports a failure so the customer's screen stops saying 'printing'", async () => {
    const api = { claim: vi.fn(async () => okClaim), report: vi.fn(async () => ({})) };
    const print = vi.fn(async () => {
      throw new Error("lp: printer out of paper");
    });

    const result = await runJob({ api, job: job(), print, log: noop, download });

    expect(result.outcome).toBe("failed");
    expect(api.report).toHaveBeenCalledWith("job-1", "failed", expect.stringMatching(/paper/i));
  });

  it("deletes the customer's file even when printing threw", async () => {
    // The shop's promise is that nothing of the customer's stays behind. A
    // file left by a failed print would break it silently, every time.
    const cleanup = vi.fn();
    const api = { claim: async () => okClaim, report: async () => ({}) };
    await runJob({
      api,
      job: job(),
      print: async () => {
        throw new Error("boom");
      },
      log: noop,
      download: async () => ({ path: "/tmp/job.pdf", cleanup }),
    });
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("deletes the file after a successful print too", async () => {
    const cleanup = vi.fn();
    const api = { claim: async () => okClaim, report: async () => ({}) };
    await runJob({
      api,
      job: job(),
      print: async () => {},
      log: noop,
      download: async () => ({ path: "/tmp/job.pdf", cleanup }),
    });
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("treats a lost race as nothing, not as a failure the shop must see", async () => {
    const api = {
      claim: vi.fn(async () => {
        throw Object.assign(new Error("taken"), { status: 409 });
      }),
      report: vi.fn(),
    };
    const result = await runJob({ api, job: job(), print: vi.fn(), log: noop, download });

    expect(result.outcome).toBe("skipped");
    expect(api.report).not.toHaveBeenCalled();
  });

  it("rethrows a refused key so the loop can stop rather than spin", async () => {
    const api = {
      claim: async () => {
        throw Object.assign(new Error("nope"), { status: 401 });
      },
      report: vi.fn(),
    };
    await expect(runJob({ api, job: job(), print: vi.fn(), log: noop, download })).rejects.toMatchObject({ status: 401 });
  });

  it("fails the job when the server sends no file, rather than printing nothing", async () => {
    const api = { claim: async () => ({ success: true }), report: vi.fn(async () => ({})) };
    const result = await runJob({ api, job: job(), print: vi.fn(), log: noop, download });

    expect(result.outcome).toBe("failed");
    expect(api.report).toHaveBeenCalledWith("job-1", "failed", expect.stringMatching(/file/i));
  });

  it("does not let a failed report hide the real problem", async () => {
    const api = {
      claim: async () => okClaim,
      report: async () => {
        throw new Error("report also failed");
      },
    };
    const result = await runJob({
      api,
      job: job(),
      print: async () => {
        throw new Error("lp: printer offline");
      },
      log: noop,
      download,
    });
    expect(result.message).toMatch(/printer/i);
  });
});

describe("createWorker", () => {
  const state = () => ({ printed: 0, failed: 0, queued: 0 });

  it("counts a printed job and marks itself connected", async () => {
    const s = state();
    const api = {
      listJobs: async () => ({ jobs: [job()] }),
      claim: async () => ({ file: { file_name: "a.pdf", download_url: "https://x.test/f" } }),
      report: async () => ({}),
    };
    const worker = createWorker({
      api,
      config: { pollSeconds: 5 },
      state: s,
      print: async () => {},
      log: noop,
    });

    // The download is the one thing here that would touch the network.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    try {
      const didWork = await worker.tick();
      expect(didWork).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(s.printed).toBe(1);
    expect(s.connected).toBe(true);
    expect(s.queued).toBe(1);
  });

  it("reports an empty queue as connected with nothing to do", async () => {
    const s = state();
    const worker = createWorker({
      api: { listJobs: async () => ({ jobs: [] }) },
      config: { pollSeconds: 5 },
      state: s,
      print: async () => {},
      log: noop,
    });

    expect(await worker.tick()).toBe(false);
    expect(s.connected).toBe(true);
    expect(s.queued).toBe(0);
  });

  it("survives a server that answers without a jobs array", async () => {
    const s = state();
    const worker = createWorker({
      api: { listJobs: async () => ({}) },
      config: { pollSeconds: 5 },
      state: s,
      print: async () => {},
      log: noop,
    });
    expect(await worker.tick()).toBe(false);
    expect(s.queued).toBe(0);
  });
});

describe("the shop's own name", () => {
  it("is taken from the server and shown on this computer's screen", async () => {
    const s = { printed: 0, failed: 0, queued: 0 };
    const worker = createWorker({
      api: { listJobs: async () => ({ jobs: [], station: { code: "K7M2QD", display_name: "Faiz Digital Point" } }) },
      config: { pollSeconds: 5 },
      state: s,
      print: async () => {},
      log: noop,
    });
    await worker.tick();
    expect(s.stationName).toBe("Faiz Digital Point");
  });

  it("is left alone when an older server does not send it", async () => {
    const s = { printed: 0, failed: 0, queued: 0, stationName: "Faiz Digital Point" };
    const worker = createWorker({
      api: { listJobs: async () => ({ jobs: [] }) },
      config: { pollSeconds: 5 },
      state: s,
      print: async () => {},
      log: noop,
    });
    await worker.tick();
    expect(s.stationName).toBe("Faiz Digital Point");
  });
});
