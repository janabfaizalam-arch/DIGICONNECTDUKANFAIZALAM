import { redirect } from "next/navigation";

import { AdminApplications } from "@/components/portal/admin-applications";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import type { Lead } from "@/lib/portal-types";
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
  let leads: Lead[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("leads")
      .select("id, name, mobile, service, message, status, file_name, file_url, file_type, storage_path, created_at")
      .order("created_at", { ascending: false });

    leads = (data ?? []) as Lead[];
  }

  return <AdminApplications leads={leads} />;
}
