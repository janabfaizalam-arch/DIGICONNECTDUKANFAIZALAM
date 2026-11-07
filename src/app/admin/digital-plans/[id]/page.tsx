import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { PageContainer } from "@/components/admin/primitives/layout";
import { PlanEditor } from "@/components/admin/digital-plans/plan-editor";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { safeDate } from "@/lib/admin-format";
import { requireAdminPage } from "@/lib/digital-plans/admin-page";
import { formatPrice } from "@/lib/digital-plans/money";
import { getPlanForAdmin, getPriceHistory, listAddonsForAdmin } from "@/lib/digital-plans/store";

export const dynamic = "force-dynamic";

export default async function EditDigitalPlanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [plan, addons, history] = await Promise.all([getPlanForAdmin(id).catch(() => null), listAddonsForAdmin().catch(() => []), getPriceHistory(id)]);
  if (!plan) notFound();

  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader eyebrow="RNOS Digital Packages" title={plan.name} description={`/packages/${plan.slug}`} backHref="/admin/digital-plans" backLabel="Packages" />
      <PlanEditor plan={plan} addons={addons} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Price history</h2>
        <p className="mt-1 text-sm text-slate-500">Recorded by the database on every price change. Enquiries and quotations keep their own prices.</p>
        {history.length ? (
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Setup</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.effectiveFrom}>
                  <TableCell>{safeDate(entry.effectiveFrom)}</TableCell>
                  <TableCell>{formatPrice(entry.monthlyPricePaise, entry.priceIsStarting)}</TableCell>
                  <TableCell>{formatPrice(entry.setupFeePaise, entry.priceIsStarting)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No price changes recorded yet.</p>
        )}
      </section>
    </PageContainer>
  );
}
