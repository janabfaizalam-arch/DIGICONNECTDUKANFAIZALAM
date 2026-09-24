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
 * The DC Partner home page: a main column and a rail.
 *
 * Not a twelve-column auto-placed grid, and not a stack of full-width bands.
 * Both of those fail on a wide panel in opposite ways — bands leave 1700px of
 * canvas around a one-line figure, and an auto-placed grid sizes each row to
 * its tallest cell, so a short card beside a tall one punches a hole under
 * itself. Two flex columns pack tightly and leave neither.
 *
 * The split follows attention rather than size: the main column is the work
 * (who you are, what you do, what the numbers say), the rail is what is
 * waiting (what is on fire, the queue, who you serve, what is on offer).
 *
 * Below `xl` the rail folds under the main column; below `lg` everything is
 * one column, because on a phone a column is the right answer.
 *
 * Each fact still appears in exactly one place:
 *
 *   identity & today's money  → header (the page's single hero figure)
 *   what is on fire           → attention (hidden when nothing is)
 *   what you came to do       → quick actions
 *   the four headline numbers → KPI row
 *   how the business moves    → analytics charts
 *   the rest of the money     → earnings
 *   what is waiting on you    → work queue
 *   the latest work           → applications, then customers
 *   offers                    → announcements, last: an ad, not the job
 */
export function PartnerHomeView({ data }: PartnerHomeViewProps) {
  const isOffice = data.partnerType === "office_staff";
  const isCompany = data.partnerType === "company_partner" && data.canManageTeam;

  return (
    <div className="w-full px-3 pb-6 pt-3 sm:px-4 md:px-5 md:pb-10 xl:px-6">
      {/* Offers lead the page: it is the one place the company talks to every
          partner at once, and a rail at the bottom is where it went unread. */}
      <AnnouncementSlider banners={data.banners} className="mb-3" />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
        {/* Main column — the work. */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <HomeHeader identity={data.identity} />

          <QuickActions partnerType={data.partnerType} />

          <KpiRow kpis={data.kpis} />

          <AnalyticsPanel analytics={data.analytics} />

          <EarningsPanel data={data.collection} showTeamToggle={isCompany} />

          {isCompany && data.teamSummary ? <TeamPanel summary={data.teamSummary} /> : null}
          {isOffice && data.officeWork ? <OfficeWorkSummary summary={data.officeWork} /> : null}

          <RecentApplications items={data.recentApplications} />
        </div>

        {/* Rail — what is waiting. Fixed width so the main column keeps the
            room it needs for tables and charts as the screen grows. */}
        <div className="flex w-full min-w-0 flex-col gap-3 xl:w-[360px] xl:shrink-0 2xl:w-[400px]">
          <AttentionStrip items={data.attention} />

          <WorkQueue groups={data.workQueue} />

          <CustomersPanel customers={data.recentCustomers} variant={isOffice ? "assigned" : "own"} />
        </div>
      </div>
    </div>
  );
}
