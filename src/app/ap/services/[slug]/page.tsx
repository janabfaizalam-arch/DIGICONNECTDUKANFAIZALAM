import { notFound, redirect } from "next/navigation";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeAgentService } from "@/lib/agent-services";
import { ServiceDetailClient } from "./detail-client";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/ap/login");
  }
  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const { slug } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return notFound();
  }

  const { data } = await supabase
    .from("agent_services")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!data) {
    return notFound();
  }

  const service = normalizeAgentService(data);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] px-4 py-6 md:px-8 md:py-10">
      <ServiceDetailClient service={service} />
    </main>
  );
}
