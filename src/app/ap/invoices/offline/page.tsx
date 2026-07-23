import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, ReceiptText } from "lucide-react";

import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getAgencyPartnerByUserId, getAPApplications } from "@/lib/ap-data";
import { getCustomerName } from "@/lib/crm";
import { normalizePartnerType } from "@/lib/ap/partner-type";

export const dynamic = "force-dynamic";

export default async function ApOfflineInvoicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) redirect("/unauthorized");

  const partnerType = normalizePartnerType(ap.partner_type);
  // Office staff primary; others may still open via deep link.
  const apps = await getAPApplications(ap.id, 20);

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-blue-700" />
            <h1 className="text-2xl font-black text-slate-900">Offline Invoice</h1>
          </div>
          <p className="text-sm text-slate-500">
            {partnerType === "office_staff"
              ? "Open an application to generate or review invoice documents."
              : "Partner offline invoice workspace."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          {!apps.length ? (
            <p className="text-sm text-slate-500">No applications available for invoicing.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {apps.map((app) => (
                <li key={app.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{getCustomerName(app) || "Customer"}</p>
                    <p className="truncate text-xs text-slate-500">{app.service_name}</p>
                  </div>
                  <Link
                    href={`/ap/applications/${app.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-blue-300"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link href="/ap/dashboard" className="text-xs font-bold text-slate-500 hover:text-slate-800">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
