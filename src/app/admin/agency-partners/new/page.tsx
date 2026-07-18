import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getNextPartnerCode } from "@/lib/ap-data";
import { CreateAPForm } from "@/components/admin/create-ap-form";

export const dynamic = "force-dynamic";

export default async function NewAPOnboardingPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/admin/login");
  if (!isAdminRole(role)) redirect("/admin");

  const defaultPartnerCode = await getNextPartnerCode();

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/admin/agency-partners" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Agency Partners
        </Link>
        <AdminPageHeader
          eyebrow="Onboarding Wizard"
          title="Register Agency Partner"
          description="Provision secure login credentials and configure commission rules for a verified field partner or shop owner."
        />
        <CreateAPForm defaultPartnerCode={defaultPartnerCode} />
      </div>
    </main>
  );
}
