import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ApplyFlow } from "@/components/apply/apply-flow";

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
    <ApplyFlow
      initialProfileFields={{
        mobile: userProfile?.mobile ?? "",
        pincode: userProfile?.pincode ?? "",
        city: userProfile?.city ?? "",
        state: userProfile?.state ?? "",
      }}
    />
  );
}
