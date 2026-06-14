import { redirect } from "next/navigation";
import { getVisibleAgentServices } from "@/lib/agent-services";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { PartnerServicesClient } from "./services-client";

export const dynamic = "force-dynamic";

export default async function PartnerServicesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const services = await getVisibleAgentServices(user.id);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PartnerServicesClient initialServices={services} />
      </div>
    </main>
  );
}
