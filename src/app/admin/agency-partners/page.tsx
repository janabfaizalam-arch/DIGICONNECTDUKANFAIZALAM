import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Eye, Search, UserPlus } from "lucide-react";

import { DIGI_PARTNER_LOGIN_ROUTE } from "@/lib/auth/partner-access";
import {
  ADMIN_AGENCY_PARTNERS_NEW_ROUTE,
  adminAgencyPartnerDetailPath,
} from "@/lib/admin/agency-partner-routes";

import { AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { safeCurrency } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminAgencyPartnerList } from "@/lib/ap-data";
import { AP_PARTNER_TYPE_LABELS, type APListItem, type APPartnerType } from "@/lib/ap-types";

export const dynamic = "force-dynamic";

type AdminAPPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

function matchesAPSearch(ap: APListItem, query: string) {
  const haystack = [
    ap.full_name,
    ap.mobile,
    ap.email,
    ap.partner_code,
    ap.business_name,
    ap.address,
    ap.district,
    ap.state,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export default async function AdminAgencyPartnersPage({ searchParams }: AdminAPPageProps) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const params = await searchParams;
  const query = String(params?.q ?? "").trim();
  const partners = await getAdminAgencyPartnerList();

  const visiblePartners = query ? partners.filter((ap) => matchesAPSearch(ap, query)) : partners;

  const totalCommissions = partners.reduce((total, ap) => total + ap.pendingCommission + ap.totalPaidCommission, 0);
  const pendingCommissions = partners.reduce((total, ap) => total + ap.pendingCommission, 0);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Agency Partners"
        title="AP Ecosystem Console"
        description="Verify KYC uploads, configure partner tiers, manage hierarchical commissions, and audit financial wallets."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={DIGI_PARTNER_LOGIN_ROUTE}
              target="_blank"
              rel="noopener noreferrer"
              title="Open the Digi Partner sign-in portal in a new tab"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4 text-indigo-500" />
              Open Partner Portal
            </a>
            <Link href={ADMIN_AGENCY_PARTNERS_NEW_ROUTE} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white">
              <UserPlus className="h-4 w-4" />
              Onboard AP
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <AdminStatCard title="Total Partners" value={partners.length} icon="userCheck" tone="blue" />
        <AdminStatCard title="Active Partners" value={partners.filter((ap) => ap.status === "active").length} icon="users" tone="green" />
        <AdminStatCard title="Total Earned" value={safeCurrency(totalCommissions)} icon="indianRupee" tone="orange" />
        <AdminStatCard title="Awaiting Settlement" value={safeCurrency(pendingCommissions)} icon="indianRupee" tone="slate" />
      </div>

      <Card className="overflow-hidden p-4 md:p-6">
        <form className="mb-4 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input name="q" defaultValue={query} placeholder="Search partner name, mobile, email, shop name, or code..." className="pl-11" />
          </div>
          <button type="submit" className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white">
            Search
          </button>
        </form>

        {!visiblePartners.length ? (
          <AdminEmptyState
            title={partners.length ? "No matching Agency Partners" : "No Agency Partners registered yet"}
            description={partners.length ? "Try another name, mobile, email, shop name, or partner code." : "Click onboard to register your first partner shop or referral executive."}
          />
        ) : null}

        {visiblePartners.length ? (
          <div className="hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Partner Details</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Partner Code</TableHead>
                  <TableHead>Tier & Type</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>Pending Settlement</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiblePartners.map((ap) => {
                  return (
                    <TableRow key={ap.id}>
                      <TableCell className="font-bold">
                        <div>{ap.full_name}</div>
                        {ap.business_name && <div className="text-xs text-slate-400 font-normal">{ap.business_name}</div>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{ap.mobile || "—"}</TableCell>
                      <TableCell className="text-xs">{ap.email}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-indigo-600">{ap.partner_code}</TableCell>
                      <TableCell className="text-xs font-semibold capitalize">
                        <span className="text-amber-600">{ap.tier?.name || "AP Starter"}</span>
                        <div className="text-[10px] text-slate-400 font-normal">{AP_PARTNER_TYPE_LABELS[ap.partner_type as APPartnerType] ?? ap.partner_type.replace("_", " ")}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {ap.totalApplications} total ({ap.pendingApplications} pending)
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize border ${
                          ap.status === "active"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : ap.status === "suspended" || ap.status === "blacklisted"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}>
                          {ap.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize border ${
                          ap.kyc_status === "approved"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : ap.kyc_status === "rejected"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}>
                          {ap.kyc_status}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold">{safeCurrency(ap.pendingCommission)}</TableCell>
                      <TableCell>
                        <Link href={adminAgencyPartnerDetailPath(ap.id)} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border bg-white px-3.5 text-xs font-bold text-slate-900 shadow-sm hover:bg-slate-50">
                          <Eye className="h-3.5 w-3.5 text-blue-500" />
                          View/Verify
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {/* Mobile View card layout */}
        <div className="grid gap-3 lg:hidden">
          {visiblePartners.map((ap) => {
            return (
              <div key={ap.id} className="rounded-2xl border bg-white p-4 space-y-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">{ap.full_name}</p>
                    <p className="font-mono text-xs text-slate-500">{ap.partner_code}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${ap.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {ap.status}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <p><span className="font-semibold text-slate-500">Mobile:</span> {ap.mobile}</p>
                  <p><span className="font-semibold text-slate-500">Email:</span> {ap.email}</p>
                  {ap.business_name && <p><span className="font-semibold text-slate-500">Shop:</span> {ap.business_name}</p>}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-slate-50 p-2 border">
                    <p className="text-[9px] text-slate-400">Type</p>
                    <p className="font-bold capitalize truncate">{AP_PARTNER_TYPE_LABELS[ap.partner_type as APPartnerType] ?? ap.partner_type.replace("_", " ")}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2 border">
                    <p className="text-[9px] text-slate-400">Apps</p>
                    <p className="font-bold">{ap.totalApplications}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2 border">
                    <p className="text-[9px] text-slate-400">Balance</p>
                    <p className="font-bold text-emerald-600">{safeCurrency(ap.pendingCommission)}</p>
                  </div>
                </div>
                <div className="pt-2 border-t flex justify-end">
                  <Link href={adminAgencyPartnerDetailPath(ap.id)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border bg-white px-4 text-xs font-bold text-slate-900 shadow-sm">
                    <Eye className="h-3.5 w-3.5 text-blue-500" />
                    Manage AP
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
