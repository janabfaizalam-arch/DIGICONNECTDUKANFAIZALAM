import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await getCurrentUserRole(user);
  if (role !== "customer") redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  const { data: profile } = supabase
    ? await supabase.from("profiles").select("full_name, email, mobile").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Profile</h1>
      <dl className="mt-8 space-y-4 text-sm">
        <div>
          <dt className="text-[var(--muted)]">Name</dt>
          <dd className="font-medium">{profile?.full_name || "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Email</dt>
          <dd className="font-medium">{profile?.email || user.email || "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Mobile</dt>
          <dd className="font-medium">{profile?.mobile || "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
