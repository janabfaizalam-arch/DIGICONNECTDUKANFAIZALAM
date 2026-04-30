import { redirect } from "next/navigation";
import Link from "next/link";
import { Headset, ShieldCheck, UserRound } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, getRoleHome } from "@/lib/auth";

const loginOptions = [
  {
    title: "Admin Login",
    description: "Manage applications, agents, and operations.",
    href: "/admin-login",
    icon: ShieldCheck,
  },
  {
    title: "Agent Login",
    description: "Track leads, customers, and commissions.",
    href: "/agent-login",
    icon: Headset,
  },
  {
    title: "Customer Login",
    description: "View applications, invoices, and updates.",
    href: "/customer-login",
    icon: UserRound,
  },
];

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(getRoleHome(role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(15,93,184,0.16),transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)]" />
      <Card className="glass-panel w-full max-w-md rounded-[1.75rem] border-white/70 p-5 shadow-soft md:p-7">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Login</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Choose your login</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Select the account type you use with DigiConnect Dukan.</p>

        <div className="mt-6 grid gap-3">
          {loginOptions.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-20 w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)]/30 hover:shadow-soft"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-white">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold text-slate-950">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-slate-600">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </main>
  );
}
