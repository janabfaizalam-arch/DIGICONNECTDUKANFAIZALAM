import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PartnerApplicationWizard } from "@/components/portal/partner-application-wizard";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

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

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-slate-800 px-3 py-3 md:px-8 md:py-6 pb-36">
      <div className="mx-auto max-w-7xl">
        <Link href="/ap/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900 transition mb-5">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <PartnerApplicationWizard
          initialServiceSlug={params.serviceId}
          initialProfileFields={{
            mobile: params.mobile ?? "",
          }}
        />
      </div>
    </main>
  );
}
