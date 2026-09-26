import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { MarketingAgentsConsole } from "@/components/admin/marketing-agents-console";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminMarketingAgentsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="Marketing"
        title="Marketing Agents"
        description="Har din 10 baje: Research agent aaj ki service par Google se research karta hai → Prompt agent angle aur prompts likhta hai → Post agent har platform ki post, poster aur blog article banata hai → Publish agent sab jagah post karta hai. Har link par UTM tag hai, taaki pata chale kaunsa platform visitors la raha hai."
      />
      <MarketingAgentsConsole />
    </div>
  );
}
