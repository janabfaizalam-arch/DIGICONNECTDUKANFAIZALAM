import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { safeDateTime } from "@/lib/admin-format";
import type { Application, Customer } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return safeDateTime(date);
}

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) notFound();

  const [{ data: customer }, { data: applications }, { data: notes }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("applications").select("id, service_name, status, payment_status, amount, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("customer_notes").select("id, note, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);

  if (!customer) notFound();

  const customerRecord = customer as Customer;
  const customerApplications = (applications ?? []) as Pick<Application, "id" | "service_name" | "status" | "payment_status" | "amount" | "created_at">[];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </Link>
      <AdminPageHeader eyebrow="Customer" title={customerRecord.full_name} description="Customer profile, applications, notes, and timeline." />

      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Profile</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <p>Mobile: <span className="font-semibold text-slate-900">{customerRecord.mobile || "-"}</span></p>
            <p>Email: <span className="font-semibold text-slate-900">{customerRecord.email || "-"}</span></p>
            <p>Address: <span className="font-semibold text-slate-900">{customerRecord.address || "-"}</span></p>
            <p>Notes: <span className="font-semibold text-slate-900">{customerRecord.notes || "-"}</span></p>
            <p>Created: <span className="font-semibold text-slate-900">{formatDate(customerRecord.created_at)}</span></p>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Applications</h2>
          <div className="mt-4 grid gap-3">
            {customerApplications.length ? (
              customerApplications.map((application) => (
                <Link key={application.id} href={`/admin/applications/${application.id}`} className="rounded-2xl bg-slate-50 p-4 transition hover:bg-blue-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{application.service_name}</p>
                      <p className="mt-1 text-xs font-mono text-slate-500">{formatDate(application.created_at)}</p>
                    </div>
                    <AdminStatusBadge status={application.status} />
                  </div>
                </Link>
              ))
            ) : (
              <AdminEmptyState title="No applications" description="This customer has no application records yet." />
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Timeline / Notes</h2>
        <div className="mt-4 grid gap-3">
          {notes?.length ? (
            notes.map((note) => (
              <div key={note.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-700">{note.note}</p>
                <p className="mt-2 text-xs font-bold text-slate-500">{formatDate(note.created_at)}</p>
              </div>
            ))
          ) : (
            <AdminEmptyState title="No notes yet" description="Customer notes will appear here." />
          )}
        </div>
      </section>
    </div>
  );
}
