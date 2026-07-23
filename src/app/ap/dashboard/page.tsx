import { redirect } from "next/navigation";

import { PartnerHomeView } from "@/components/ap/home/partner-home-view";
import { getPartnerHomePayload } from "@/lib/ap/home-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

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

  const data = await getPartnerHomePayload(user.id);
  if (!data) {
    redirect("/unauthorized");
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PartnerHomeView data={data} />
    </main>
  );
}
