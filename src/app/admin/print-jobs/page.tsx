import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PrintJobsList } from "@/components/admin/print-jobs-list";

export const dynamic = "force-dynamic";

export default async function AdminPrintJobsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return (
      <div className="mx-auto max-w-7xl p-5">
        <p className="rounded-2xl bg-red-50 p-5 text-sm text-red-600 font-semibold">
          Database configuration is missing. Please contact support.
        </p>
      </div>
    );
  }

  // Fetch all print jobs, joining files and logs
  const { data: jobs, error } = await supabase
    .from("print_jobs")
    .select(`
      id,
      job_number,
      customer_mobile,
      copies,
      pages,
      paper_size,
      color_mode,
      price,
      payment_status,
      print_status,
      created_at,
      print_job_files (
        id,
        file_name,
        file_size,
        mime_type,
        storage_path
      ),
      print_job_logs (
        id,
        action,
        actor,
        details,
        created_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/print-jobs] Failed to load print jobs:", error);
  }

  interface LogItem {
    id: string;
    action: string;
    actor: string;
    details: unknown;
    created_at: string;
  }

  interface FileItem {
    id: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    storage_path: string;
  }

  interface PrintJobData {
    id: string;
    job_number: string;
    customer_mobile: string;
    copies: number;
    pages: number;
    paper_size: string;
    color_mode: string;
    price: number;
    payment_status: string;
    print_status: string;
    created_at: string;
    print_job_files?: FileItem[];
    print_job_logs?: LogItem[];
  }

  // Sort logs of each job locally by created_at desc for cleaner rendering
  const formattedJobs = ((jobs as unknown as PrintJobData[]) || []).map((job) => ({
    ...job,
    print_job_logs: (job.print_job_logs || []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Admin"
        title="Print Operations Center"
        description="Monitor active paid print jobs, download files securely, review print logs, and trigger manual reprints."
      />

      <PrintJobsList initialJobs={formattedJobs} />
    </div>
  );
}
