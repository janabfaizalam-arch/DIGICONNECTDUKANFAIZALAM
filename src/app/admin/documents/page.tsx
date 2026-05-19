import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { safeDateTime } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type DocumentRow = {
  id: string;
  application_id: string | null;
  user_id: string | null;
  customer_id: string | null;
  document_type: string | null;
  file_name: string | null;
  file_url: string | null;
  status: string | null;
  review_status: string | null;
  is_final: boolean | null;
  uploaded_at: string | null;
  created_at: string | null;
};

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export default async function AdminDocumentsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let documents: DocumentRow[] = [];

  if (supabase) {
    const { data, error } = await supabase
      .from("application_documents")
      .select("id, application_id, user_id, customer_id, document_type, file_name, file_url, status, review_status, is_final, uploaded_at, created_at")
      .order("uploaded_at", { ascending: false, nullsFirst: false })
      .limit(300);

    if (error) console.error("[admin-documents] Document list failed", error);
    documents = (data ?? []) as DocumentRow[];
  }

  const pending = documents.filter((document) => ["pending", "uploaded", ""].includes(normalize(document.review_status ?? document.status)));
  const rejected = documents.filter((document) => ["rejected", "reupload_required"].includes(normalize(document.review_status ?? document.status)));
  const finalDocs = documents.filter((document) => document.is_final || normalize(document.document_type) === "final_document");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Operations" title="Documents" description="Application uploads and final documents. Missing relations are shown as not available, never hidden." />

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard title="Pending Review" value={pending.length} icon="inbox" tone="orange" />
        <AdminStatCard title="Rejected / Reupload" value={rejected.length} icon="fileClock" tone="slate" />
        <AdminStatCard title="Final Documents" value={finalDocs.length} icon="clipboardList" tone="green" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="py-3">Uploaded</th>
                <th className="py-3">Application</th>
                <th className="py-3">Type</th>
                <th className="py-3">File</th>
                <th className="py-3">Status</th>
                <th className="py-3">Final</th>
                <th className="py-3">Customer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="py-3 text-slate-700">{safeDateTime(document.uploaded_at ?? document.created_at)}</td>
                  <td className="py-3">
                    {document.application_id ? (
                      <Link href={`/admin/applications/${document.application_id}`} className="font-bold text-blue-700 hover:text-blue-900">
                        {document.application_id.slice(0, 8)}
                      </Link>
                    ) : "Not available"}
                  </td>
                  <td className="py-3 text-slate-700">{document.document_type ?? "Document"}</td>
                  <td className="py-3">
                    {document.file_url ? (
                      <a href={document.file_url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 hover:text-blue-900">
                        {document.file_name ?? "Open file"}
                      </a>
                    ) : document.file_name ?? "Not available"}
                  </td>
                  <td className="py-3 font-bold capitalize text-slate-700">{String(document.review_status ?? document.status ?? "pending").replace(/_/g, " ")}</td>
                  <td className="py-3 font-bold text-slate-700">{document.is_final ? "Yes" : "No"}</td>
                  <td className="py-3 font-mono text-xs text-slate-500">{document.customer_id ?? document.user_id ?? "Not available"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!documents.length ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No documents found.</p> : null}
        </div>
      </section>
    </div>
  );
}
