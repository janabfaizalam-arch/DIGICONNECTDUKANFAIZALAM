import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomerOnboardingForm } from "@/components/portal/customer-onboarding-form";
import { getCurrentUser, syncUserProfile } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Complete Your Profile | DigiConnect Dukan",
  description: "Provide your mobile number and address details to claim your signup rewards and start applying for services.",
};

export default async function CustomerOnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/customer");
  }

  // Ensure default syncing is complete only if profile does not already have mobile+pincode.
  // This prevents syncUserProfile from overwriting a completed profile with empty metadata values
  // on page refresh, which would cause a redirect loop back to onboarding.
  const supabaseAdmin = getSupabaseAdmin();

  console.info("ONBOARDING_CURRENT_USER", {
    userId: user.id,
    email: user.email ?? null,
    hasMetadataMobile: Boolean(user.user_metadata?.mobile),
    hasMetadataPincode: Boolean(user.user_metadata?.pincode),
    onboardingCompleted: Boolean(user.user_metadata?.onboarding_completed),
  });

  let profileComplete = false;

  if (supabaseAdmin) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("mobile, pincode")
      .eq("id", user.id)
      .maybeSingle();

    profileComplete = Boolean(profile?.mobile && profile?.pincode);

    if (profileComplete) {
      // Profile is already complete — redirect to dashboard immediately without re-syncing.
      redirect("/customer/dashboard");
    }
  }

  // Only call syncUserProfile for users who do not have a complete profile yet.
  // This avoids overwriting mobile/pincode with empty strings for users whose metadata lacks them.
  if (!profileComplete) {
    await syncUserProfile(user);
  }


  const userEmail = user.email ?? "";
  const userFullName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-4 py-8 md:px-8 md:py-12">
      {/* Dynamic ambient glassmorphic background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_0%,rgba(37,99,235,0.12),transparent_26rem),radial-gradient(circle_at_90%_8%,rgba(249,115,22,0.08),transparent_22rem),linear-gradient(180deg,#fbfdff_0%,#eef6ff_52%,#f8fbff_100%)]" />
      <div className="mx-auto max-w-6xl">
        <CustomerOnboardingForm userEmail={userEmail} userFullName={userFullName} />
      </div>
    </main>
  );
}
