import "server-only";

import { getStationByAgentToken, touchAgent, type PrintStation } from "@/lib/print/stations";

/**
 * Who is asking on behalf of a printer.
 *
 * Two callers exist and must never be confused for one another. A partner's
 * Print Station presents the token issued to that shop and may touch only
 * that shop's jobs. The platform's own counter presents the single
 * environment key it has always used, and takes the jobs that belong to no
 * station — every job that existed before stations did.
 *
 * The whole point of this module is that the three agent endpoints answer
 * "whose job is this?" the same way. When only the jobs listing knew about
 * stations, a shop could see its own queue and then claim somebody else's job
 * by id, because claiming did not ask.
 */

export type AgentCaller = {
  /** The shop, or null for the platform's own counter. */
  station: PrintStation | null;
  /** What gets written into the job log. */
  agentId: string;
};

/** Pull the bearer value out of an Authorization header. */
export function bearerToken(header: string | null | undefined): string {
  return String(header ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

/**
 * Decide which jobs a caller may act on.
 *
 * Returned as the pair PostgREST's `.filter()` wants, so every endpoint
 * applies the same condition rather than each writing its own and one of
 * them getting it wrong: a station matches its own id, the platform counter
 * matches rows whose station is null.
 */
export function stationScope(station: PrintStation | null): { operator: "eq" | "is"; value: string | null } {
  return station ? { operator: "eq", value: station.id } : { operator: "is", value: null };
}

/**
 * Authenticate an agent request.
 *
 * Returns null when the caller is neither a known station nor the platform
 * key — the endpoints turn that into a 401. A station's heartbeat is recorded
 * here so that every call it makes, not only its polling, keeps the partner's
 * "Connected" light on.
 */
export async function authenticateAgent(request: Request): Promise<AgentCaller | null> {
  const presented = bearerToken(request.headers.get("authorization"));
  const secretKey = process.env.PRINT_AGENT_SECRET_KEY;

  const station = presented ? await getStationByAgentToken(presented) : null;

  if (station) {
    await touchAgent(station.id);
    // A station's own code is a far more useful thing to find in a job log
    // than "default-agent", and unlike a header the caller cannot choose it.
    return { station, agentId: `station:${station.code}` };
  }

  if (!secretKey || !presented || presented !== secretKey) return null;

  const headerId = request.headers.get("x-agent-id")?.trim();
  return { station: null, agentId: headerId || "default-agent" };
}
