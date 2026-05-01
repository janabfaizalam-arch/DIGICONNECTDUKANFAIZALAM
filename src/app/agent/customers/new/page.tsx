import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CustomerForm } from "@/components/portal/customer-form";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/agent");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/agent/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to agent panel
        </Link>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Offline Customer</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Create Customer Profile</h1>
        </div>
        <CustomerForm />
      </div>
    </main>
  );
}
