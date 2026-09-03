import { NextResponse } from "next/server";

import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { PRINT_STATION_FILES } from "@/lib/print/bundle-files.generated";
import { PRINT_STATION_VERSION } from "@/lib/print/bundle-version.generated";
import { getStationForPartner, rotateAgentToken } from "@/lib/print/stations";
import { createZip, type ZipEntry } from "@/lib/print/zip";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/**
 * The partner's Print Station, as one file they double click.
 *
 * The install line that came before this asked a shop owner to open
 * PowerShell, paste a command, and then copy a key across from another
 * screen. Three chances to get it wrong before anything printed, and the key
 * is shown once. This builds the program with that shop's key already inside
 * it, so the only step left is "unzip and run".
 *
 * A fresh key is issued on every download, and the response says so. It has
 * to be: the stored key is a hash, so there is no way to put the existing one
 * back into a file. Anything else would mean handing out a bundle whose key
 * is blank.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  if (!(await isActiveAgent(user))) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  const partner = await getAgencyPartnerByUserId(user.id);
  if (!partner) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  const station = await getStationForPartner(partner.id);
  if (!station) {
    return NextResponse.json({ error: "Set your print counter up first." }, { status: 409 });
  }

  const agentToken = await rotateAgentToken(partner.id);
  if (!agentToken) {
    return NextResponse.json({ error: "Could not issue a key for this download." }, { status: 503 });
  }

  const config = {
    serverUrl: getSiteUrl(),
    agentToken,
    printerName: station.printer_name ?? "",
    pollSeconds: 5,
    duplex: false,
    sumatraPath: "",
  };

  const entries: ZipEntry[] = [
    ...Object.entries(PRINT_STATION_FILES).map(([name, content]) => ({ name, content })),
    { name: "config.json", content: JSON.stringify(config, null, 2) },
    { name: "PEHLE YE PADHIYE.txt", content: firstRunNote(station.display_name, station.code) },
  ];

  const zip = createZip(entries);

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(zip.length),
      /*
        The version and the date are in the name on purpose.

        Every download used to be called the same thing, so a Downloads folder
        filled with "(1)", "(2)", "(3)" and there was no way to tell which one
        was newest — a shop ran an old copy for an afternoon chasing a bug
        that had already been fixed.
      */
      "Content-Disposition": `attachment; filename="DigiConnect-Print-Station-${station.code}-v${PRINT_STATION_VERSION}-${new Date().toISOString().slice(0, 10)}.zip"`,
      // The bundle carries a live credential. It must never sit in a proxy,
      // a browser cache, or a CDN edge after the partner has saved it.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}

/** The one thing in the folder a shop owner will actually open first. */
function firstRunNote(shopName: string, code: string) {
  return [
    "DigiConnect Print Station",
    `${shopName}  (counter code ${code})`,
    "",
    "AAPKI KEY IS FOLDER MEIN PEHLE SE HAI. Kuch paste nahi karna.",
    "",
    "1. Is folder ko unzip kar lijiye — ZIP ke andar se seedha mat chalaiye.",
    '2. "Start Print Station" par double-click kijiye.',
    "3. Pehli baar Node.js maangega — LTS install kar lijiye, phir dobara double-click.",
    '4. Printer chuniye aur "Print a test page" dabaiye. Kagaz nikla = ho gaya.',
    "",
    "5. Ek baar \"Background me chalaiye\" par bhi double-click kar dijiye.",
    "   Uske baad kaali window ki zaroorat nahi: program chhup kar chalega aur",
    "   computer on hote hi khud shuru ho jayega. Hatana ho to \"Background",
    "   band kijiye\".",
    "",
    "Background chalu na kiya ho to program tabhi chalta hai jab wo kaali window",
    "khuli ho — band karne se printing ruk jati hai.",
    "",
    "DHYAN DIJIYE: har naye download par nayi key banti hai, aur purani band ho",
    "jati hai. Ek hi computer par ek hi folder rakhiye.",
    "",
    "Customer ki file sirf print ke waqt aati hai aur print hote hi delete ho",
    "jati hai — chahe print kamyab ho ya fail.",
    "",
  ].join("\r\n");
}
