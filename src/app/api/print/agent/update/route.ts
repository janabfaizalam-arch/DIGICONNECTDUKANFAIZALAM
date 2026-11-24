import { NextResponse } from "next/server";

import { authFailureResponse, authenticateAgent } from "@/lib/print/agent-auth";
import { PRINT_STATION_FILES } from "@/lib/print/bundle-files.generated";
import { PRINT_STATION_VERSION } from "@/lib/print/bundle-version.generated";

export const dynamic = "force-dynamic";

/**
 * The current connector, for a connector to update itself.
 *
 * Only a station's own key gets it. It is the program and nothing else: no
 * key, no config — the computer keeps the key it already has, so updating
 * never logs a shop out. The connector writes these files over its own
 * folder and restarts (see print-station/lib/self-update.mjs).
 */
export async function GET(request: Request) {
  const caller = await authenticateAgent(request);
  if (!caller.ok) {
    const failure = authFailureResponse(caller);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
  if (!caller.station) {
    return NextResponse.json({ error: "Only a station's connector updates this way." }, { status: 400 });
  }

  return NextResponse.json(
    { version: PRINT_STATION_VERSION, files: PRINT_STATION_FILES },
    { headers: { "Cache-Control": "no-store" } },
  );
}
