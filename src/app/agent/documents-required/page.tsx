import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getAgentApplications } from "@/lib/agent-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AgentDocumentsRequiredPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login/agent");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  const applications = await getAgentApplications(user.id, 500);
  const applicationIds = applications.map((application) => application.id);
  let documents: {
    id: string;
    application_id: string;
    file_name: string;
    document_type: string;
    review_status?: string | null;
    rejection_reason?: string | null;
    file_url: string;
  }[] = [];

  if (supabase && applicationIds.length) {
    const { data } = await supabase
      .from("application_documents")
      .select("id, application_id, file_name, document_type, review_status, rejection_reason, file_url")
      .in("application_id", applicationIds)
      .in("review_status", ["rejected", "reupload_required", "pending"]);
    documents = (data ?? []) as typeof documents;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Documents</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">Documents Required</h1>
        </div>
        <div className="grid gap-3">
          {documents.length ? documents.map((document) => (
            <Card key={document.id} className="rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-950">{document.file_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{document.document_type}</p>
                  {document.rejection_reason ? <p className="mt-2 text-sm font-semibold text-orange-700">{document.rejection_reason}</p> : null}
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold capitalize text-orange-700">
                  {(document.review_status || "pending").replace(/_/g, " ")}
                </span>
              </div>
              <a href={document.file_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-bold text-blue-700">
                View uploaded file
              </a>
            </Card>
          )) : <Card className="rounded-2xl p-6 text-sm text-slate-600">No documents require action right now.</Card>}
        </div>
      </div>
    </main>
  );
}
