import { describe, expect, it } from "vitest";

import { isAllowedHost, isAllowedWrite, tokenFromForm } from "./local-guard.mjs";
import { keyHash, secureBundledKey } from "./secure-key.mjs";

describe("the settings page only answers its own browser tab", () => {
  it("refuses a rebound hostname", () => {
    expect(isAllowedHost("localhost:7171", 7171)).toBe(true);
    expect(isAllowedHost("127.0.0.1:7171", 7171)).toBe(true);
    expect(isAllowedHost("evil.example:7171", 7171)).toBe(false);
    expect(isAllowedHost(undefined, 7171)).toBe(false);
  });

  it("refuses a cross-site or non-JSON write", () => {
    const ok = { method: "POST", origin: "http://localhost:7171", contentType: "application/json", port: 7171 };
    expect(isAllowedWrite(ok)).toBe(true);
    expect(isAllowedWrite({ ...ok, origin: "https://evil.example" })).toBe(false);
    expect(isAllowedWrite({ ...ok, contentType: "text/plain" })).toBe(false);
    expect(isAllowedWrite({ ...ok, origin: undefined })).toBe(false);
    expect(isAllowedWrite({ method: "GET", port: 7171 })).toBe(true);
  });

  it("keeps the saved key when the form sends the masked one back", () => {
    expect(tokenFromForm("dcp_abcd…wxyz", "dcp_real")).toBe("dcp_real");
    expect(tokenFromForm("", "dcp_real")).toBe("dcp_real");
    expect(tokenFromForm("dcp_new", "dcp_real")).toBe("dcp_new");
  });
});

function harness({ rotate, whoami }) {
  const saved = [];
  const calls = [];
  return {
    saved,
    calls,
    save: (config) => {
      saved.push(config);
      return config;
    },
    makeApi: (token) => ({
      rotateKey: async (hash) => {
        calls.push(["rotate", token, hash]);
        return rotate(token, hash);
      },
      whoami: async () => {
        calls.push(["whoami", token]);
        return whoami(token);
      },
    }),
  };
}

const err = (status) => Object.assign(new Error(String(status)), { status });

describe("retiring the key that came in the zip", () => {
  it("swaps a zip key for a fresh one, saving the fresh key before asking", async () => {
    const h = harness({ rotate: async () => ({ ok: true }), whoami: async () => ({}) });
    const result = await secureBundledKey({
      config: { agentToken: "dcp_zip", seededFrom: "dcp_zip", pendingToken: "" },
      save: h.save,
      makeApi: h.makeApi,
      generate: () => "dcp_fresh",
    });
    expect(h.saved[0].pendingToken).toBe("dcp_fresh");
    expect(h.calls[0]).toEqual(["rotate", "dcp_zip", keyHash("dcp_fresh")]);
    expect(result.agentToken).toBe("dcp_fresh");
    expect(result.pendingToken).toBe("");
  });

  it("recovers when the server took the key but the reply was lost", async () => {
    const h = harness({
      rotate: async () => {
        throw err(401);
      },
      whoami: async (token) => {
        if (token !== "dcp_fresh") throw err(401);
      },
    });
    const result = await secureBundledKey({
      config: { agentToken: "dcp_zip", seededFrom: "dcp_zip", pendingToken: "dcp_fresh" },
      save: h.save,
      makeApi: h.makeApi,
    });
    expect(result.agentToken).toBe("dcp_fresh");
  });

  it("leaves a typed-in key alone", async () => {
    const h = harness({ rotate: async () => ({}), whoami: async () => ({}) });
    const config = { agentToken: "dcp_typed", seededFrom: "dcp_zip", pendingToken: "" };
    expect(await secureBundledKey({ config, save: h.save, makeApi: h.makeApi })).toBe(config);
    expect(h.calls).toEqual([]);
  });

  it("keeps the old key working when the internet is down", async () => {
    const h = harness({
      rotate: async () => {
        throw err(0);
      },
      whoami: async () => ({}),
    });
    await expect(
      secureBundledKey({
        config: { agentToken: "dcp_zip", seededFrom: "dcp_zip", pendingToken: "" },
        save: h.save,
        makeApi: h.makeApi,
        generate: () => "dcp_fresh",
      }),
    ).rejects.toBeTruthy();
    expect(h.saved.at(-1).agentToken).toBe("dcp_zip");
    expect(h.saved.at(-1).pendingToken).toBe("dcp_fresh");
  });
});
