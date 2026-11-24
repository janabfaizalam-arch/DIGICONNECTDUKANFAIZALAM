import { describe, expect, it } from "vitest";

import { applyUpdate, isNewer, isSafeRelativePath, RESTART_CODE } from "./self-update.mjs";
import { createWorker } from "./worker.mjs";

describe("what an update may write", () => {
  it("accepts the program's own relative paths", () => {
    expect(isSafeRelativePath("station.mjs")).toBe(true);
    expect(isSafeRelativePath("lib/worker.mjs")).toBe(true);
    expect(isSafeRelativePath("Start Print Station.bat")).toBe(true);
  });

  it("refuses anything that could land outside the program folder", () => {
    for (const bad of ["../evil.mjs", "lib/../../x", "/etc/passwd", "C:\\Windows\\x", "", "a\0b", "lib/%2e%2e/x"]) {
      expect(isSafeRelativePath(bad), bad).toBe(false);
    }
  });

  it("writes beside each file and renames into place, never touching config.json", () => {
    const ops = [];
    const written = applyUpdate({
      files: { "station.mjs": "new", "lib/a.mjs": "a", "config.json": "{}" },
      folder: "/app",
      write: (path) => ops.push(["write", path]),
      rename: (from, to) => ops.push(["rename", from, to]),
      mkdir: () => {},
    });
    expect(written).toBe(2);
    expect(ops.some(([, path]) => String(path).includes("config.json"))).toBe(false);
    expect(ops[0][1].endsWith("station.mjs.new")).toBe(true);
    expect(ops[1][0]).toBe("rename");
  });

  it("refuses the whole update if any path is unsafe", () => {
    expect(() =>
      applyUpdate({ files: { "ok.mjs": "x", "../bad.mjs": "y" }, folder: "/app", write: () => {}, rename: () => {}, mkdir: () => {} }),
    ).toThrow();
  });

  it("restarts with a code the keepalive and launcher both treat as 'start me again'", () => {
    expect(RESTART_CODE).toBe(75);
  });
});

describe("versions", () => {
  it("compares numerically", () => {
    expect(isNewer("2.10.0", "2.9.9")).toBe(true);
    expect(isNewer("2.2.0", "2.2.0")).toBe(false);
    expect(isNewer("2.1.0", "2.2.0")).toBe(false);
  });
});

describe("the worker and updates", () => {
  const base = (update, onUpdateRequested) =>
    createWorker({
      api: { listJobs: async () => ({ jobs: [{ id: "j1" }], station: null, update }) },
      config: { pollSeconds: 3 },
      print: async () => {
        throw new Error("must not print while updating");
      },
      log: () => {},
      state: {},
      currentVersion: "2.1.0",
      onUpdateRequested,
    });

  it("installs only when the partner asked, and before taking a job", async () => {
    const calls = [];
    const worker = base({ latest: "2.2.0", requested: true }, async (v) => calls.push(v));
    expect(await worker.tick()).toBe(false);
    expect(calls).toEqual(["2.2.0"]);
  });

  it("only announces a newer version when nobody asked", async () => {
    const calls = [];
    const state = {};
    const worker = createWorker({
      api: { listJobs: async () => ({ jobs: [], station: null, update: { latest: "2.2.0", requested: false } }) },
      config: { pollSeconds: 3 },
      print: async () => {},
      log: () => {},
      state,
      currentVersion: "2.1.0",
      onUpdateRequested: async (v) => calls.push(v),
    });
    await worker.tick();
    expect(calls).toEqual([]);
    expect(state.updateAvailable).toBe(true);
  });
});
