import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { PartnerApplicationActions } from "@/components/admin/partner-application-actions";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPartnerApplications } from "@/lib/admin/partner-applications-data";
import { safeDate } from "@/lib/admin-format";
import { DIGI_PARTNER_TYPES } from "@/lib/ap/partner-type";
import type { DigiPartnerType } from "@/lib/ap/partner-type";
import { PARTNER_APPLICATION_STATUS_LABELS } from "@/lib/partner-applications";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "open", label: "Awaiting action" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
] as const;

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  under_review: "bg-blue-50 text-blue-700 border-blue-100",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rejected: "bg-rose-50 text-rose-700 border-rose-100",
};

export default async function AdminPartnerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/admin/login");
  if (!isAdminRole(role)) redirect("/admin");

  const { status } = await searchParams;
  const active = status && FILTERS.some((f) => f.value === status) ? status : "open";

  const { rows, summary } = await listPartnerApplications({ status: active });

  const tiles = [
    { label: "Pending", value: summary.pending, tone: "text-amber-700" },
    { label: "Under review", value: summary.underReview, tone: "text-blue-700" },
    { label: "Approved", value: summary.approved, tone: "text-emerald-700" },
    { label: "Rejected", value: summary.rejected, tone: "text-slate-600" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Team & Partners"
        title="Partner Applications"
        description="People who applied through “Become a Digi Partner”. Approving one creates their login and partner account immediately — the temporary password is shown once, so pass it on before closing the row."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{tile.label}</p>
            <p className={`mt-2 font-mono text-2xl font-bold ${tile.tone}`}>{tile.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={
              filter.value === "open"
                ? "/admin/partner-applications"
                : `/admin/partner-applications?status=${filter.value}`
            }
            className={`inline-flex h-9 items-center rounded-full border px-4 text-xs font-bold transition ${
              active === filter.value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        {rows.length === 0 ? (
          <div className="space-y-2 p-10 text-center">
            <p className="text-sm font-bold text-slate-900">Nothing here</p>
            <p className="mx-auto max-w-lg text-sm font-medium text-slate-600">
              Applications submitted at{" "}
              <Link href="/digi-partner/apply" className="font-bold text-[var(--primary)] underline">
                /digi-partner/apply
              </Link>{" "}
              land in this queue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-bold text-slate-900">{row.fullName}</p>
                      {row.businessName ? (
                        <p className="text-xs font-semibold text-slate-600">{row.businessName}</p>
                      ) : null}
                      {row.location ? (
                        <p className="text-[11px] font-medium text-slate-500">{row.location}</p>
                      ) : null}
                      <p className="text-[11px] font-mono text-slate-400">{row.trackingCode}</p>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">
                      <p>{row.mobile}</p>
                      <p className="text-slate-500">{row.email}</p>
                      {row.referralSource ? (
                        <p className="text-[11px] font-medium text-slate-400">via {row.referralSource}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">
                      {DIGI_PARTNER_TYPES[row.partnerType as DigiPartnerType]?.label ?? row.partnerType}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-600">
                      {row.panNumber ? <p>PAN {row.panNumber}</p> : null}
                      {row.aadhaarNumber ? <p>Aadhaar ··{row.aadhaarNumber.slice(-4)}</p> : null}
                      {row.gstin ? <p>GST {row.gstin}</p> : null}
                      {!row.panNumber && !row.aadhaarNumber && !row.gstin ? (
                        <span className="text-slate-400">None given</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-600">
                      {safeDate(row.submittedAt)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_CLASS[row.status] ?? STATUS_CLASS.pending}`}
                      >
                        {PARTNER_APPLICATION_STATUS_LABELS[row.status]}
                      </span>
                      {row.partnerCode ? (
                        <p className="mt-1 font-mono text-[11px] font-bold text-slate-600">
                          {row.partnerCode}
                        </p>
                      ) : null}
                      {row.reviewNotes ? (
                        <p className="mt-1 max-w-48 text-[11px] font-medium text-slate-500">
                          {row.reviewNotes}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <PartnerApplicationActions
                          applicationId={row.id}
                          applicantName={row.fullName}
                          status={row.status}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <p className="text-xs font-medium text-slate-500">
        An approved partner starts with <span className="font-bold">KYC pending</span> — they can
        sell and earn straight away, but cannot withdraw until their documents are verified on their{" "}
        <Link href="/admin/agency-partners" className="font-bold text-[var(--primary)] underline">
          partner record
        </Link>
        .
      </p>
    </div>
  );
}
