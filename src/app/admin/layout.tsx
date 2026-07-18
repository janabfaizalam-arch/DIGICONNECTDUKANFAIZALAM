import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const links = [
  ["/admin", "Overview"],
  ["/admin/customers", "Customers"],
  ["/admin/applications", "Applications"],
  ["/admin/services", "Services"],
  ["/admin/payments", "Payments"],
  ["/admin/agency-partners", "Partners"],
  ["/admin/coupons", "Coupons"],
  ["/admin/wallet", "Wallet"],
  ["/admin/notifications", "Notifications"],
  ["/admin/settings", "Settings"],
  ["/admin/reports", "Reports"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await getCurrentUserRole(user);
  if (!isAdminRole(role)) redirect("/unauthorized");

  return (
    <div className="min-h-screen">
      <div className="border-b border-[var(--border)] bg-white">
        <div className="container-narrow flex gap-4 overflow-x-auto py-3 text-sm">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap text-[var(--muted)] hover:text-[var(--fg)]">
              {label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
