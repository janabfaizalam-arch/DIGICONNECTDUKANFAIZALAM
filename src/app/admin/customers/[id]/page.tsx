import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminCustomerAuthActions } from "@/components/admin/admin-customer-auth-actions";
import { AdminCustomerIdentityPanel } from "@/components/admin/admin-customer-identity-panel";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getCustomerIdentityHealth } from "@/lib/auth/customer-identity-health";
import { safeCurrency, safeDateTime } from "@/lib/admin-format";
import type { Application, Customer } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return safeDateTime(date);
}

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/admin/login");
  if (!isAdminRole(role)) redirect("/admin");

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  let customer: Customer | null = null;
  let applications: Pick<Application, "id" | "service_name" | "status" | "payment_status" | "amount" | "created_at">[] = [];
  let notes: { id: string; note: string; created_at: string }[] = [];
  let authProfile: {
    id: string;
    phone: string | null;
    phone_verified: boolean | null;
    account_status: string | null;
    failed_login_attempts: number | null;
    last_login_at: string | null;
  } | null = null;

  if (supabase) {
    try {
      const results = await Promise.allSettled([
      supabase.from("customers").select("*").eq("id", id).maybeSingle(),
      supabase.from("applications").select("id, service_name, status, payment_status, amount, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase.from("customer_notes").select("id, note, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
      ]);

      const [customerResult, applicationsResult, notesResult] = results.map((result) =>
        result.status === "fulfilled" ? result.value : { data: null, error: { message: "Query failed" } },
      );

      customer = customerResult.error ? null : (customerResult.data as Customer | null);
      applications = applicationsResult.error ? [] : (applicationsResult.data ?? []) as typeof applications;
      notes = notesResult.error ? [] : (notesResult.data ?? []) as typeof notes;

      if (customer) {
        const linkedUserId = (customer as Customer & { user_id?: string | null }).user_id;
        const mobile = String(customer.mobile ?? "").replace(/\D/g, "").slice(-10);
        if (linkedUserId) {
          const { data } = await supabase
            .from("profiles")
            .select("id, phone, phone_verified, account_status, failed_login_attempts, last_login_at")
            .eq("id", linkedUserId)
            .maybeSingle();
          authProfile = data;
        } else if (mobile) {
          const { data } = await supabase
            .from("profiles")
            .select("id, phone, phone_verified, account_status, failed_login_attempts, last_login_at")
            .eq("phone", mobile)
            .eq("role", "customer")
            .maybeSingle();
          authProfile = data;
        }
      }
    } catch (error) {
      console.error("[admin-customer-detail] Failed to load customer", error);
    }
  }

  const identityHealth = await getCustomerIdentityHealth({
    customerId: customer?.id ?? id,
    mobile: customer?.mobile ?? authProfile?.phone ?? null,
  });

  if (!customer) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Back to customers
        </Link>
        <AdminPageHeader eyebrow="Customer" title="Customer unavailable" description="This customer record could not be loaded. Other admin sections remain available." />
        <AdminCustomerIdentityPanel health={identityHealth} mobile={authProfile?.phone || null} />
        <AdminEmptyState title="No customer data" description="The customer may have been removed, or an optional database table may be unavailable." />
      </div>
    );
  }

  const customerRecord = customer;
  const customerApplications = applications;
  const displayName =
    (customerRecord as Customer & { name?: string | null }).name ||
    customerRecord.full_name ||
    "Customer";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </Link>
      <AdminPageHeader eyebrow="Customer" title={displayName} description="Customer profile, applications, notes, and timeline." />

      <AdminCustomerIdentityPanel health={identityHealth} mobile={customerRecord.mobile || authProfile?.phone || null} />

      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Profile</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <p>WhatsApp: <span className="font-semibold text-slate-900">{customerRecord.mobile || "-"}</span></p>
            <p>Phone verified: <span className="font-semibold text-slate-900">{authProfile?.phone_verified ? "Yes" : "No"}</span></p>
            <p>Account status: <span className="font-semibold text-slate-900">{authProfile?.account_status || "-"}</span></p>
            <p>Failed login attempts: <span className="font-semibold text-slate-900">{authProfile?.failed_login_attempts ?? 0}</span></p>
            <p>Last login: <span className="font-semibold text-slate-900">{authProfile?.last_login_at ? formatDate(authProfile.last_login_at) : "-"}</span></p>
            <p>Address: <span className="font-semibold text-slate-900">{customerRecord.address || "-"}</span></p>
            <p>Created: <span className="font-semibold text-slate-900">{formatDate(customerRecord.created_at)}</span></p>
          </div>
          <div className="mt-4">
            <AdminCustomerAuthActions
              userId={authProfile?.id}
              phone={authProfile?.phone || customerRecord.mobile}
            />
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
                      <p className="mt-1 text-xs font-bold text-slate-500">{safeCurrency(application.amount)}</p>
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
