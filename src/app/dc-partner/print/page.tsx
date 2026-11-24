import { redirect } from "next/navigation";

import { PrintStationSetup } from "@/components/ap/print-station-setup";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { countWaitingJobs, getStationForPartner } from "@/lib/print/stations";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function ApPrintStationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/dc-partner/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const partner = await getAgencyPartnerByUserId(user.id);
  if (!partner) redirect("/unauthorized");

  const station = await getStationForPartner(partner.id);
  const waitingJobs = station ? await countWaitingJobs(station.id) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Digi Print</p>
        <h1 className="mt-1 text-[1.4rem] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[1.65rem]">
          Aapka printer, ek QR par
        </h1>
        <p className="mt-1 max-w-2xl text-[13.5px] text-slate-500">
          Customer QR scan kare, file bheje, pay kare — printer turant chale. Har payment ki kamai aapke wallet me.
        </p>
      </div>

      <PrintStationSetup initialStation={station} siteUrl={getSiteUrl()} waitingJobs={waitingJobs} />
    </div>
  );
}
