import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminAgentServicesManager } from "@/components/admin/admin-agent-services-manager";
import { getAdminAgentOptions, getAdminAgentServices, getAgentServiceSourceCatalog } from "@/lib/agent-services";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminAgentServicesPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const [agentServices, sourceServices, agents] = await Promise.all([
    getAdminAgentServices(),
    getAgentServiceSourceCatalog(),
    getAdminAgentOptions(),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Agent Controls"
        title="Agent Services"
        description="Control which services agents can sell and snapshot payout rules when agent applications are created."
      />
      <AdminAgentServicesManager services={agentServices} sourceServices={sourceServices} agents={agents} />
    </div>
  );
}
