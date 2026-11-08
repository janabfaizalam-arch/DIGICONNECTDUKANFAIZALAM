import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-shell";
import { PageContainer } from "@/components/admin/primitives/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { safeDate } from "@/lib/admin-format";
import { STATUS_TONE_CLASS } from "@/lib/admin/status-tone";
import { formatAmount } from "@/lib/balance-sheets/engine";
import { SCHEME_OPTIONS } from "@/lib/balance-sheets/schemes";
import { listProjectReports } from "@/lib/project-reports/store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const schemeShort = (value: string) => (value === "none" ? "Bank loan" : (SCHEME_OPTIONS.find((s) => s.value === value)?.label.split(" (")[0] ?? value));

export default async function ProjectReportsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { q = "", status = "all" } = await searchParams;
  const reports = await listProjectReports({ query: q, status });

  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader
        eyebrow="Money"
        title="Project Reports (DPR)"
        description="Naye project ke liye bank-ready Detailed Project Report: project cost, means of finance, projections, DSCR, break-even aur repayment schedule."
        action={
          <Link href="/admin/project-reports/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nayi DPR
          </Link>
        }
      />

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_12rem_auto]">
        <input name="q" defaultValue={q} placeholder="Business, promoter, mobile ya DIGI-DPR number" aria-label="DPR search karein" className="h-11 rounded-2xl border bg-white px-4 text-sm outline-none focus:border-blue-500" />
        <select name="status" defaultValue={status} aria-label="Status" className="h-11 rounded-2xl border bg-white px-4 text-sm outline-none focus:border-blue-500">
          <option value="all">Sab</option>
          <option value="draft">Draft</option>
          <option value="final">Final</option>
        </select>
        <button type="submit" className="h-11 rounded-full bg-slate-950 px-5 text-sm font-bold text-white">
          Search
        </button>
      </form>

      {reports.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Yojana</TableHead>
                <TableHead className="text-right">Project cost</TableHead>
                <TableHead className="text-right">Bank loan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold">
                    <Link href={`/admin/project-reports/${r.id}`} className="text-blue-700 underline-offset-2 hover:underline">
                      {r.reference}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="block font-semibold">{r.businessName}</span>
                    <span className="text-xs text-slate-500">
                      {r.promoterName}
                      {r.mobile ? ` · ${r.mobile}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>{schemeShort(r.scheme)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(r.projectCost)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(r.bankLoan)}</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold", STATUS_TONE_CLASS[r.status === "final" ? "success" : "warning"])}>
                      {r.status === "final" ? "Final" : "Draft"}
                    </span>
                  </TableCell>
                  <TableCell>{safeDate(r.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <AdminEmptyState
          title={q || status !== "all" ? "Koi DPR nahi mili" : "Abhi koi DPR nahi"}
          description={q || status !== "all" ? "Dusra search try karein." : "Nayi DPR banaiye: machinery, products, staff aur loan bhariye, PDF apne aap ban jayegi."}
        />
      )}
    </PageContainer>
  );
}
