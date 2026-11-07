import { AdminPageHeader, AdminUnderSetup } from "@/components/admin/admin-shell";
import { PageContainer } from "@/components/admin/primitives/layout";
import { AddonsManager } from "@/components/admin/digital-plans/addons-manager";
import { requireAdminPage } from "@/lib/digital-plans/admin-page";
import { listAddonsForAdmin } from "@/lib/digital-plans/store";

export const dynamic = "force-dynamic";

export default async function DigitalAddonsAdminPage() {
  await requireAdminPage();
  const addons = await listAddonsForAdmin().catch(() => null);
  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader
        eyebrow="RNOS Digital Packages"
        title="Add-on services"
        description="Extra services sold on top of a plan, shown on /packages and offered in enquiries. Prices exclude GST; say in the note when a third-party cost such as ad budget is separate."
        backHref="/admin/digital-plans"
        backLabel="Packages"
      />
      {addons === null ? <AdminUnderSetup title="Add-ons are not set up yet" description="Run the digital plans migration on the database." /> : <AddonsManager addons={addons} />}
    </PageContainer>
  );
}
