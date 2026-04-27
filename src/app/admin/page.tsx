import { redirect } from "next/navigation";

import { AdminApplications } from "@/components/portal/admin-applications";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import type { Application } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdminUser(user)) {
    redirect("/dashboard");
  }

  const supabase = getSupabaseAdmin();
  let applications: Application[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("applications")
      .select("*, users(*), documents:application_documents(*), payments(*), invoices(*), ratings(*)")
      .order("created_at", { ascending: false });

    applications = (data ?? []) as Application[];
  }

  return <AdminApplications applications={applications} />;
}
