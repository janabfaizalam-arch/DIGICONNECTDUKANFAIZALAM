import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseAdmin();
  const { data } = supabase
    ? await supabase
        .from("notifications")
        .select("id, title, body, created_at")
        .or(`user_id.eq.${user.id},audience.eq.all`)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Notifications</h1>
      <ul className="mt-8 divide-y divide-[var(--border)]">
        {(data ?? []).length === 0 ? (
          <li className="py-6 text-[var(--muted)]">No notifications.</li>
        ) : (
          (data ?? []).map((row) => (
            <li key={row.id as string} className="py-4">
              <p className="font-medium">{String(row.title)}</p>
              <p className="text-sm text-[var(--muted)]">{String(row.body)}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
