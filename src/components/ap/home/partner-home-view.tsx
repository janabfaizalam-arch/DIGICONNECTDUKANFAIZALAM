import { AnnouncementSlider } from "@/components/ap/home/announcement-slider";
import { CollectionCommission } from "@/components/ap/home/collection-commission";
import { CompanyTeamSummary } from "@/components/ap/home/company-team-summary";
import { OfficeWorkSummary } from "@/components/ap/home/office-work-summary";
import { OverviewCards } from "@/components/ap/home/overview-cards";
import { PendingWork } from "@/components/ap/home/pending-work";
import { QuickActions } from "@/components/ap/home/quick-actions";
import { RecentApplications } from "@/components/ap/home/recent-applications";
import { StandardOpsFooter } from "@/components/ap/home/standard-ops-footer";
import type { PartnerHomePayload } from "@/lib/ap/home-types";

type PartnerHomeViewProps = {
  data: PartnerHomePayload;
};

export function PartnerHomeView({ data }: PartnerHomeViewProps) {
  const isOffice = data.partnerType === "office_staff";
  const isCompany = data.partnerType === "company_partner" && data.canManageTeam;
  const isStandard =
    data.partnerType === "business_partner" || data.partnerType === "field_executive";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <AnnouncementSlider banners={data.banners} />
      <QuickActions partnerType={data.partnerType} />
      <OverviewCards cards={data.overview} />
      <PendingWork items={data.pendingWork} />
      <RecentApplications items={data.recentApplications} />
      <CollectionCommission data={data.collection} showTeamToggle={Boolean(isCompany)} />
      {isCompany && data.teamSummary ? <CompanyTeamSummary summary={data.teamSummary} /> : null}
      {isOffice && data.officeWork ? (
        <OfficeWorkSummary summary={data.officeWork} recentCustomers={data.recentCustomers} />
      ) : null}
      {isStandard ? (
        <StandardOpsFooter recentCustomers={data.recentCustomers} pendingWork={data.pendingWork} />
      ) : null}
    </div>
  );
}
