import { NextResponse } from "next/server";

import { authenticateAgent, bearerToken } from "@/lib/print/agent-auth";

export const dynamic = "force-dynamic";

/**
 * "Is this key any good, and whose counter is it?"
 *
 * A shop owner in a small town cannot debug a 401. Ours spent an afternoon
 * re-pasting a key that was correct, then a key that had been retired,
 * because every failure said the same sentence: your key was refused. The
 * program had no way to ask which of the several possible things was wrong,
 * so it guessed, and its guess sent them round the loop again.
 *
 * This is the question asked plainly. It tells the caller which shop the key
 * belongs to, or exactly why it does not work — and it is the same
 * authentication the real endpoints use, so a pass here means a pass there
 * rather than a second implementation that can drift.
 */
export async function GET(request: Request) {
  const presented = bearerToken(request.headers.get("authorization"));

  if (!presented) {
    return NextResponse.json(
      { ok: false, reason: "no_key", message: "No key was sent. Paste your key into the settings page." },
      { status: 400 },
    );
  }

  const caller = await authenticateAgent(request);

  if (!caller.ok) {
    return caller.reason === "unavailable"
      ? NextResponse.json(
          {
            ok: false,
            reason: "server_unavailable",
            message: "The website cannot reach its database. Nothing wrong with your key — try again shortly.",
          },
          { status: 503 },
        )
      : NextResponse.json(
          {
            ok: false,
            reason: "unknown_key",
            /*
              Named precisely, because the shop's next move depends on it:
              a retired key is fixed by fetching the current one, and no
              amount of re-pasting this one will ever work.
            */
            message:
              "This key is not the current one for any counter. It was almost certainly replaced by a newer download or by 'Issue a new one'. Get the current key from your dashboard.",
          },
          { status: 401 },
        );
  }

  if (!caller.station) {
    return NextResponse.json({ ok: true, kind: "platform", message: "Connected as the platform's own counter." });
  }

  const station = caller.station;
  return NextResponse.json({
    ok: true,
    kind: "station",
    code: station.code,
    displayName: station.display_name,
    acceptingOrders: station.accepting_orders,
    // The shop is open or shut by its own switch, and a closed counter takes
    // no orders — which looks exactly like a broken agent from behind the
    // desk unless somebody says so.
    message: station.accepting_orders
      ? `Connected to ${station.display_name}.`
      : `Connected to ${station.display_name}, but the counter is switched off, so no orders will arrive.`,
  });
}
