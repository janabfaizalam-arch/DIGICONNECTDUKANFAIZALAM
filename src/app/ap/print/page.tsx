import { redirect } from "next/navigation";

import { PrintStationSetup } from "@/components/ap/print-station-setup";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getStationForPartner } from "@/lib/print/stations";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function ApPrintStationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const partner = await getAgencyPartnerByUserId(user.id);
  if (!partner) redirect("/unauthorized");

  const station = await getStationForPartner(partner.id);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--dc-flame)]">
          Print Station
        </p>
        <h1 className="mt-1.5 text-[1.5rem] font-extrabold leading-tight tracking-[-0.025em] text-[var(--dc-ink)] sm:text-[1.9rem]">
          Your printer, on a QR
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13.5px] font-medium leading-[1.6] text-[var(--dc-body)]">
          A customer scans the code on your counter, picks their pages, pays, and your printer runs. They
          need no app and no pen drive, and nothing of theirs is left on your computer.
        </p>
      </div>

      <PrintStationSetup initialStation={station} siteUrl={getSiteUrl()} />
    </div>
  );
}
