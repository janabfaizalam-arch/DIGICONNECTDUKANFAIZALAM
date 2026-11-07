import Link from "next/link";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-shell";
import { PageContainer } from "@/components/admin/primitives/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { safeDate } from "@/lib/admin-format";
import { STATUS_TONE_CLASS } from "@/lib/admin/status-tone";
import { requireAdminPage } from "@/lib/digital-plans/admin-page";
import { enquiryTone } from "@/lib/digital-plans/enquiry-tone";
import { formatPrice } from "@/lib/digital-plans/money";
import { listEnquiries } from "@/lib/digital-plans/store";
import { ENQUIRY_STATUS_LABEL, ENQUIRY_STATUSES } from "@/lib/digital-plans/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DigitalEnquiriesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdminPage();
  const { q = "", status = "all" } = await searchParams;
  const enquiries = await listEnquiries({ query: q, status });

  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader
        eyebrow="Leads & Sales"
        title="Package Enquiries"
        description="Get Started requests from /packages. Each is also a lead in the CRM. Prepare a quotation, send the link, and the customer approves it online."
        action={
          <Link href="/admin/digital-plans" className="inline-flex h-11 items-center rounded-full px-4 text-sm font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">
            Manage packages
          </Link>
        }
      />
      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_14rem_auto]">
        <input name="q" defaultValue={q} placeholder="Search name, mobile, business or RD- reference" aria-label="Search enquiries" className="h-11 rounded-2xl border bg-white px-4 text-sm outline-none focus:border-blue-500" />
        <select name="status" defaultValue={status} aria-label="Status" className="h-11 rounded-2xl border bg-white px-4 text-sm outline-none focus:border-blue-500">
          <option value="all">All statuses</option>
          {ENQUIRY_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ENQUIRY_STATUS_LABEL[value]}
            </option>
          ))}
        </select>
        <button type="submit" className="h-11 rounded-full bg-slate-950 px-5 text-sm font-bold text-white">
          Search
        </button>
      </form>
      {enquiries.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Price at enquiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.map((enquiry) => (
                <TableRow key={enquiry.id}>
                  <TableCell className="font-semibold">
                    <Link href={`/admin/digital-enquiries/${enquiry.id}`} className="text-blue-700 underline-offset-2 hover:underline">
                      {enquiry.reference}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="block font-semibold">{enquiry.name}</span>
                    <span className="text-xs text-slate-500">
                      {enquiry.mobile}
                      {enquiry.businessName ? ` · ${enquiry.businessName}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>{enquiry.planName}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatPrice(enquiry.monthlyPricePaise, enquiry.priceIsStarting)}/mo + {formatPrice(enquiry.setupFeePaise, enquiry.priceIsStarting)}
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold", STATUS_TONE_CLASS[enquiryTone(enquiry.status)])}>{ENQUIRY_STATUS_LABEL[enquiry.status]}</span>
                  </TableCell>
                  <TableCell>{safeDate(enquiry.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <AdminEmptyState title={q || status !== "all" ? "No enquiries match" : "No enquiries yet"} description="Enquiries arrive here when a visitor presses Get Started on a plan." />
      )}
    </PageContainer>
  );
}
