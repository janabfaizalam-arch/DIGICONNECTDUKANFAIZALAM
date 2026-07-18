import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await getCurrentUserRole(user);
  if (!isAdminRole(role)) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  const { data } = supabase
    ? await supabase.from("website_settings").select("key, value, updated_at").order("key")
    : { data: [] };

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Website Settings</h1>
      <ul className="mt-8 space-y-4">
        {(data ?? []).map((row) => (
          <li key={row.key as string} className="rounded-xl border border-[var(--border)] bg-white p-4">
            <p className="font-medium">{String(row.key)}</p>
            <pre className="mt-2 overflow-x-auto text-xs text-[var(--muted)]">
              {JSON.stringify(row.value, null, 2)}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
