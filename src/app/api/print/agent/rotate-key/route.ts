import { NextResponse } from "next/server";

import { authFailureResponse, authenticateAgent, bearerToken } from "@/lib/print/agent-auth";
import { hashAgentToken } from "@/lib/print/stations";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Swap the key a station was installed with for one that exists only on the
 * shop's computer.
 *
 * The download zip carries the station's key in plain text, and the zip stays
 * in Downloads, gets emailed, gets copied to a pen drive. Whoever holds it can
 * pull that shop's customers' documents. So on first start the program makes
 * a new key itself, sends only its hash, and from then on the key in the zip
 * is dead.
 *
 * The computer generates the key, not the server, so a reply lost in transit
 * cannot lock it out: it saved the new key before asking, and simply tries
 * the new one next time.
 *
 * The update is compare-and-swap on the presented key's hash, so two copies
 * racing with the same zip key cannot both win.
 */
export async function POST(request: Request) {
  const caller = await authenticateAgent(request);
  if (!caller.ok) {
    const failure = authFailureResponse(caller);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
  if (!caller.station) {
    return NextResponse.json({ error: "Only a station key can be rotated." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { new_key_hash?: string } | null;
  const newHash = String(body?.new_key_hash ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(newHash)) {
    return NextResponse.json({ error: "new_key_hash must be a sha256 hex digest." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Server is not configured." }, { status: 503 });

  const presentedHash = hashAgentToken(bearerToken(request.headers.get("authorization")));
  if (newHash === presentedHash) {
    return NextResponse.json({ error: "The new key must differ from the old one." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("print_stations")
    .update({ agent_token_hash: newHash, updated_at: new Date().toISOString() })
    .eq("id", caller.station.id)
    .eq("agent_token_hash", presentedHash)
    .select("id");

  if (error) return NextResponse.json({ error: "Could not change the key." }, { status: 503 });
  if (!data || data.length === 0) return NextResponse.json({ error: "The key was already changed." }, { status: 409 });

  return NextResponse.json({ ok: true });
}
