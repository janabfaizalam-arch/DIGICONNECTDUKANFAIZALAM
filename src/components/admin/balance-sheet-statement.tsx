import type { Period } from "@/lib/balance-sheets/engine";
import { amount, type Row } from "@/lib/balance-sheets/rows";
import { cn } from "@/lib/utils";

/** One statement as an on-screen table, from the same rows the PDF prints. */
export function BalanceSheetStatement({ title, periods, rows }: { title: string; periods: Period[]; rows: Row[] }) {
  return (
    <div className="overflow-x-auto touch-pan-y rounded-ds-xl border border-ds-border bg-ds-surface">
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <caption className="border-b border-ds-border px-4 py-3 text-left text-[14px] font-bold text-ds-text-primary">{title}</caption>
        <thead>
          <tr className="bg-ds-surface-sunken">
            <th scope="col" className="min-w-[220px] px-4 py-2 text-left font-bold">
              Particulars
            </th>
            {periods.map((period) => (
              <th key={period.fyStart} scope="col" className="whitespace-nowrap px-3 py-2 text-right font-bold">
                {period.kind === "actual" ? "Actual" : "Projected"}
                <span className="block text-[12px] font-medium text-ds-text-muted">{period.yearEnd}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            if (row.kind === "gap") return <tr key={index} aria-hidden="true" className="h-2" />;
            if (row.kind === "heading") {
              return (
                <tr key={index} className="bg-ds-surface-sunken">
                  <th scope="rowgroup" colSpan={periods.length + 1} className="px-4 py-1.5 text-left text-[12px] font-bold uppercase tracking-wide text-ds-text-secondary">
                    {row.label}
                  </th>
                </tr>
              );
            }
            return (
              <tr key={index} className={cn(row.rule && "border-t border-ds-border", row.rule === "total" && "border-b-2 border-double")}>
                <th scope="row" className={cn("px-4 py-1.5 text-left font-medium", row.bold && "font-bold")} style={{ paddingLeft: 16 + (row.indent ?? 0) * 14 }}>
                  {row.label}
                </th>
                {row.values.map((value, cell) => (
                  <td key={cell} className={cn("whitespace-nowrap px-3 py-1.5 text-right tabular-nums", row.bold && "font-bold")}>
                    {amount(value)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
