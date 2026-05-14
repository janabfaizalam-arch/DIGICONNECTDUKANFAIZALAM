import { redirect } from "next/navigation";

import { AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let staff: { id: string; full_name: string | null; email: string; mobile?: string | null }[] = [];
  let applications: { assigned_staff_id: string | null; status: string }[] = [];

  if (supabase) {
    try {
      const [staffResult, applicationResult] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, mobile").eq("role", "staff"),
        supabase.from("applications").select("assigned_staff_id, status"),
      ]);
      staff = staffResult.error ? [] : staffResult.data ?? [];
      applications = applicationResult.error ? [] : applicationResult.data ?? [];
    } catch (error) {
      console.error("[admin-staff] Failed to load staff", error);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Staff" title="Staff Workload" description="Current staff users and their assigned application workload." />
      <section className="grid gap-3 sm:grid-cols-2">
        <AdminStatCard title="Staff Users" value={staff.length} icon="userCog" tone="blue" />
        <AdminStatCard title="Assigned Applications" value={applications.filter((item) => item.assigned_staff_id).length} icon="clipboardList" tone="orange" />
      </section>
      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
        {!staff.length ? <AdminEmptyState title="No staff users yet" description="Create staff users through your existing role/user management flow." /> : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {staff.map((staffMember) => {
            const assigned = applications.filter((item) => item.assigned_staff_id === staffMember.id);
            return (
              <article key={staffMember.id} className="rounded-2xl border border-slate-100 p-4">
                <p className="font-bold text-slate-950">{staffMember.full_name || staffMember.email}</p>
                <p className="mt-1 text-sm text-slate-600">{staffMember.email}</p>
                <p className="mt-4 text-sm font-bold text-blue-700">{assigned.length} assigned</p>
                <p className="mt-1 text-sm text-slate-600">{assigned.filter((item) => item.status === "completed").length} completed</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
