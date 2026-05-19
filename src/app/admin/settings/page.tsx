import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const settingsLinks = [
  { href: "/admin/services", title: "Services", description: "Catalog, pricing, service pages, and apply/enquiry behavior." },
  { href: "/admin/homepage-notices", title: "Homepage Notices", description: "Offer strip and announcement management." },
  { href: "/admin/homepage-slides", title: "Homepage Slides", description: "Homepage hero media and ordering." },
  { href: "/admin/payment-reconciliation", title: "Payment Reconciliation", description: "Razorpay sync and payment repair tools." },
];

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Settings" title="Admin Settings" description="Stable entry points for business setup and operational configuration." />
      <section className="grid gap-3 sm:grid-cols-2">
        {settingsLinks.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <p className="font-bold text-slate-950">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
