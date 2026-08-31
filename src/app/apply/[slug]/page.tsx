import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { portalServices } from "@/lib/portal-data";
import { getPublicServiceBySlug } from "@/lib/services";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ApplyFlow } from "@/components/apply/apply-flow";
import { resolveItrServiceSlug } from "@/lib/itr/constants";

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
  const service = await getPublicServiceBySlug(resolveItrServiceSlug(slug));

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
  const resolvedSlug = resolveItrServiceSlug(slug);
  const service = await getPublicServiceBySlug(resolvedSlug);

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

  const profileFields = {
    mobile: userProfile?.mobile ?? "",
    pincode: userProfile?.pincode ?? "",
    city: userProfile?.city ?? "",
    state: userProfile?.state ?? "",
  };

  /*
    Every service is filed through the same flow.

    ITR and the Detailed Project Report each used to open a wizard of their
    own — twelve steps, their own layout, their own validation, their own
    payment call. Their questions are configured against the service now, and
    this one flow asks them, so there is a single form to maintain and a single
    place a question can be added from.
  */
  return <ApplyFlow initialServiceSlug={resolvedSlug} initialProfileFields={profileFields} />;
}
