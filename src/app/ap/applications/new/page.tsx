import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { APApplicationForm } from "@/components/ap/ap-application-form";
import { getVisibleAgentServices } from "@/lib/agent-services";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import type { Customer } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function NewAPApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; serviceId?: string; name?: string; mobile?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const supabase = getSupabaseAdmin();
  const services = await getVisibleAgentServices(user.id);
  let customers = [] as Customer[];

  if (supabase) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .or(`created_by.eq.${user.id},assigned_agent_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(100);
    customers = (data ?? []) as Customer[];
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-800 px-4 py-6 md:px-8 md:py-10 pb-28">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href="/ap/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors bg-white/80 border border-slate-100 rounded-full px-4 py-2 shadow-sm w-fit"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Dashboard
        </Link>
        <APApplicationForm
          customers={customers}
          services={services}
          defaultCustomerId={params.customerId}
          defaultServiceId={params.serviceId}
          defaultName={params.name}
          defaultMobile={params.mobile}
        />
      </div>
    </main>
  );
}
