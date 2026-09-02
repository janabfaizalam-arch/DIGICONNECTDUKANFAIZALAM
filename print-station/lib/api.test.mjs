import { describe, expect, it, vi } from "vitest";

import { ApiError, createApi } from "./api.mjs";

/**
 * What goes over the wire, and what comes back when it goes wrong.
 *
 * The station's token is the only thing separating this shop's queue from a
 * neighbour's, so the header carrying it is pinned here rather than trusted.
 */

function fakeFetch(response) {
  return vi.fn(async () => ({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    text: async () => (response.body === undefined ? "" : JSON.stringify(response.body)),
  }));
}

describe("createApi", () => {
  it("sends the station's token as a bearer credential", async () => {
    const fetchImpl = fakeFetch({ body: { jobs: [] } });
    await createApi({ serverUrl: "https://rnos.in", agentToken: "dcp_key", fetchImpl }).listJobs();

    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer dcp_key");
  });

  it("calls the endpoint the server actually exposes", async () => {
    const fetchImpl = fakeFetch({ body: { jobs: [] } });
    await createApi({ serverUrl: "https://rnos.in", agentToken: "k", fetchImpl }).listJobs();
    expect(fetchImpl.mock.calls[0][0]).toBe("https://rnos.in/api/print/agent/jobs");
  });

  it("does not double the slash when the address ends in one", async () => {
    const fetchImpl = fakeFetch({ body: {} });
    await createApi({ serverUrl: "https://rnos.in/", agentToken: "k", fetchImpl }).claim("job-1");
    expect(fetchImpl.mock.calls[0][0]).toBe("https://rnos.in/api/print/agent/claim-job");
  });

  it("passes the printer names so the dashboard can show them", async () => {
    const fetchImpl = fakeFetch({ body: { jobs: [] } });
    await createApi({ serverUrl: "https://rnos.in", agentToken: "k", fetchImpl }).listJobs(["HP LaserJet"]);
    expect(fetchImpl.mock.calls[0][0]).toContain("printers=HP%20LaserJet");
  });

  it("sends the claim as the body shape the route reads", async () => {
    const fetchImpl = fakeFetch({ body: { success: true } });
    await createApi({ serverUrl: "https://x.test", agentToken: "k", fetchImpl }).claim("job-1");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ job_id: "job-1" });
  });

  it("sends a status report with an error message field the route expects", async () => {
    const fetchImpl = fakeFetch({ body: { success: true } });
    await createApi({ serverUrl: "https://x.test", agentToken: "k", fetchImpl }).report("job-1", "failed", "out of paper");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      job_id: "job-1",
      status: "failed",
      error_message: "out of paper",
    });
  });

  it("carries the server's own words into the error, not a generic one", async () => {
    const fetchImpl = fakeFetch({ ok: false, status: 409, body: { error: "Job could not be claimed." } });
    const api = createApi({ serverUrl: "https://x.test", agentToken: "k", fetchImpl });

    await expect(api.claim("job-1")).rejects.toMatchObject({
      status: 409,
      message: "Job could not be claimed.",
    });
  });

  it("still reports a status when the body is not JSON at all", async () => {
    // A proxy or a captive portal answers with HTML. That must surface as a
    // status the loop can classify, not a parse error it cannot.
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 502, text: async () => "<html>Bad Gateway</html>" }));
    await expect(
      createApi({ serverUrl: "https://x.test", agentToken: "k", fetchImpl }).listJobs(),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("returns an empty object rather than null for an empty success body", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, text: async () => "" }));
    await expect(createApi({ serverUrl: "https://x.test", agentToken: "k", fetchImpl }).report("j", "printed")).resolves.toEqual({});
  });

  it("is an ApiError, so the loop can read the status off it", async () => {
    const fetchImpl = fakeFetch({ ok: false, status: 401, body: { error: "Unauthorized" } });
    const caught = await createApi({ serverUrl: "https://x.test", agentToken: "k", fetchImpl })
      .listJobs()
      .catch((error) => error);
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught.status).toBe(401);
  });

  it("gives up on a server that never answers", async () => {
    const fetchImpl = vi.fn(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(new Error("The operation was aborted")));
        }),
    );
    const api = createApi({ serverUrl: "https://x.test", agentToken: "k", fetchImpl, timeoutMs: 20 });
    await expect(api.listJobs()).rejects.toThrow(/abort/i);
  });
});
