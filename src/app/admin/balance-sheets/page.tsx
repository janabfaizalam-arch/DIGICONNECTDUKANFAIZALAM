import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-shell";
import { PageContainer } from "@/components/admin/primitives/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { safeDate } from "@/lib/admin-format";
import { STATUS_TONE_CLASS } from "@/lib/admin/status-tone";
import { fyLabel } from "@/lib/balance-sheets/engine";
import { listBalanceSheets } from "@/lib/balance-sheets/store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BalanceSheetsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { q = "", status = "all" } = await searchParams;
  const sheets = await listBalanceSheets({ query: q, status });

  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader
        eyebrow="Money"
        title="Balance Sheets"
        description="Bank-ready Trading and P&L Account and Balance Sheet for a customer's loan file."
        action={
          <Link href="/admin/balance-sheets/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Balance Sheet
          </Link>
        }
      />

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_12rem_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search business, owner, mobile or DIGI-BS number"
          aria-label="Search balance sheets"
          className="h-11 rounded-2xl border bg-white px-4 text-sm outline-none focus:border-blue-500"
        />
        <select name="status" defaultValue={status} aria-label="Status" className="h-11 rounded-2xl border bg-white px-4 text-sm outline-none focus:border-blue-500">
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="final">Final</option>
        </select>
        <button type="submit" className="h-11 rounded-full bg-slate-950 px-5 text-sm font-bold text-white">
          Search
        </button>
      </form>

      {sheets.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheets.map((sheet) => (
                <TableRow key={sheet.id}>
                  <TableCell className="font-semibold">
                    <Link href={`/admin/balance-sheets/${sheet.id}`} className="text-blue-700 underline-offset-2 hover:underline">
                      {sheet.reference}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="block font-semibold">{sheet.businessName}</span>
                    <span className="text-xs text-slate-500">{sheet.ownerName}</span>
                  </TableCell>
                  <TableCell>{sheet.mobile ?? "-"}</TableCell>
                  <TableCell>{sheet.hasActual ? `${fyLabel(sheet.baseYear)} + projections` : "Projections only"}</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold", STATUS_TONE_CLASS[sheet.status === "final" ? "success" : "warning"])}>
                      {sheet.status === "final" ? "Final" : "Draft"}
                    </span>
                  </TableCell>
                  <TableCell>{safeDate(sheet.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <AdminEmptyState
          title={q || status !== "all" ? "No balance sheets match" : "No balance sheets yet"}
          description={q || status !== "all" ? "Try a different search." : "Create one from a customer's basic figures and download it as a bank-ready PDF."}
        />
      )}
    </PageContainer>
  );
}
