import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, FileDown, Pencil } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { BalanceSheetDelete } from "@/components/admin/balance-sheet-delete";
import { BalanceSheetStatement } from "@/components/admin/balance-sheet-statement";
import { AdminCard, AdminSection, PageContainer } from "@/components/admin/primitives/layout";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { STATUS_TONE_CLASS } from "@/lib/admin/status-tone";
import { CONSTITUTIONS, buildStatements, capitalHeading, formatAmount } from "@/lib/balance-sheets/engine";
import { balanceSheetRows, profitAndLossRows, projectFinanceRows, ratioRows } from "@/lib/balance-sheets/rows";
import { SCHEME_OPTIONS } from "@/lib/balance-sheets/schemes";
import { figuresOf } from "@/lib/balance-sheets/schema";
import { getBalanceSheet } from "@/lib/balance-sheets/store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BalanceSheetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const sheet = await getBalanceSheet((await params).id);
  if (!sheet) notFound();

  const statements = buildStatements(figuresOf(sheet));
  const periods = statements.periods;
  const details: [string, string][] = [
    [sheet.constitution === "proprietorship" ? "Proprietor" : "Partners / directors", sheet.ownerName],
    ["Constitution", CONSTITUTIONS.find((entry) => entry.value === sheet.constitution)?.label ?? "Other"],
    ["Nature of business", sheet.natureOfBusiness ?? "-"],
    ["PAN / GSTIN", [sheet.pan, sheet.gstin].filter(Boolean).join(" / ") || "-"],
    ["Mobile", sheet.mobile ?? "-"],
    ["Bank", sheet.bankName ?? "-"],
    ["Purpose of loan", sheet.loanPurpose ?? "-"],
    ["Loan amount", sheet.loanAmount ? `Rs. ${formatAmount(sheet.loanAmount)}` : "-"],
  ];

  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader
        eyebrow={sheet.reference}
        title={sheet.businessName}
        description={[sheet.address, sheet.city, sheet.state].filter(Boolean).join(", ") || undefined}
        backHref="/admin/balance-sheets"
        backLabel="Balance Sheets"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/admin/balance-sheets/${sheet.id}/pdf`}
              target="_blank"
              rel="noopener"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              Download PDF
            </a>
            <Link href={`/admin/balance-sheets/${sheet.id}/edit`} className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Link>
            <BalanceSheetDelete id={sheet.id} name={sheet.businessName} />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold", STATUS_TONE_CLASS[sheet.status === "final" ? "success" : "warning"])}>
          {sheet.status === "final" ? "Final" : "Draft — prints with a DRAFT watermark"}
        </span>
        {statements.averageDscr !== null ? <span className="text-sm text-ds-text-secondary">Average DSCR {statements.averageDscr.toFixed(2)}</span> : null}
      </div>

      {statements.warnings.length ? (
        <AdminCard>
          <ul className="space-y-1.5 text-[13px] text-ds-text-secondary">
            {statements.warnings.map((warning) => (
              <li key={warning} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ds-warning" aria-hidden="true" />
                {warning}
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      <AdminCard>
        <AdminSection title="Customer details">
          <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-ds-text-muted">{label}</dt>
                <dd className="font-semibold text-ds-text-primary">{value}</dd>
              </div>
            ))}
          </dl>
        </AdminSection>
      </AdminCard>

      {statements.projectFinance ? <ProjectFinanceTable finance={projectFinanceRows(statements.projectFinance)} scheme={sheet.projection.scheme} /> : null}
      <BalanceSheetStatement title="Trading and Profit & Loss Account" periods={periods} rows={profitAndLossRows(periods)} />
      <BalanceSheetStatement title="Balance Sheet" periods={periods} rows={balanceSheetRows(periods, capitalHeading(sheet.constitution))} />

      <div className="overflow-x-auto touch-pan-y rounded-ds-xl border border-ds-border bg-ds-surface">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <caption className="border-b border-ds-border px-4 py-3 text-left text-[14px] font-bold text-ds-text-primary">Key ratios</caption>
          <thead>
            <tr className="bg-ds-surface-sunken">
              <th scope="col" className="px-4 py-2 text-left font-bold">
                Particulars
              </th>
              {periods.map((period) => (
                <th key={period.fyStart} scope="col" className="px-3 py-2 text-right font-bold">
                  {period.label.replace("FY ", "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ratioRows(periods, statements).map((row) => (
              <tr key={row.label} className="border-t border-ds-border">
                <th scope="row" className="px-4 py-1.5 text-left font-medium">
                  {row.label}
                </th>
                {row.values.map((value, index) => (
                  <td key={index} className="px-3 py-1.5 text-right tabular-nums">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}

function ProjectFinanceTable({ finance, scheme }: { finance: ReturnType<typeof projectFinanceRows>; scheme: string }) {
  const schemeLabel = scheme !== "none" ? SCHEME_OPTIONS.find((option) => option.value === scheme)?.label : null;
  const lines = Math.max(finance.cost.length, finance.means.length);
  return (
    <div className="overflow-x-auto touch-pan-y rounded-ds-xl border border-ds-border bg-ds-surface">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <caption className="border-b border-ds-border px-4 py-3 text-left text-[14px] font-bold text-ds-text-primary">
          Project cost and means of finance{schemeLabel ? ` · ${schemeLabel}` : ""}
        </caption>
        <thead>
          <tr className="bg-ds-surface-sunken">
            <th scope="col" className="px-4 py-2 text-left font-bold">Cost of project</th>
            <th scope="col" className="px-3 py-2 text-right font-bold">Rs.</th>
            <th scope="col" className="px-4 py-2 text-left font-bold">Means of finance</th>
            <th scope="col" className="px-3 py-2 text-right font-bold">Rs.</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: lines }, (_, index) => (
            <tr key={index}>
              <td className="px-4 py-1.5">{finance.cost[index]?.[0] ?? ""}</td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{finance.cost[index] ? formatAmount(finance.cost[index][1]) : ""}</td>
              <td className="px-4 py-1.5">{finance.means[index]?.[0] ?? ""}</td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{finance.means[index] ? formatAmount(finance.means[index][1]) : ""}</td>
            </tr>
          ))}
          <tr className="border-t border-ds-border font-bold">
            <td className="px-4 py-2">Total</td>
            <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatAmount(finance.totalCost)}</td>
            <td className="px-4 py-2">Total</td>
            <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatAmount(finance.totalMeans)}</td>
          </tr>
        </tbody>
      </table>
      {finance.subsidy > 0 ? (
        <p className="border-t border-ds-border px-4 py-2 text-[12.5px] text-ds-text-secondary">
          Back-ended subsidy Rs. {formatAmount(finance.subsidy)} bank ke paas TDR mein rahegi (balance sheet mein dono taraf).
        </p>
      ) : null}
    </div>
  );
}
