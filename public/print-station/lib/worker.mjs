import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { backoffSeconds, isRetryable } from "./api.mjs";

/**
 * The loop: ask for work, take it, print it, say what happened.
 *
 * Deliberately dull. The interesting decisions — which job to take next, when
 * to back off, whether a failure is the shop's or the server's — are pure
 * functions above the loop so they can be tested without a printer, a network
 * or a clock.
 */

/**
 * Which job to print next.
 *
 * Oldest first, because the customer who has been waiting longest is the one
 * about to ask. Jobs another agent already holds a live claim on are skipped:
 * the server would refuse the claim anyway, and trying wastes the interval a
 * waiting customer is counting.
 */
export function nextJob(jobs, now = Date.now()) {
  const available = (Array.isArray(jobs) ? jobs : []).filter((job) => {
    if (!job || !job.id) return false;
    if (!job.claimed_by_agent) return true;
    const expiry = job.claim_expires_at ? Date.parse(job.claim_expires_at) : NaN;
    return Number.isFinite(expiry) && expiry < now;
  });

  available.sort((a, b) => Date.parse(a.created_at ?? 0) - Date.parse(b.created_at ?? 0));
  return available[0] ?? null;
}

/**
 * What to tell the shop owner when something breaks.
 *
 * A shop owner is not going to read a stack trace, and "Error: ECONNREFUSED"
 * on a screen behind a counter is the same as no message at all. Each of
 * these names the thing they can actually go and fix.
 */
export function describeFailure(error) {
  const status = error?.status;
  const raw = String(error?.message ?? error ?? "Something went wrong");

  if (status === 401) {
    /*
      Almost always the same story: a newer download was made, which issues a
      new key and retires this one, and the older folder is still the one
      being run. Naming that is far more use than "issue a new one", which is
      what this used to say and what sent a shop round the loop again.
    */
    return "Your key was refused. A newer download replaced it — run the newest downloaded folder, or download again from your dashboard.";
  }
  if (status === 409) return "Another computer took that job first. Nothing to do.";
  if (status === 404) return "That job is no longer on the server.";
  if (status === 503) return "The server is busy. Trying again shortly.";
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|abort|network|fetch failed/i.test(raw)) {
    return "No internet. Jobs will print as soon as the connection is back.";
  }
  if (/printer|spool|lp:|no such (file|printer)/i.test(raw)) {
    return "The printer did not accept the job. Check it is switched on, has paper, and is not showing an error.";
  }
  return raw.slice(0, 200);
}

/** A failure that means "stop and ask a human" rather than "try again". */
export function isFatal(error) {
  return error?.status === 401 || error?.status === 403;
}

/**
 * Download a claimed file to a temporary folder.
 *
 * Written to disk because operating system print commands take a path, not a
 * stream — and deleted in a `finally` regardless of how printing went. The
 * shop's promise to its customers is that nothing of theirs stays on this
 * computer, and a file left behind by a failed print would break it quietly.
 */
export async function downloadToTemp(url, fileName, fetchImpl = fetch) {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Could not download the file (${response.status})`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const folder = mkdtempSync(join(tmpdir(), "dcps-"));
  // The server's name for the file is used only for its extension: a file
  // name arrives from a customer's device and must never decide a path.
  const extension = /\.([a-z0-9]{1,5})$/i.exec(String(fileName ?? ""))?.[1]?.toLowerCase() ?? "pdf";
  const path = join(folder, `job.${extension.replace(/[^a-z0-9]/g, "") || "pdf"}`);
  writeFileSync(path, buffer);

  return {
    path,
    cleanup: () => {
      try {
        rmSync(folder, { recursive: true, force: true });
      } catch {
        /* A file we cannot delete is worth no crash, but it is worth a log. */
      }
    },
  };
}

/**
 * One job, start to finish.
 *
 * Every exit path reports to the server. A job that is claimed and never
 * reported sits as "printing" on the customer's screen until its claim
 * expires — five silent minutes in front of somebody who has already paid.
 */
export async function runJob({ api, job, print, log, download = downloadToTemp }) {
  let claim;
  try {
    claim = await api.claim(job.id);
  } catch (error) {
    if (error?.status === 409) {
      log("info", `Job ${job.job_number ?? job.id} was taken by another computer.`);
      return { outcome: "skipped" };
    }
    throw error;
  }

  const file = claim?.file;
  if (!file?.download_url) {
    await api.report(job.id, "failed", "The server did not send a file to print.");
    return { outcome: "failed", message: "No file on the job." };
  }

  let temp = null;
  try {
    temp = await download(file.download_url, file.file_name);
    log("info", `Printing ${job.job_number ?? job.id}: ${job.copies ?? 1} × ${job.pages ?? "?"} pages, ${job.paper_size ?? "A4"} ${job.color_mode ?? "mono"}.`);
    await print({ filePath: temp.path, job });
    await api.report(job.id, "printed");
    log("success", `Printed ${job.job_number ?? job.id}.`);
    return { outcome: "printed" };
  } catch (error) {
    const message = describeFailure(error);
    log("error", `Job ${job.job_number ?? job.id} failed: ${message}`);
    // Reported as failed so the job returns to the queue and the customer is
    // told, rather than being left to time out. A failure to report is
    // swallowed: it must not mask the original problem in the log.
    await api.report(job.id, "failed", message).catch(() => {});
    return { outcome: "failed", message };
  } finally {
    temp?.cleanup();
  }
}

/**
 * The polling loop.
 *
 * `state` is passed in rather than held here so the setup page can read what
 * the loop is doing — connected or not, what it last printed, what went
 * wrong — without the two sharing anything more than an object.
 */
export function createWorker({ api, config, print, log, state, sleep = defaultSleep, printers = [] }) {
  let running = false;
  let stopped = false;

  async function tick() {
    const { jobs, station } = await api.listJobs(printers);
    state.connected = true;
    // Shown on the shop's own screen so a partner can see the key landed on
    // their counter rather than somebody else's.
    if (station?.display_name) state.stationName = station.display_name;
    state.lastPollAt = new Date().toISOString();
    state.queued = Array.isArray(jobs) ? jobs.length : 0;

    const job = nextJob(jobs);
    if (!job) return false;

    const result = await runJob({ api, job, print, log });
    if (result.outcome === "printed") state.printed += 1;
    if (result.outcome === "failed") state.failed += 1;
    return true;
  }

  async function loop() {
    running = true;
    let failures = 0;

    while (!stopped) {
      try {
        const didWork = await tick();
        failures = 0;
        state.lastError = null;
        // After a print, look again immediately: two customers in a queue
        // should not wait an interval each.
        await sleep(didWork ? 250 : config.pollSeconds * 1000);
      } catch (error) {
        state.connected = false;
        state.lastError = describeFailure(error);

        if (isFatal(error)) {
          log("error", state.lastError);
          state.stoppedReason = state.lastError;
          break;
        }
        if (!isRetryable(error?.status)) {
          log("error", state.lastError);
        }

        failures += 1;
        const wait = backoffSeconds(failures, config.pollSeconds);
        if (failures === 1 || failures % 5 === 0) log("warn", `${state.lastError} Retrying in ${wait}s.`);
        await sleep(wait * 1000);
      }
    }

    running = false;
  }

  return {
    start: () => {
      if (running) return;
      stopped = false;
      void loop();
    },
    stop: () => {
      stopped = true;
    },
    isRunning: () => running,
    tick,
  };
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
