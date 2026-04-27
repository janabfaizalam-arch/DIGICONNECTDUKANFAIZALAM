import { redirect } from "next/navigation";

import { CustomerDashboard } from "@/components/portal/customer-dashboard";
import { getCurrentUser, syncUserProfile } from "@/lib/auth";
import type { Application, NotificationItem } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await syncUserProfile(user);

  const supabase = getSupabaseAdmin();
  const name = user.user_metadata.full_name ?? user.user_metadata.name ?? "Customer";
  const email = user.email ?? "";
  const avatarUrl = user.user_metadata.avatar_url ?? user.user_metadata.picture ?? "";
  let applications: Application[] = [];
  let notifications: NotificationItem[] = [];

  if (supabase) {
    const [{ data: applicationData }, { data: notificationData }] = await Promise.all([
      supabase
        .from("applications")
        .select("*, documents:application_documents(*), payments(*), invoices(*), ratings(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    applications = (applicationData ?? []) as Application[];
    notifications = (notificationData ?? []) as NotificationItem[];
  }

  return <CustomerDashboard applications={applications} notifications={notifications} profile={{ name, email, avatarUrl }} />;
}
