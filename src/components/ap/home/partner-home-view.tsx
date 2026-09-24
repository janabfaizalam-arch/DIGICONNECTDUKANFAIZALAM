import { AnalyticsPanel } from "@/components/ap/home/analytics-panel";
import { AnnouncementSlider } from "@/components/ap/home/announcement-slider";
import { AttentionStrip } from "@/components/ap/home/attention-strip";
import { CustomersPanel } from "@/components/ap/home/customers-panel";
import { EarningsPanel } from "@/components/ap/home/earnings-panel";
import { HomeHeader } from "@/components/ap/home/home-header";
import { KpiRow } from "@/components/ap/home/kpi-row";
import { OfficeWorkSummary } from "@/components/ap/home/office-work-summary";
import { QuickActions } from "@/components/ap/home/quick-actions";
import { RecentApplications } from "@/components/ap/home/recent-applications";
import { TeamPanel } from "@/components/ap/home/team-panel";
import { WorkQueue } from "@/components/ap/home/work-queue";
import type { PartnerHomePayload } from "@/lib/ap/home-types";

type PartnerHomeViewProps = {
  data: PartnerHomePayload;
};

/**
 * The DC Partner home page.
 *
 * One order for every partner type, with only the role-specific block swapping
 * in near the end. Each fact appears in exactly one section:
 *
 *   identity & today's money  → header (the page's single hero figure)
 *   what is on fire           → attention strip (hidden when nothing is)
 *   offers                    → announcements
 *   what you came to do       → quick actions
 *   the four headline numbers → KPI row
 *   how the business moves    → analytics charts
 *   the rest of the money     → earnings panel
 *   what is waiting on you    → work queue (one tabbed list, not three)
 *   the latest work           → recent applications
 *   who you serve             → customers panel
 *
 * The previous version repeated today's collection, commission and the pending
 * lists across four separate blocks; anything a section above already states is
 * not restated below.
 */
export function PartnerHomeView({ data }: PartnerHomeViewProps) {
  const isOffice = data.partnerType === "office_staff";
  const isCompany = data.partnerType === "company_partner" && data.canManageTeam;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-6 pt-3.5 md:space-y-[18px] md:px-6 md:pb-10">
      <HomeHeader identity={data.identity} />

      <AttentionStrip items={data.attention} />

      <AnnouncementSlider banners={data.banners} />

      <QuickActions partnerType={data.partnerType} />

      <KpiRow kpis={data.kpis} />

      <AnalyticsPanel analytics={data.analytics} />

      <EarningsPanel data={data.collection} showTeamToggle={isCompany} />

      <WorkQueue groups={data.workQueue} />

      {isCompany && data.teamSummary ? <TeamPanel summary={data.teamSummary} /> : null}
      {isOffice && data.officeWork ? <OfficeWorkSummary summary={data.officeWork} /> : null}

      <RecentApplications items={data.recentApplications} />

      <CustomersPanel customers={data.recentCustomers} variant={isOffice ? "assigned" : "own"} />
    </div>
  );
}
