import { redirect } from "next/navigation";

import { CustomerDashboard } from "@/components/portal/customer-dashboard";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole, syncUserProfile } from "@/lib/auth";
import type { Application, ApplicationDocument, Invoice, NotificationItem, Payment, Rating } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function groupByApplicationId<T extends { application_id: string }>(items: T[] = []) {
  return items.reduce<Record<string, T[]>>((grouped, item) => {
    grouped[item.application_id] = [...(grouped[item.application_id] ?? []), item];
    return grouped;
  }, {});
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await syncUserProfile(user);
  const role = await getCurrentUserRole(user);

  if (!isCustomerRole(role)) {
    redirect(getRoleHome(role));
  }

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
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const baseApplications = (applicationData ?? []) as Application[];
    const applicationIds = baseApplications.map((application) => application.id);

    if (applicationIds.length > 0) {
      const [documentsResult, paymentsResult, invoicesResult, ratingsResult] = await Promise.all([
        supabase
          .from("application_documents")
          .select("id, application_id, document_type, file_name, file_url, file_type, storage_path, created_at")
          .in("application_id", applicationIds),
        supabase
          .from("payments")
          .select("id, application_id, amount, status, screenshot_url, storage_path, created_at")
          .in("application_id", applicationIds),
        supabase
          .from("invoices")
          .select("id, application_id, invoice_number, customer_name, customer_email, service_name, amount, payment_status, created_at")
          .in("application_id", applicationIds),
        supabase.from("ratings").select("id, application_id, user_id, rating, feedback, created_at").in("application_id", applicationIds),
      ]);

      const documentsByApplicationId = groupByApplicationId((documentsResult.data ?? []) as ApplicationDocument[]);
      const paymentsByApplicationId = groupByApplicationId((paymentsResult.data ?? []) as Payment[]);
      const invoicesByApplicationId = groupByApplicationId((invoicesResult.data ?? []) as Invoice[]);
      const ratingsByApplicationId = groupByApplicationId((ratingsResult.data ?? []) as Rating[]);

      applications = baseApplications.map((application) => ({
        ...application,
        documents: documentsByApplicationId[application.id] ?? [],
        payments: paymentsByApplicationId[application.id] ?? [],
        invoices: invoicesByApplicationId[application.id] ?? [],
        ratings: ratingsByApplicationId[application.id] ?? [],
      }));
    } else {
      applications = baseApplications;
    }

    notifications = (notificationData ?? []) as NotificationItem[];
  }

  return <CustomerDashboard applications={applications} notifications={notifications} profile={{ name, email, avatarUrl }} />;
}
