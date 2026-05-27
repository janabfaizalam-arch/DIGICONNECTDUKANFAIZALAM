import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Search, Plus, UserPlus, Phone, Mail, MapPin } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
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

export default async function APCustomersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) {
    redirect("/unauthorized");
  }

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-400">
              Agency Partner CRM
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              My Customers
            </h1>
            <p className="mt-2 text-slate-400 max-w-2xl text-sm">
              Manage lead generation contacts, duplicate mobile status, and trigger quick POS applications.
            </p>
          </div>
          <Link
            href="/ap/applications/new"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-600 hover:to-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <UserPlus className="h-4.5 w-4.5" />
            Add New Customer
          </Link>
        </div>

        {/* Search & stats bar */}
        <div className="grid gap-4 md:grid-cols-4 items-center">
          <div className="relative md:col-span-3">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search registered customers by name, mobile, email or pincode..."
              className="w-full rounded-xl border border-white/5 bg-slate-900/40 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          <Card className="border border-white/5 bg-slate-900/20 p-3.5 backdrop-blur-md rounded-xl text-center">
            <p className="text-[10px] font-bold uppercase text-slate-500">Total Customers</p>
            <p className="text-xl font-black text-white mt-0.5">{customers.length}</p>
          </Card>
        </div>

        {/* Customers grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customers.length ? (
            customers.map((c) => (
              <Card
                key={c.id}
                className="relative overflow-hidden border border-white/5 bg-slate-900/20 p-5 rounded-2xl backdrop-blur-md flex flex-col justify-between hover:border-white/10 hover:bg-slate-900/30 transition-all duration-150 group"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-white text-base group-hover:text-blue-400 transition-colors">
                        {c.full_name}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-500 font-mono">
                        ID: {c.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>

                    <span className="text-[9px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 capitalize">
                      {c.source?.replace("_", " ") || "AP POS"}
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-600" />
                      <span>{c.mobile}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-600" />
                      <span className="truncate">{c.email || "No email registered"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-600" />
                      <span>
                        {c.city || "—"}, {c.state || "—"} ({c.pincode || "—"})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">
                    Added: {formatDate(c.created_at)}
                  </span>

                  <Link
                    href={`/ap/applications/new?customerId=${c.id}`}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 px-3 text-xs font-bold text-blue-400 border border-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Apply
                  </Link>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-lg font-semibold text-slate-300">No customers registered</h3>
              <p className="mt-2 text-sm text-slate-500">
                Register your first customer lead to easily apply for services on their behalf.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
