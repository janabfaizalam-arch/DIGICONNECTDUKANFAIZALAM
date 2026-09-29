import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { PrivacyRequestActions } from "@/components/admin/privacy-request-actions";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { safeDate } from "@/lib/admin-format";
import { getCurrentUser, hasAdminAccess } from "@/lib/auth";
import {
  PRIVACY_REQUEST_STATUS_LABELS,
  PRIVACY_REQUEST_TYPE_LABELS,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
} from "@/lib/privacy/requests";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "open", label: "Open" },
  { value: "pending", label: "New" },
  { value: "verification_required", label: "Verifying" },
  { value: "in_review", label: "In review" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
] as const;

const STATUS_CLASS: Record<PrivacyRequestStatus, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  verification_required: "bg-violet-50 text-violet-800 border-violet-200",
  in_review: "bg-blue-50 text-blue-800 border-blue-200",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-slate-100 text-slate-700 border-slate-200",
};

type Row = {
  id: string;
  reference: string;
  request_type: PrivacyRequestType;
  requester_name: string;
  requester_mobile: string;
  details: string | null;
  user_id: string | null;
  status: PrivacyRequestStatus;
  verification_status: "unverified" | "verified" | "failed";
  assigned_admin_id: string | null;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
};

/** Days since a request arrived — the statutory clock staff have to watch. */
function ageInDays(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

export default async function AdminPrivacyRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!(await hasAdminAccess(user))) redirect("/admin");

  const { status } = await searchParams;
  const active = FILTERS.some((f) => f.value === status) ? (status as (typeof FILTERS)[number]["value"]) : "open";

  const supabase = getSupabaseAdmin();
  let rows: Row[] = [];
  let tableMissing = false;
  if (supabase) {
    let query = supabase
      .from("privacy_requests")
      .select(
        "id, reference, request_type, requester_name, requester_mobile, details, user_id, status, verification_status, assigned_admin_id, admin_notes, created_at, resolved_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (active === "open") query = query.in("status", ["pending", "verification_required", "in_review"]);
    else if (active !== "all") query = query.eq("status", active);
    const { data, error } = await query;
    if (error) tableMissing = error.code === "42P01" || /does not exist|schema cache/i.test(error.message);
    rows = (data ?? []) as Row[];
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Compliance"
        title="Privacy Requests"
        description="Requests to see, correct or delete personal data, withdraw consent, nominate someone, or complain. Verify the requester (call or message the registered mobile) before acting, and act on the data itself deliberately — nothing here changes it automatically."
      />

      {tableMissing ? (
        <Card className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          The privacy_requests table does not exist yet. Apply migration 20260926093000_privacy_requests.sql.
        </Card>
      ) : null}

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value === "open" ? "/admin/privacy-requests" : `/admin/privacy-requests?status=${filter.value}`}
            aria-current={active === filter.value ? "page" : undefined}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-xs font-bold transition ${
              active === filter.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        {rows.length === 0 ? (
          <div className="space-y-2 p-10 text-center">
            <p className="text-sm font-bold text-slate-900">Nothing here</p>
            <p className="mx-auto max-w-lg text-sm font-medium text-slate-600">
              Requests made on the{" "}
              <Link href="/contact#privacy-request" className="font-bold text-blue-800 underline">
                Contact &amp; Grievance page
              </Link>{" "}
              land in this queue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const age = ageInDays(row.created_at);
                  return (
                    <TableRow key={row.id} className="align-top">
                      <TableCell className="font-mono text-xs font-bold">{row.reference}</TableCell>
                      <TableCell>
                        <p className="text-sm font-bold text-slate-900">{PRIVACY_REQUEST_TYPE_LABELS[row.request_type]}</p>
                        {row.details ? <p className="mt-1 max-w-xs text-xs text-slate-700">{row.details}</p> : null}
                      </TableCell>
                      <TableCell className="text-sm">
                        <p className="font-semibold text-slate-900">{row.requester_name}</p>
                        <p className="text-slate-700">+91 {row.requester_mobile}</p>
                        <p className="text-xs text-slate-600">{row.user_id ? "Signed-in account" : "Not signed in"}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        <p>{safeDate(row.created_at)}</p>
                        {!row.resolved_at ? (
                          <p className={`text-xs font-bold ${age >= 60 ? "text-rose-700" : age >= 30 ? "text-amber-700" : "text-slate-600"}`}>
                            {age} day{age === 1 ? "" : "s"} open
                          </p>
                        ) : (
                          <p className="text-xs text-slate-600">Closed {safeDate(row.resolved_at)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_CLASS[row.status]}`}>
                          {PRIVACY_REQUEST_STATUS_LABELS[row.status]}
                        </span>
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          Identity: {row.verification_status}
                          {row.assigned_admin_id ? " · assigned" : ""}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-pre-line text-xs text-slate-700">{row.admin_notes ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <PrivacyRequestActions id={row.id} reference={row.reference} status={row.status} verification={row.verification_status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
