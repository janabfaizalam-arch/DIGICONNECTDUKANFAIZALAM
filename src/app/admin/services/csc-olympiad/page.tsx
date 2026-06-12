import { notFound, redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getPublicServiceBySlug } from "@/lib/services";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CscOlympiadCmsForm } from "@/components/admin/csc-olympiad-cms-form";

export const dynamic = "force-dynamic";

export default async function CscOlympiadAdminPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const service = await getPublicServiceBySlug("csc-olympiad");
  if (!service) notFound();

  // Retrieve category ID from database
  const supabase = getSupabaseAdmin();
  let dbServiceRow = null;
  if (supabase) {
    const { data } = await supabase
      .from("services")
      .select("id, category_id, blog_content")
      .eq("slug", "csc-olympiad")
      .maybeSingle();
    dbServiceRow = data;
  }

  if (!dbServiceRow) {
    notFound();
  }

  let dbConfig: Record<string, unknown> = {};
  if (dbServiceRow.blog_content) {
    try {
      dbConfig = JSON.parse(dbServiceRow.blog_content) as Record<string, unknown>;
    } catch {
      // not JSON
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="CSC Olympiad CMS"
        title="CSC Olympiad Page Settings"
        description="Configure dynamic registration fees, academic sessions, subjects list, FAQs, and testimonials."
      />
      <CscOlympiadCmsForm 
        serviceId={dbServiceRow.id}
        categoryId={dbServiceRow.category_id ?? ""}
        currentConfig={dbConfig}
      />
    </div>
  );
}
