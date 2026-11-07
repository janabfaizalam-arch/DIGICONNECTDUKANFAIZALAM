import { AdminPageHeader } from "@/components/admin/admin-shell";
import { PageContainer } from "@/components/admin/primitives/layout";
import { PlanEditor } from "@/components/admin/digital-plans/plan-editor";
import { requireAdminPage } from "@/lib/digital-plans/admin-page";
import { listAddonsForAdmin } from "@/lib/digital-plans/store";

export const dynamic = "force-dynamic";

export default async function NewDigitalPlanPage() {
  await requireAdminPage();
  const addons = await listAddonsForAdmin().catch(() => []);
  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader eyebrow="RNOS Digital Packages" title="New plan" description="New plans start hidden. Make it live when the details are complete." backHref="/admin/digital-plans" backLabel="Packages" />
      <PlanEditor plan={null} addons={addons} />
    </PageContainer>
  );
}
