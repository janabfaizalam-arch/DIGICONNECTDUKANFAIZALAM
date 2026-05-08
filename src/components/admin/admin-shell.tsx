import Link from "next/link";
import { BadgePercent, BarChart3, FileText, GalleryHorizontalEnd, Gift, LayoutDashboard, LogOut, Newspaper, Settings, UserCog, UsersRound, WalletCards } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: BarChart3 },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/wallet", label: "DigiWallet", icon: WalletCards },
  { href: "/admin/referrals", label: "Referrals", icon: Gift },
  { href: "/admin/rewards", label: "Rewards", icon: BadgePercent },
  { href: "/admin/cashback", label: "Cashback", icon: WalletCards },
  { href: "/admin/customers", label: "Customers", icon: UsersRound },
  { href: "/admin/staff", label: "Staff", icon: UserCog },
  { href: "/admin/gallery", label: "Gallery", icon: GalleryHorizontalEnd },
  { href: "/admin/articles", label: "Articles", icon: Newspaper },
  { href: "/#support", label: "Support", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7faff] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-blue-100 bg-white px-5 py-6 lg:block">
          <Link href="/admin" className="block">
            <p className="text-xl font-bold text-slate-950">DigiConnect Dukan</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Admin Office</p>
          </Link>
          <nav className="mt-8 grid gap-1.5">
            {adminLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                <Icon className="h-4 w-4 text-blue-600" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="absolute inset-x-5 bottom-6">
            <LogoutButton className="h-11 w-full justify-center bg-slate-950 text-white" />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/95 px-4 py-3 shadow-sm lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/admin" className="min-w-0">
                <p className="truncate text-base font-bold text-slate-950">DigiConnect Admin</p>
                <p className="text-xs font-semibold text-slate-500">Office workspace</p>
              </Link>
              <LogoutButton className="h-10 px-3 text-xs" />
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {adminLinks.filter((link) => link.href !== "/#support").map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-blue-100 bg-white px-3 text-xs font-bold text-slate-700">
                  <Icon className="h-3.5 w-3.5 text-blue-600" />
                  {label}
                </Link>
              ))}
              <Link href="/#support" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-blue-100 bg-white px-3 text-xs font-bold text-slate-700">
                <Settings className="h-3.5 w-3.5 text-blue-600" />
                Support
              </Link>
            </nav>
          </header>

          <main className="px-4 py-5 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-950 md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminStatCard({ title, value, icon: Icon, tone = "blue" }: { title: string; value: React.ReactNode; icon: typeof LogOut; tone?: "blue" | "orange" | "green" | "slate" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

export function AdminQuickActionCard({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: typeof LogOut }) {
  return (
    <Link href={href} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200">
      <Icon className="h-5 w-5 text-orange-600" />
      <p className="mt-3 font-bold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-8 text-center">
      <p className="text-lg font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
