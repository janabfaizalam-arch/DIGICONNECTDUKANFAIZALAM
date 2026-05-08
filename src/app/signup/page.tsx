import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, Gift, ShieldCheck, WalletCards } from "lucide-react";

import { CustomerSignupCard } from "@/components/auth/customer-login-card";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Signup - DigiConnect Dukan",
  description: "Create a verified DigiConnect Dukan account and get your RNOS reward wallet.",
};

export default async function SignupPage({ searchParams }: { searchParams?: Promise<{ ref?: string }> }) {
  const query = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(isCustomerRole(role) ? "/customer/dashboard" : getRoleHome(role));
  }

  const referralCode = String(query?.ref ?? "").trim().toUpperCase();

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-4 py-6 md:px-8 md:py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(37,99,235,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(249,115,22,0.12),transparent_26%),linear-gradient(180deg,#fbfdff_0%,#eef6ff_52%,#f8fbff_100%)]" />
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <CustomerSignupCard referralCode={referralCode} />

        <section className="glass-panel relative hidden min-h-[34rem] overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-liquid lg:block">
          <div className="absolute inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_25%_20%,rgba(37,99,235,0.22),transparent_32%),radial-gradient(circle_at_88%_74%,rgba(249,115,22,0.16),transparent_30%)]" />
          <div className="liquid-card absolute left-7 top-8 w-[58%] rounded-2xl p-5">
            <Gift className="h-8 w-8 text-orange-600" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Verified Signup Reward</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-slate-950">Rs 50 wallet credit after email verification</h2>
          </div>
          <div className="liquid-card absolute bottom-10 right-8 w-[62%] rounded-2xl p-5">
            <div className="grid gap-3">
              {[
                { label: "Email verification only", icon: ShieldCheck },
                { label: "Referral rewards after paid order", icon: BadgeCheck },
                { label: "Wallet usable on services", icon: WalletCards },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/35 p-3 backdrop-blur-md">
                  <Icon className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
