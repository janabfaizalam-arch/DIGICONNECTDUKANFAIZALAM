import { redirect } from "next/navigation";
import { CheckCircle2, HandCoins, Hourglass, RotateCcw } from "lucide-react";

import { CommissionsLedgerClient } from "@/components/ap/commissions-ledger-client";
import { MetricCard, PageHeader } from "@/components/ap/ui";
import { summarizeCommissions } from "@/lib/ap/finance";
import { formatCount, formatINR } from "@/lib/ap/format";
import { getAgencyPartnerByUserId, getAPCommissions } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function APCommissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) redirect("/unauthorized");

  // Full partner set for trusted aggregates (not a partial page window).
  const commissions = await getAPCommissions(ap.id, 10_000);
  const summary = summarizeCommissions(commissions);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F6F8FC] pb-24 text-[#0F172A] md:pb-10">
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <PageHeader
          eyebrow="Finance"
          title="Commissions"
          description="Earnings ledger for eligible applications. Totals are computed from your complete commission history."
        />

        <section aria-label="Commission metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total earned" value={formatINR(summary.totalEarned)} icon={<HandCoins className="h-4 w-4" />} />
          <MetricCard label="Pending" value={formatINR(summary.pending)} icon={<Hourglass className="h-4 w-4" />} hint="Pending + earned" />
          <MetricCard label="Approved" value={formatINR(summary.approved)} icon={<CheckCircle2 className="h-4 w-4" />} />
          <MetricCard label="Paid" value={formatINR(summary.paid)} />
          <MetricCard
            label="Reversed"
            value={formatINR(summary.reversed)}
            icon={<RotateCcw className="h-4 w-4" />}
            hint={`${formatCount(summary.eligibleCount)} eligible rows`}
          />
        </section>

        <CommissionsLedgerClient commissions={commissions} />
      </div>
    </main>
  );
}
