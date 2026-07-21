import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";

import { EmptyState, GlassPanel, PageHeader, StatusBadge } from "@/components/ap/ui";
import { getAgencyPartnerByUserId, getAPKycDocuments } from "@/lib/ap-data";
import { AP_KYC_DOCUMENT_TYPE_LABELS } from "@/lib/ap-types";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function APDocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) redirect("/unauthorized");

  const documents = await getAPKycDocuments(ap.id);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F6F8FC] pb-24 text-[#0F172A] md:pb-10">
      <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <PageHeader
          eyebrow="Account"
          title="Documents"
          description="Your Digi Partner KYC documents only. Customer application files stay inside each application — never shared across partners."
          actions={
            <Link href="/ap/profile" className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
              View profile
            </Link>
          }
        />

        <GlassPanel padding="sm" className="text-xs font-medium text-slate-500">
          Privacy: this page lists documents linked to partner <span className="font-bold text-slate-700">{ap.partner_code}</span> only.
        </GlassPanel>

        {documents.length === 0 ? (
          <EmptyState
            title="No KYC documents on file"
            description="When admin uploads or verifies your KYC files, they will appear here with status."
            actionLabel="Open support"
            actionHref="/ap/support"
            icon={<FileText className="h-5 w-5" />}
          />
        ) : (
          <div className="grid gap-2.5">
            {documents.map((doc) => (
              <GlassPanel key={doc.id} padding="md" className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-slate-900">
                    {AP_KYC_DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                    {doc.file_name} · Uploaded {formatDate(doc.uploaded_at || doc.created_at)}
                  </p>
                  {doc.rejection_reason ? (
                    <p className="mt-1 text-xs font-semibold text-rose-600">{doc.rejection_reason}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={doc.status} />
                  {doc.file_url ? (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-700"
                    >
                      Open
                    </a>
                  ) : null}
                </div>
              </GlassPanel>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
