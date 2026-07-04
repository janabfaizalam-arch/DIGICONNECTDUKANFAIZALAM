import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { portalServices } from "@/lib/portal-data";
import { getPublicServiceBySlug } from "@/lib/services";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CustomerApplicationWizard } from "@/components/portal/customer-application-wizard";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ services?: string; plan?: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return portalServices.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);

  if (slug === "pvc-card-printing" || slug === "pvc-card") {
    return {
      title: "PVC Card Print Order | DigiConnect Dukan",
      description: "Order premium PVC card printing online. Convert Aadhaar, PAN, Voter ID, Ayushman, or ABHA card into durable, waterproof, premium PVC smart cards.",
    };
  }

  return {
    title: service ? `Apply for ${service.title} | DigiConnect Dukan` : "Apply | DigiConnect Dukan",
    description: service
      ? `Complete online application form, document upload, secure Razorpay payment, and invoice generation for ${service.title}.`
      : "DigiConnect Dukan application form.",
  };
}

export default async function ApplySlugPage({ params }: PageProps) {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);

  if (!service || service.ctaType !== "apply") {
    notFound();
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login/customer?redirect=${encodeURIComponent(`/apply/${slug}`)}`);
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
      className="min-h-screen bg-slate-50/30 px-4 md:px-8 transition-all duration-300"
      style={{
        paddingTop: "calc(var(--site-header-height, 0px) + env(safe-area-inset-top) + 16px)",
        paddingBottom: "calc(var(--bottom-nav-height, 0px) + var(--sticky-action-bar-height, 0px) + env(safe-area-inset-bottom) + 24px)"
      }}
    >
      <CustomerApplicationWizard
        initialServiceSlug={slug}
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
