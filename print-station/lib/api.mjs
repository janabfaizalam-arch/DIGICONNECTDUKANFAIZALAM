/**
 * Everything this program says to the server.
 *
 * Four calls, and nothing else. Written against the endpoints in
 * src/app/api/print/agent/ — if one of those changes shape, this file is the
 * only place that has to follow.
 */

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Whether a failure is worth trying again.
 *
 * A wrong key will be just as wrong in five seconds, and retrying it forever
 * fills a log with noise that hides the real problem. A timeout or a 502 is a
 * shop's broadband, and giving up on those would mean walking to the computer
 * every time the wifi blinked.
 */
export function isRetryable(status) {
  if (status === undefined || status === null) return true; // network-level: no reply at all
  if (status === 408 || status === 425 || status === 429) return true;
  return status >= 500;
}

/** Back off after repeated failures, but never so far that a shop stalls. */
export function backoffSeconds(consecutiveFailures, base = 5) {
  const capped = Math.min(6, Math.max(0, consecutiveFailures));
  return Math.min(120, base * 2 ** capped);
}

export function createApi({ serverUrl, agentToken, fetchImpl = fetch, timeoutMs = 30_000 }) {
  const base = String(serverUrl).replace(/\/+$/, "");

  async function call(path, { method = "GET", body } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(`${base}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${agentToken}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await response.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!response.ok) {
        throw new ApiError(json?.error || `Server replied ${response.status}`, response.status);
      }
      return json ?? {};
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    /** Jobs waiting at this station. Also the heartbeat the dashboard reads. */
    listJobs: (printers = []) => {
      const query = printers.length ? `?printers=${encodeURIComponent(printers.join(","))}` : "";
      return call(`/api/print/agent/jobs${query}`);
    },

    /** Take a job, and get a download link that expires in five minutes. */
    claim: (jobId) => call("/api/print/agent/claim-job", { method: "POST", body: { job_id: jobId } }),

    /** "Is this key any good, and whose counter is it?" */
    whoami: () => call("/api/print/agent/whoami"),

    /** Say what happened. The customer's screen is watching this. */
    report: (jobId, status, errorMessage) =>
      call("/api/print/agent/update-status", {
        method: "POST",
        body: { job_id: jobId, status, error_message: errorMessage ?? "" },
      }),
  };
}
