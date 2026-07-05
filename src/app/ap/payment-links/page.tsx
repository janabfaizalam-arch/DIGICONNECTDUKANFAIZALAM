import { redirect } from "next/navigation";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { APPaymentLinksClient } from "./client";

export const dynamic = "force-dynamic";

export default async function APPaymentLinksPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) {
    redirect("/unauthorized");
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return <div>Database connection error</div>;
  }

  // Fetch payment links
  const { data: links, error } = await supabase
    .from("payment_links")
    .select(`
      id,
      code,
      amount,
      status,
      created_at,
      expires_at,
      paid_at,
      applications (
        service_name,
        customer_details
      ),
      profiles (
        full_name,
        mobile
      )
    `)
    .eq("partner_id", ap.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching payment links:", error);
  }

  return <APPaymentLinksClient links={links || []} />;
}
