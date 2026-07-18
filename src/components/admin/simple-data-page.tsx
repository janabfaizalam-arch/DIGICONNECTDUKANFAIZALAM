import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Props = {
  title: string;
  table: string;
  columns: string;
  orderBy?: string;
};

export async function SimpleAdminDataPage({ title, table, columns, orderBy = "created_at" }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await getCurrentUserRole(user);
  if (!isAdminRole(role)) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  let rows: Record<string, unknown>[] = [];
  if (supabase) {
    const query = supabase.from(table).select(columns).limit(100);
    const { data } = orderBy
      ? await query.order(orderBy, { ascending: false })
      : await query;
    rows = (data as Record<string, unknown>[] | null) ?? [];
  }

  const headers = columns.split(",").map((part) => part.trim());

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">{title}</h1>
      <div className="mt-8 overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[var(--muted)]">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-3 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-[var(--muted)]" colSpan={headers.length}>
                  No rows yet.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={String(row.id ?? index)} className="border-b border-[var(--border)]">
                  {headers.map((header) => (
                    <td key={header} className="px-3 py-2">
                      {String(row[header] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
