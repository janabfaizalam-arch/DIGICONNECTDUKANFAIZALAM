import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SmartPrintFlow } from "@/components/print/smart-print-flow";
import { getStationByCode } from "@/lib/print/stations";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const station = await getStationByCode(code);

  return {
    title: station ? `Print at ${station.display_name}` : "Print",
    description: station
      ? `Upload a file and collect your prints at ${station.display_name}. No app, no pen drive.`
      : "Scan the code at the counter to print.",
    // A shop's counter page is for the person standing in front of it.
    robots: { index: false, follow: false },
  };
}

/**
 * What a customer sees after scanning the QR on a counter.
 *
 * Deliberately not behind a login. Somebody standing at a shop with a document
 * on their phone will not create an account to print one page, and asking them
 * to is how this loses to the pen drive it is meant to replace.
 *
 * The station is resolved from the code in the URL, so the page carries the
 * shop's own name and the shop's own rates. Everything the customer is charged
 * is computed on the server from that row.
 */
export default async function StationPrintPage({ params }: PageProps) {
  const { code } = await params;
  const station = await getStationByCode(code);

  if (!station || !station.is_active) notFound();

  return (
    <SmartPrintFlow
      station={{
        code: station.code,
        displayName: station.display_name,
        address: station.address,
        rates: station.rates,
        acceptingOrders: station.accepting_orders,
        autoDeleteMinutes: station.auto_delete_minutes,
        agentConnected: station.agent_connected,
        /*
          The shop's own presets.

          Sent whole rather than merged here, so the flow can show a partner's
          twelve-photo default the moment the service is chosen and still let
          the customer change it.
        */
        defaults: station.smart_print_defaults,
      }}
    />
  );
}
