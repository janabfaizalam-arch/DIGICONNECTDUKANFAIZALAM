import { NextResponse } from "next/server";

import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import {
  createStation,
  getStationForPartner,
  rotateAgentToken,
  updateStation,
} from "@/lib/print/stations";

export const dynamic = "force-dynamic";

/**
 * A partner's own print station.
 *
 * Every handler resolves the partner from the session and works only on their
 * row — a station id is never taken from the request. Two shops on this
 * platform must not be able to read each other's rates, reach each other's
 * printer, or see each other's customers' files, and the cheapest way to
 * guarantee that is never to accept an identifier that could belong to
 * somebody else.
 */
async function partnerFromSession() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!(await isActiveAgent(user))) return null;
  return getAgencyPartnerByUserId(user.id);
}

export async function GET() {
  const partner = await partnerFromSession();
  if (!partner) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  return NextResponse.json({ data: await getStationForPartner(partner.id) });
}

/**
 * Set the station up.
 *
 * The agent token comes back exactly once, here. It is stored only as a hash,
 * so a partner who loses it gets a new one rather than the old one back.
 */
export async function POST(request: Request) {
  const partner = await partnerFromSession();
  if (!partner) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  const existing = await getStationForPartner(partner.id);
  if (existing) {
    return NextResponse.json({ error: "This partner already has a print station." }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as { displayName?: string; address?: string };
  const displayName = String(body.displayName ?? "").trim();
  if (displayName.length < 2) {
    return NextResponse.json({ error: "Give the counter a name customers will recognise." }, { status: 400 });
  }

  const created = await createStation({
    partnerId: partner.id,
    displayName,
    address: body.address ?? null,
  });

  if (!created) {
    return NextResponse.json(
      { error: "Could not create the station. The print station table may not exist yet." },
      { status: 503 },
    );
  }

  return NextResponse.json({ data: created.station, agentToken: created.agentToken });
}

/** Change the name, the rates, the printer, or whether the counter is open. */
export async function PATCH(request: Request) {
  const partner = await partnerFromSession();
  if (!partner) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  /*
    A token rotation is a separate intent from an edit, so it is asked for
    explicitly. Rotating silently on every save would break a working shop's
    printer every time somebody corrected a typo in the address.
  */
  if (body.action === "rotate_token") {
    const token = await rotateAgentToken(partner.id);
    if (!token) return NextResponse.json({ error: "Could not issue a new key." }, { status: 503 });
    return NextResponse.json({ agentToken: token });
  }

  const rates = (body.rates ?? {}) as Record<string, unknown>;
  const station = await updateStation(partner.id, {
    display_name: body.displayName === undefined ? undefined : String(body.displayName),
    address: body.address === undefined ? undefined : String(body.address ?? ""),
    printer_name: body.printerName === undefined ? undefined : String(body.printerName ?? ""),
    accepting_orders: body.acceptingOrders === undefined ? undefined : Boolean(body.acceptingOrders),
    auto_delete_minutes:
      body.autoDeleteMinutes === undefined ? undefined : Number(body.autoDeleteMinutes),
    smart_print_defaults:
      body.smartPrintDefaults === undefined
        ? undefined
        : (body.smartPrintDefaults as Record<string, Record<string, unknown>>),
    require_approval: body.requireApproval === undefined ? undefined : Boolean(body.requireApproval),
    rates: {
      a4_mono: rates.a4_mono === undefined ? undefined : Number(rates.a4_mono),
      a4_color: rates.a4_color === undefined ? undefined : Number(rates.a4_color),
      a3_mono: rates.a3_mono === undefined ? undefined : Number(rates.a3_mono),
      a3_color: rates.a3_color === undefined ? undefined : Number(rates.a3_color),
    } as never,
  });

  if (!station) return NextResponse.json({ error: "Could not save." }, { status: 503 });
  return NextResponse.json({ data: station });
}
