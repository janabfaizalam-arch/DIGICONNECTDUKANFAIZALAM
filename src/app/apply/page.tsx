import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CustomerApplicationWizard } from "@/components/portal/customer-application-wizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Apply for Government Services | DigiConnect Dukan",
  description: "Complete online application forms, document uploads, and secure payments for Passport, GST, PAN Card, MSME, Driving Licence, and other digital services.",
};

export default async function ApplyIndexPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login/customer?redirect=${encodeURIComponent("/apply")}`);
  }

  const supabaseAdmin = getSupabaseAdmin();
  let userProfile = null;

  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("mobile, pincode, city, state")
      .eq("id", user.id)
      .maybeSingle();
    userProfile = data;
  }

  return (
    <main 
      className="min-h-screen bg-slate-50/30 px-0 md:px-8 transition-all duration-300"
      style={{
        paddingTop: "calc(var(--site-header-height, 0px) + env(safe-area-inset-top))",
        paddingBottom: "calc(var(--bottom-nav-height, 0px) + var(--sticky-action-bar-height, 0px) + env(safe-area-inset-bottom) + 24px)"
      }}
    >
      <CustomerApplicationWizard
        initialProfileFields={{
          mobile: userProfile?.mobile ?? "",
          pincode: userProfile?.pincode ?? "",
          city: userProfile?.city ?? "",
          state: userProfile?.state ?? "",
        }}
      />
    </main>
  );
}
