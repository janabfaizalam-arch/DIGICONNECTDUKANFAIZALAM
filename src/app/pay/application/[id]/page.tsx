import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PayButton } from "@/components/pay-button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PayApplicationPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const { data: application } = await supabase
    .from("applications")
    .select("id, service_name, amount, fresh_payable, payment_status, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!application || application.user_id !== user.id) notFound();

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Pay application</h1>
      <p className="mt-2 text-[var(--muted)]">{String(application.service_name)}</p>
      <p className="mt-6 text-3xl font-semibold">₹{Number(application.fresh_payable ?? application.amount ?? 0)}</p>
      {application.payment_status === "paid" ? (
        <p className="mt-6 text-teal-800">Already paid.</p>
      ) : (
        <div className="mt-8">
          <PayButton applicationId={String(application.id)} />
        </div>
      )}
      <Link href="/customer/dashboard" className="mt-8 inline-block text-sm underline">
        Back to dashboard
      </Link>
    </div>
  );
}
