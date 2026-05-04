import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, FileCheck2, ShieldCheck, Smartphone, UploadCloud } from "lucide-react";

import { CustomerLoginCard } from "@/components/auth/customer-login-card";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Login - DigiConnect Dukan",
  description:
    "Login to track your digital service applications, upload documents and manage your DigiConnect Dukan account.",
};

export default async function CustomerLoginPage() {
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(isCustomerRole(role) ? "/customer/dashboard" : getRoleHome(role));
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-4 py-6 md:px-8 md:py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(37,99,235,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(249,115,22,0.12),transparent_26%),linear-gradient(180deg,#fbfdff_0%,#eef6ff_52%,#f8fbff_100%)]" />
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <CustomerLoginCard />

        <section className="glass-panel relative hidden min-h-[34rem] overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-liquid lg:block">
          <div className="absolute inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_25%_20%,rgba(37,99,235,0.22),transparent_32%),radial-gradient(circle_at_88%_74%,rgba(249,115,22,0.16),transparent_30%)]" />

          <div className="floating-card-tilt-left liquid-card absolute left-7 top-8 w-[58%] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Secure Login</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight text-slate-950">Customer dashboard access</h2>
              </div>
              <ShieldCheck className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-5 grid gap-2">
              {["Applications", "Documents", "Service status"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/35 p-3 backdrop-blur-md">
                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="floating-card-tilt-right liquid-card absolute bottom-10 right-8 w-[62%] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Track Service</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Apply", icon: Smartphone },
                { label: "Upload", icon: UploadCloud },
                { label: "Track", icon: FileCheck2 },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-white/15 bg-white/30 p-3 text-center backdrop-blur-md">
                  <Icon className="mx-auto h-5 w-5 text-blue-600" />
                  <p className="mt-2 text-xs font-semibold text-slate-700">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-full bg-slate-950/90 px-4 py-2 text-center text-xs font-bold text-white">
              Fast, secure customer workspace
            </div>
          </div>

          <div className="floating-card floating-card-slow absolute right-12 top-12 rounded-full border border-white/15 bg-white/35 px-4 py-2 text-xs font-bold text-blue-700 shadow-liquid backdrop-blur-md">
            Digital Services Across India
          </div>
        </section>
      </div>
    </main>
  );
}
