import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone, Plus } from "lucide-react";

import { EmptyState, GlassPanel, PageHeader, StatusBadge } from "@/components/ap/ui";
import { getAgencyPartnerByUserId, getAPApplications } from "@/lib/ap-data";
import { formatINR, partnerInitials } from "@/lib/ap/format";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Customer } from "@/lib/portal-types";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function APCustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const { data } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  const customer = data as Customer | null;
  if (!customer) notFound();

  const ownsCustomer =
    String((customer as { created_by?: string }).created_by ?? "") === user.id ||
    String((customer as { assigned_agent_id?: string }).assigned_agent_id ?? "") === user.id;

  if (!ownsCustomer) notFound();

  const applications = (await getAPApplications(ap.id, 200)).filter((app) => {
    const row = app as typeof app & { customer_mobile_normalized?: string | null };
    const mobile = String(row.customer_mobile_normalized ?? app.customer_mobile ?? "").replace(/\D/g, "");
    const customerMobile = String(customer.mobile ?? "").replace(/\D/g, "");
    return (
      app.customer_id === customer.id ||
      (mobile && customerMobile && mobile.endsWith(customerMobile.slice(-10)))
    );
  });

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F6F8FC] pb-24 text-[#0F172A] md:pb-10">
      <div className="relative mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <Link href="/ap/customers" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to customers
        </Link>

        <PageHeader
          eyebrow="Customer profile"
          title={customer.full_name}
          description="Profile, applications and quick actions for this customer."
          actions={
            <Link
              href={`/ap/applications/new?customerId=${customer.id}`}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Quick Apply
            </Link>
          }
        />

        <GlassPanel padding="md" className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-extrabold text-white">
            {partnerInitials(customer.full_name)}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5 text-sm font-semibold text-slate-600">
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              {customer.mobile}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              {customer.email || "No email on file"}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              {[customer.city, customer.state, customer.pincode].filter(Boolean).join(", ") || "Address not set"}
            </p>
          </div>
        </GlassPanel>

        <section className="space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900">Applications</h2>
          {applications.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Start a service application for this customer."
              actionLabel="Quick Apply"
              actionHref={`/ap/applications/new?customerId=${customer.id}`}
            />
          ) : (
            <div className="space-y-2">
              {applications.map((app) => (
                <Link key={app.id} href={`/ap/applications/${app.id}`}>
                  <GlassPanel padding="sm" className="flex items-center justify-between gap-3 transition hover:border-indigo-200">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{app.service_name}</p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        {app.application_code || app.id.slice(0, 8).toUpperCase()} · {formatINR(app.amount ?? 0)}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </GlassPanel>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
