import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminUnderSetup } from "@/components/admin/admin-shell";
import { PageContainer } from "@/components/admin/primitives/layout";
import { PlansManager } from "@/components/admin/digital-plans/plans-manager";
import { requireAdminPage } from "@/lib/digital-plans/admin-page";
import { listPlansForAdmin } from "@/lib/digital-plans/store";

export const dynamic = "force-dynamic";

export default async function DigitalPlansAdminPage() {
  await requireAdminPage();
  const plans = await listPlansForAdmin().catch(() => null);

  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader
        eyebrow="Services"
        title="RNOS Digital Packages"
        description="The monthly plans on /packages and the homepage. Prices, features, limits, terms and the recommended plan are all edited here."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/digital-plans/addons" className="inline-flex h-11 items-center rounded-full px-4 text-sm font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">
              Add-on services
            </Link>
            <Link href="/admin/digital-enquiries" className="inline-flex h-11 items-center rounded-full px-4 text-sm font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">
              Enquiries
            </Link>
            <Link href="/admin/digital-plans/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white">
              <Plus className="h-4 w-4" aria-hidden="true" /> New plan
            </Link>
          </div>
        }
      />
      {plans === null ? (
        <AdminUnderSetup title="Packages are not set up yet" description="Run the digital plans migration on the database, then this screen will list the plans." />
      ) : plans.length ? (
        <PlansManager plans={plans} />
      ) : (
        <AdminEmptyState title="No plans yet" description="Create the first plan. Plans stay hidden from the website until you make them live." />
      )}
    </PageContainer>
  );
}
