import { redirect } from "next/navigation";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { SupportClient } from "./support-client";

export const dynamic = "force-dynamic";

export default async function APSupportPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) {
    redirect("/unauthorized");
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <SupportClient partnerName={ap.full_name || "Partner"} />
      </div>
    </main>
  );
}

