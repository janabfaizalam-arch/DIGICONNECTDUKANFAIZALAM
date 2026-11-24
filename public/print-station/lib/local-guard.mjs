/**
 * Who may talk to the settings page on localhost:7171.
 *
 * Listening on 127.0.0.1 keeps the shop's network out, but not the shop's own
 * browser: any website the counter PC opens can fire requests at localhost.
 * Two ways that went wrong:
 *
 *  - A "simple" cross-site POST (text/plain, no preflight) reached /api/save,
 *    which read the body as JSON whatever its type — so a web page could
 *    point serverUrl at itself, and the program would then send this shop's
 *    key to it on the next poll.
 *  - DNS rebinding: a site re-pointing its own hostname at 127.0.0.1 can read
 *    responses, including /api/state, which carried the key.
 *
 * So: the Host must be localhost or 127.0.0.1 on our port (kills rebinding),
 * and any request that changes something must be JSON from our own origin
 * (kills cross-site POSTs — a JSON POST from elsewhere needs a preflight this
 * server never grants).
 */
export function isAllowedHost(host, port) {
  const value = String(host ?? "").toLowerCase();
  return value === `localhost:${port}` || value === `127.0.0.1:${port}`;
}

export function isAllowedWrite({ method, origin, contentType, port }) {
  if (method === "GET" || method === "HEAD") return true;
  if (!/^application\/json\b/i.test(String(contentType ?? ""))) return false;
  if (origin === undefined || origin === null || origin === "") return false;
  return origin === `http://localhost:${port}` || origin === `http://127.0.0.1:${port}`;
}

/** What a saved token field means: blank or the masked display keeps the current key. */
export function tokenFromForm(submitted, current) {
  const value = String(submitted ?? "").trim();
  if (!value || value.includes("…")) return current;
  return value;
}
