import { redirect } from "next/navigation";
import {
  getAgencyPartnerByUserId,
  getAPDashboardStats,
  getAPApplications,
  getActiveAnnouncements,
} from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { APDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function APDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  const active = await isActiveAgent(user);
  if (!active) {
    redirect("/unauthorized");
  }

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) {
    redirect("/unauthorized");
  }

  const [stats, applications, announcements] = await Promise.all([
    getAPDashboardStats(ap.id),
    getAPApplications(ap.id, 5),
    getActiveAnnouncements(ap.id, ap.tier_id),
  ]);

  const recentApps = applications.slice(0, 5).map((app) => ({
    id: app.id,
    customerName: app.customerName ?? undefined,
    customer_name: app.customer_name ?? undefined,
    service_name: app.service_name,
    application_code: app.application_code ?? undefined,
    status: app.status,
  }));

  const mappedAnnouncements = announcements.map((ann) => ({
    id: ann.id,
    announcement_type: ann.announcement_type,
    published_at: ann.published_at ?? undefined,
    title: ann.title,
    body: ann.body,
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <APDashboardClient
          ap={ap as unknown as {
            id: string;
            full_name: string;
            partner_code: string;
            partner_type: string;
            kyc_status: string;
            tier?: { name: string };
          }}
          stats={stats}
          recentApps={recentApps}
          announcements={mappedAnnouncements}
        />
      </div>
    </main>
  );
}

