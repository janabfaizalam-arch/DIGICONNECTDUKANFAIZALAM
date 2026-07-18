import Link from "next/link";

const links = [
  ["/ap/dashboard", "Dashboard"],
  ["/ap/customers", "Customers"],
  ["/ap/applications", "Applications"],
  ["/ap/commissions", "Commissions"],
  ["/ap/wallet", "Wallet"],
  ["/ap/support", "Support"],
] as const;

export default function ApLayout({ children }: { children: React.ReactNode }) {
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
