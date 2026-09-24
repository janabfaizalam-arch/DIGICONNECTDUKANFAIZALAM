import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PartnerApplicationWizard } from "@/components/portal/partner-application-wizard";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewAPApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; serviceId?: string; service?: string; name?: string; mobile?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const initialServiceSlug = params.serviceId || params.service;

  return (
    <main
      data-dcp-page
      className="min-h-screen px-3 transition-all duration-300 md:px-5 xl:px-6"
      style={{
        paddingTop: "calc(var(--site-header-height, 0px) + env(safe-area-inset-top) + 10px)",
        paddingBottom: "calc(var(--wizard-bottom-nav-height, 0px) + var(--sticky-action-bar-height, 0px) + env(safe-area-inset-bottom) + 24px)"
      }}
    >
      <div className="mx-auto w-full max-w-4xl">
        <Link href="/ap/dashboard" className="mb-2.5 inline-flex items-center gap-1.5 rounded-lg text-[12.5px] font-bold text-[var(--dcp-brand)] transition hover:text-[var(--dcp-brand-deep)]">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <PartnerApplicationWizard
          initialServiceSlug={initialServiceSlug}
          initialProfileFields={{
            mobile: params.mobile ?? "",
          }}
        />
      </div>
    </main>
  );
}
