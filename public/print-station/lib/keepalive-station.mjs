#!/usr/bin/env node
/**
 * Keeps the Print Station running.
 *
 * Background mode started the program with no window and again at every boot,
 * but if it crashed in the afternoon it stayed down until the next morning —
 * and with no window there was nothing on the screen to say so. Customers
 * paid, and nothing printed.
 *
 * This is the program the hidden launchers start. It runs station.mjs as a
 * child and starts it again whenever it stops, waiting a little longer each
 * time it falls over quickly so a broken install does not spin the CPU.
 *
 * A clean exit (code 0) is respected: that is either somebody stopping it on
 * purpose, or another copy already holding the port — in both cases starting
 * it again would be wrong.
 *
 * No dependencies, like the rest of the program.
 */
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const station = join(dirname(fileURLToPath(import.meta.url)), "..", "station.mjs");

/** Seconds to wait before restart number `failures` (1-based). */
export function restartDelaySeconds(failures) {
  return Math.min(60, 2 ** Math.max(0, failures - 1) * 2);
}

let child = null;
let stopping = false;
let failures = 0;

function start() {
  const startedAt = Date.now();
  child = spawn(process.execPath, [station], {
    cwd: dirname(station),
    stdio: "ignore",
    windowsHide: true,
  });

  child.on("exit", (code) => {
    child = null;
    if (stopping || code === 0) process.exit(0);

    // A run that lasted a minute was a crash, not a broken install: start
    // over from the shortest wait.
    failures = Date.now() - startedAt > 60_000 ? 1 : failures + 1;
    setTimeout(start, restartDelaySeconds(failures) * 1000);
  });

  child.on("error", () => {
    // spawn itself failed (node.exe moved?). Treated as a crash.
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopping = true;
    if (child) child.kill(signal);
    else process.exit(0);
  });
}

// Run only when started as a program, not when a test imports the helper.
// Compared case-insensitively: Windows hands the path over in whatever case
// the shortcut was written with.
const self = resolve(fileURLToPath(import.meta.url)).toLowerCase();
if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === self) start();
