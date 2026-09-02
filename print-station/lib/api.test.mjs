import { describe, expect, it, vi } from "vitest";

import { ApiError, createApi, redirectTarget, sameSite } from "./api.mjs";

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

describe("a redirect between the bare domain and www", () => {
  /*
    The bug that cost a shop an afternoon, and every key it tried.

    rnos.in answers with a 307 to www.rnos.in. Those are different origins, so
    fetch obeys the spec and drops the Authorization header before following.
    The server then sees no key at all and says, truthfully, that the key was
    refused — for correct keys, freshly issued keys, every key. Nothing on
    either side could tell, because from the server's side there was simply
    never a credential.
  */
  function redirectingFetch({ from, to, accept }) {
    const calls = [];
    const impl = vi.fn(async (url, init) => {
      calls.push({ url, auth: init.headers.Authorization });
      if (url.startsWith(from)) {
        return {
          ok: false,
          status: 307,
          headers: { get: (name) => (name.toLowerCase() === "location" ? url.replace(from, to) : null) },
          text: async () => "Redirecting...",
        };
      }
      const authorised = init.headers.Authorization === `Bearer ${accept}`;
      return {
        ok: authorised,
        status: authorised ? 200 : 401,
        headers: { get: () => null },
        text: async () => JSON.stringify(authorised ? { jobs: [] } : { error: "Unauthorized" }),
      };
    });
    return { impl, calls };
  }

  it("follows the redirect with the key still attached", async () => {
    const { impl, calls } = redirectingFetch({
      from: "https://rnos.in",
      to: "https://www.rnos.in",
      accept: "dcp_live",
    });

    await expect(
      createApi({ serverUrl: "https://rnos.in", agentToken: "dcp_live", fetchImpl: impl }).listJobs(),
    ).resolves.toEqual({ jobs: [] });

    expect(calls).toHaveLength(2);
    expect(calls[1].url).toBe("https://www.rnos.in/api/print/agent/jobs");
    expect(calls[1].auth).toBe("Bearer dcp_live");
  });

  it("asks fetch not to follow redirects itself, since that is what loses the key", async () => {
    const { impl } = redirectingFetch({ from: "https://rnos.in", to: "https://www.rnos.in", accept: "dcp_live" });
    await createApi({ serverUrl: "https://rnos.in", agentToken: "dcp_live", fetchImpl: impl }).listJobs();
    expect(impl.mock.calls[0][1].redirect).toBe("manual");
  });

  it("never replays the key to another site", async () => {
    // A redirect is attacker-influencable in a way a URL in a config file is
    // not. Following one off-site with the credential attached would hand a
    // shop's print queue to whoever the Location named.
    const { impl, calls } = redirectingFetch({
      from: "https://rnos.in",
      to: "https://evil.example",
      accept: "dcp_live",
    });

    await expect(
      createApi({ serverUrl: "https://rnos.in", agentToken: "dcp_live", fetchImpl: impl }).listJobs(),
    ).rejects.toMatchObject({ status: 307 });

    expect(calls).toHaveLength(1);
    expect(calls.some((call) => call.url.includes("evil.example"))).toBe(false);
  });

  it("gives up rather than chasing a redirect loop", async () => {
    const impl = vi.fn(async (url) => ({
      ok: false,
      status: 307,
      headers: { get: () => url },
      text: async () => "",
    }));
    await expect(
      createApi({ serverUrl: "https://www.rnos.in", agentToken: "k", fetchImpl: impl }).listJobs(),
    ).rejects.toMatchObject({ status: 307 });
    expect(impl.mock.calls.length).toBeLessThanOrEqual(3);
  });
});

describe("sameSite", () => {
  it("treats www and the bare domain as one site", () => {
    expect(sameSite("https://rnos.in/x", "https://www.rnos.in/x")).toBe(true);
    expect(sameSite("https://www.rnos.in/x", "https://rnos.in/x")).toBe(true);
  });

  it("does not treat a different domain as the same site", () => {
    expect(sameSite("https://rnos.in/x", "https://evil.example/x")).toBe(false);
    // A lookalike that merely ends the same way must not pass either.
    expect(sameSite("https://rnos.in/x", "https://rnos.in.evil.example/x")).toBe(false);
  });

  it("says no rather than throwing on a malformed URL", () => {
    expect(sameSite("not a url", "https://rnos.in")).toBe(false);
  });
});

describe("redirectTarget", () => {
  it("resolves a relative Location against the URL that returned it", () => {
    expect(redirectTarget("https://rnos.in/api/print/agent/jobs", "/api/v2/jobs")).toBe("https://rnos.in/api/v2/jobs");
  });

  it("keeps an absolute Location as it is", () => {
    expect(redirectTarget("https://rnos.in/a", "https://www.rnos.in/a")).toBe("https://www.rnos.in/a");
  });

  it("returns null when there is no Location at all", () => {
    expect(redirectTarget("https://rnos.in/a", null)).toBeNull();
    expect(redirectTarget("https://rnos.in/a", "")).toBeNull();
  });
});
