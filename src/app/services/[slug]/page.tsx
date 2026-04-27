import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ServiceApplicationForm } from "@/components/portal/service-application-form";
import { getCurrentUser } from "@/lib/auth";
import { getServiceBySlug } from "@/lib/portal-data";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, user] = await Promise.all([params, getCurrentUser()]);
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/services" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to services
        </Link>
        <div className="mt-6">
          <ServiceApplicationForm service={service} />
        </div>
      </div>
    </main>
  );
}
