import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";

import {
  ADMIN_AGENCY_PARTNERS_ROUTE,
  adminAgencyPartnerExportPath,
} from "@/lib/admin/agency-partner-routes";
import {
  filterAgencyPartners,
  parseAgencyPartnerFilters,
} from "@/lib/admin/agency-partner-filters";
import { getAdminAgencyPartnerList } from "@/lib/ap-data";
import { formatServicesUsed } from "@/lib/ap/partner-rollups";
import { AP_STATUS_LABELS, type APListItem, type APStatus } from "@/lib/ap-types";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

import { PrintActions } from "./print-actions";

export const dynamic = "force-dynamic";

/**
 * The DC Partner directory, laid out for paper.
 *
 * The Excel export answers "give me everything"; this answers "give me the
 * sheet I can hold": who the partner is, their number, when they opened, when
 * they last did any work and on what, which services they actually sell, and
 * what is sitting in their wallet.
 *
 * Deliberately NOT on here: Aadhaar, PAN, bank account and IFSC. The workbook
 * carries those because a finance team needs them and the download is audited;
 * a sheet of paper gets left on a desk.
 *
 * It honours the console's own `q` and `type` filters, so printing what you are
 * looking at does not mean printing everyone.
 */

type PrintPageProps = {
  searchParams?: Promise<{ q?: string; type?: string }>;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function rupees(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function statusLabel(status: unknown): string {
  const raw = String(status ?? "").trim();
  if (!raw) return "—";
  return AP_STATUS_LABELS[raw as APStatus] ?? raw.replace(/_/g, " ");
}

/**
 * How long since this partner last did anything.
 *
 * `last_login_at` is only recorded from the partner login route, so it is blank
 * for everyone who last signed in before that started. The last application is
 * the signal that exists for the whole history, so it leads and the login date
 * sits under it.
 */
function lastActivity(partner: APListItem): { when: string; what: string } {
  const lastApplication = partner.lastApplicationAt ?? null;
  const lastLogin = partner.lastLoginAt ?? null;

  if (!lastApplication && !lastLogin) {
    return { when: "—", what: "Koi kaam nahi" };
  }

  if (!lastApplication) {
    return { when: formatDate(lastLogin), what: "Sirf login" };
  }

  return {
    when: formatDate(lastApplication),
    what: partner.lastServiceName || "Application",
  };
}

export default async function AdminAgencyPartnersPrintPage({ searchParams }: PrintPageProps) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const params = await searchParams;
  const filters = parseAgencyPartnerFilters({ q: params?.q, type: params?.type });
  const partners = filterAgencyPartners(await getAdminAgencyPartnerList(), filters);

  const totalWallet = partners.reduce((sum, ap) => sum + Number(ap.walletBalance ?? 0), 0);
  const totalApplications = partners.reduce((sum, ap) => sum + ap.totalApplications, 0);
  const printedOn = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 print:max-w-none print:p-0">
      {/*
        Landscape, because twelve columns of partner detail do not fit across a
        portrait page, and a repeated table header so page 3 is still readable
        on its own. Backgrounds are forced to print: a zebra-striped row that
        the printer drops takes the row boundaries with it.
      */}
      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        @media print {
          html, body { background: #fff; }
          .dcp-print-table { font-size: 9.5px; }
          .dcp-print-table thead { display: table-header-group; }
          .dcp-print-table tr { break-inside: avoid; page-break-inside: avoid; }
          .dcp-print-table th, .dcp-print-table td {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={ADMIN_AGENCY_PARTNERS_ROUTE}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-ds-border bg-ds-surface px-4 text-sm font-bold text-ds-text-secondary transition hover:bg-ds-surface-sunken"
        >
          <ArrowLeft className="h-4 w-4" />
          Console par wapas
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={adminAgencyPartnerExportPath({ q: filters.query, type: filters.type })}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-ds-success-border bg-ds-success-soft px-4 text-sm font-bold text-ds-success transition hover:brightness-95"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel download
          </a>
          <PrintActions />
        </div>
      </div>

      <header className="space-y-1 border-b-2 border-slate-900 pb-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              DigiConnect Dukan — DC Partner List
            </h1>
            <p className="text-xs font-semibold text-slate-600">
              {partners.length} partner{partners.length === 1 ? "" : "s"}
              {filters.query ? ` · search: "${filters.query}"` : ""}
              {filters.type ? ` · type: ${filters.type}` : ""}
            </p>
          </div>
          <dl className="flex gap-5 text-xs font-semibold text-slate-700">
            <div>
              <dt className="text-slate-500">Total applications</dt>
              <dd className="text-base font-black text-slate-900">{totalApplications}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Wallet mein total</dt>
              <dd className="text-base font-black text-slate-900">{rupees(totalWallet)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Printed</dt>
              <dd className="text-base font-black text-slate-900">{printedOn}</dd>
            </div>
          </dl>
        </div>
      </header>

      {/*
        Dates, codes, numbers and amounts carry `whitespace-nowrap`: left to
        wrap, "09 Nov 2026" breaks across two lines and every row becomes three
        lines tall, which doubles the page count. The service list and the
        address are the columns that should absorb the width instead — they
        read fine wrapped.
      */}
      {partners.length === 0 ? (
        <p className="py-10 text-center text-sm font-semibold text-slate-500">
          Is filter par koi DC Partner nahi mila.
        </p>
      ) : (
        <table className="dcp-print-table w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-900 text-left text-white">
              <th className="border border-slate-300 px-1.5 py-1.5 font-bold">#</th>
              <th className="border border-slate-300 px-1.5 py-1.5 font-bold">Partner Code</th>
              <th className="border border-slate-300 px-1.5 py-1.5 font-bold">Naam / Shop</th>
              <th className="border border-slate-300 px-1.5 py-1.5 font-bold">Number</th>
              <th className="border border-slate-300 px-1.5 py-1.5 font-bold">Jagah</th>
              <th className="border border-slate-300 px-1.5 py-1.5 font-bold">Khula</th>
              <th className="border border-slate-300 px-1.5 py-1.5 font-bold">Last kaam</th>
              <th className="border border-slate-300 px-1.5 py-1.5 font-bold">Last service</th>
              <th className="border border-slate-300 px-1.5 py-1.5 text-right font-bold">Apps</th>
              <th className="border border-slate-300 px-1.5 py-1.5 font-bold">Services use ki</th>
              <th className="border border-slate-300 px-1.5 py-1.5 text-right font-bold">Wallet</th>
              <th className="border border-slate-300 px-1.5 py-1.5 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((partner, index) => {
              const activity = lastActivity(partner);
              const place = [partner.district, partner.state].filter(Boolean).join(", ");

              return (
                <tr key={String(partner.id)} className={index % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                  <td className="border border-slate-300 px-1.5 py-1 text-slate-500">{index + 1}</td>
                  <td className="whitespace-nowrap border border-slate-300 px-1.5 py-1 font-mono font-bold text-slate-900">
                    {partner.partner_code || "—"}
                  </td>
                  <td className="border border-slate-300 px-1.5 py-1">
                    <span className="font-bold text-slate-900">{partner.full_name || "—"}</span>
                    {partner.business_name ? (
                      <span className="block text-slate-500">{partner.business_name}</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap border border-slate-300 px-1.5 py-1 font-mono text-slate-900">
                    {partner.mobile || "—"}
                  </td>
                  <td className="border border-slate-300 px-1.5 py-1 text-slate-700">
                    {place || "—"}
                    {partner.pin ? <span className="block text-slate-500">{partner.pin}</span> : null}
                  </td>
                  <td className="whitespace-nowrap border border-slate-300 px-1.5 py-1 text-slate-700">
                    {formatDate(partner.created_at)}
                  </td>
                  <td className="whitespace-nowrap border border-slate-300 px-1.5 py-1 text-slate-700">
                    {activity.when}
                    {partner.lastLoginAt ? (
                      <span className="block text-slate-500">login {formatDate(partner.lastLoginAt)}</span>
                    ) : null}
                  </td>
                  <td className="border border-slate-300 px-1.5 py-1 text-slate-700">{activity.what}</td>
                  <td className="whitespace-nowrap border border-slate-300 px-1.5 py-1 text-right font-bold text-slate-900">
                    {partner.totalApplications}
                    <span className="block font-normal text-slate-500">
                      {partner.completedApplications} done
                    </span>
                  </td>
                  <td className="border border-slate-300 px-1.5 py-1 text-slate-700">
                    {formatServicesUsed(partner.servicesUsed ?? [], 4) || "—"}
                  </td>
                  <td className="whitespace-nowrap border border-slate-300 px-1.5 py-1 text-right font-bold text-slate-900">
                    {rupees(partner.walletBalance)}
                  </td>
                  <td className="whitespace-nowrap border border-slate-300 px-1.5 py-1 text-slate-700">
                    {statusLabel(partner.status)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="pt-2 text-[10px] font-medium text-slate-500">
        Wallet balance partner ke ledger se banta hai — jo amount service apply karne mein lagta hai.
        Aadhaar, PAN aur bank details is sheet par jaan-boojh kar nahi hain; wo Excel export mein hain.
      </p>
    </div>
  );
}
