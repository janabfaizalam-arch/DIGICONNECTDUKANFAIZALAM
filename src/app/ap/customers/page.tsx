import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, MapPin, Phone, Plus, Search, UserPlus } from "lucide-react";

import { EmptyState, GlassPanel, PageHeader } from "@/components/ap/ui";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { formatCount, partnerInitials } from "@/lib/ap/format";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Customer } from "@/lib/portal-types";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function APCustomersPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();

  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  let customers = [] as Customer[];

  if (supabase) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .or(`created_by.eq.${user.id},assigned_agent_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    customers = (data ?? []) as Customer[];
  }

  const query = String(searchParams.q ?? "").trim().toLowerCase();
  if (query) {
    customers = customers.filter((c) =>
      [c.full_name, c.mobile, c.email, c.city, c.state, c.pincode].join(" ").toLowerCase().includes(query),
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F6F8FC] pb-24 text-[#0F172A] md:pb-10">
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <PageHeader
          eyebrow="Customers"
          title="Customer management"
          description="Your Digi Partner CRM — create profiles, track activity and launch applications quickly."
          actions={
            <Link
              href="/ap/applications/new"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <UserPlus className="h-4 w-4" />
              Create Customer
            </Link>
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form className="relative flex-1" action="/ap/customers" method="get">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={searchParams.q ?? ""}
              placeholder="Search by name, mobile, email or pincode…"
              className="h-12 w-full rounded-2xl border border-white/70 bg-white/75 pl-11 pr-4 text-sm font-semibold text-slate-800 shadow-sm outline-none ring-1 ring-slate-900/[0.03] backdrop-blur-xl placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
              aria-label="Search customers"
            />
          </form>
          <GlassPanel padding="sm" className="shrink-0 text-center sm:min-w-[140px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customers</p>
            <p className="text-xl font-extrabold text-slate-900">{formatCount(customers.length)}</p>
          </GlassPanel>
        </div>

        {customers.length === 0 ? (
          <EmptyState
            title="No customers yet"
            description="Create a customer to begin a new service application."
            actionLabel="Create Customer"
            actionHref="/ap/applications/new"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customers.map((c) => (
              <GlassPanel key={c.id} padding="md" className="flex flex-col justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-xs font-extrabold text-white">
                    {partnerInitials(c.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/ap/customers/${c.id}`} className="truncate text-sm font-extrabold text-slate-900 hover:text-indigo-700">
                      {c.full_name}
                    </Link>
                    <p className="font-mono text-[10px] font-bold text-slate-400">{c.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs font-semibold text-slate-500">
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {c.mobile}
                  </p>
                  <p className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">{c.email || "No email"}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {[c.city, c.state].filter(Boolean).join(", ") || "Address not set"}
                    {c.pincode ? ` (${c.pincode})` : ""}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-semibold text-slate-400">Added {formatDate(c.created_at)}</span>
                  <Link
                    href={`/ap/applications/new?customerId=${c.id}`}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-indigo-50 px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Quick Apply
                  </Link>
                </div>
              </GlassPanel>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
