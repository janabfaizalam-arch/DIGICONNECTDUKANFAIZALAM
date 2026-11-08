import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { PageContainer } from "@/components/admin/primitives/layout";
import { ProjectReportForm } from "@/components/admin/project-report-form";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { emptyDpr } from "@/lib/project-reports/defaults";

export const dynamic = "force-dynamic";

export default async function NewProjectReportPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader
        eyebrow="Project Reports (DPR)"
        title="Nayi DPR"
        description="Upar se neeche bhariye. Right side ka summary har badlav par apne aap update hota hai."
        backHref="/admin/project-reports"
        backLabel="Project Reports"
      />
      <ProjectReportForm initial={emptyDpr()} />
    </PageContainer>
  );
}
