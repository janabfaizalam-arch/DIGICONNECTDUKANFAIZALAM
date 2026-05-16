import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  LayoutDashboard,
  LogIn,
  MessageCircle,
  ShieldCheck,
  Timer,
  UsersRound,
} from "lucide-react";

import { ApplyServiceTrigger } from "@/components/service-selection-modal";
import { generateWhatsAppLink } from "@/lib/whatsapp";

type HeroViewer =
  | { role: "customer"; name: string }
  | { role: "agent" | "staff" | "admin" | "super_admin" }
  | null;

type HeroSectionProps = {
  viewer?: HeroViewer;
};

const trustBadges = [
  { label: "Fast Process", icon: Timer },
  { label: "Secure Data", icon: ShieldCheck },
  { label: "WhatsApp Support", icon: UsersRound },
];

function getDashboardConfig(viewer: Exclude<HeroViewer, null>) {
  if (viewer.role === "agent") {
    return { href: "/agent/dashboard", label: "Agent Dashboard" };
  }

  if (viewer.role === "staff") {
    return { href: "/staff/dashboard", label: "Staff Dashboard" };
  }

  if (viewer.role === "admin" || viewer.role === "super_admin") {
    return { href: "/admin", label: "Admin Dashboard" };
  }

  return { href: "/customer/dashboard", label: "Dashboard" };
}

export function HeroSection({ viewer = null }: HeroSectionProps) {
  const isCustomer = viewer?.role === "customer";
  const dashboardConfig = viewer ? getDashboardConfig(viewer) : null;

  return (
    <section className="relative isolate overflow-hidden px-0 pb-4 pt-3 md:pb-8 md:pt-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_4%,rgba(37,99,235,0.14),transparent_28%),radial-gradient(circle_at_92%_16%,rgba(249,115,22,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(239,247,255,0.3))]" />
      <div className="container-shell">
        <div className="relative mx-auto min-w-0 overflow-hidden rounded-3xl border border-white/24 bg-[linear-gradient(135deg,#0f5db8_0%,#2563eb_50%,#f97316_100%)] px-4 py-5 shadow-[0_14px_34px_rgba(37,99,235,0.18)] sm:px-7 md:px-9 md:py-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.22),transparent_35%),radial-gradient(circle_at_82%_10%,rgba(255,255,255,0.22),transparent_24%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-center">
            <div className="reveal-on-scroll">
              <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/26 bg-white/16 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]">
                Fast Online Service • Secure Process • Quick Support
              </p>
              <div className="mt-4 space-y-3">
                <h1 className="max-w-3xl text-balance text-[2rem] font-bold leading-[1.05] text-white sm:text-5xl md:text-[3.45rem]">
                  Digital Services Made Simple
                </h1>
                <p className="max-w-2xl text-sm font-semibold leading-6 text-white/86 md:text-lg md:leading-8">
                  Apply for tax, finance, insurance, and government ID services online with quick WhatsApp support and secure document handling.
                </p>
                {isCustomer ? <p className="text-sm font-bold text-white/88 md:text-base">Welcome, {viewer.name}</p> : null}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {trustBadges.map(({ label, icon: Icon }) => (
                  <div key={label} className="min-w-0 rounded-2xl border border-white/18 bg-white/14 px-2.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                    <Icon className="mx-auto h-4 w-4 text-orange-100" />
                    <span className="mt-1 block text-[11px] font-extrabold leading-tight text-white">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 sm:flex sm:flex-row">
                {isCustomer ? (
                  <>
                    <ApplyServiceTrigger className="premium-button bg-white text-blue-700 shadow-[0_10px_22px_rgba(15,23,42,0.14)]">
                      <FileCheck2 className="h-4 w-4" />
                      Apply Now
                      <ArrowRight className="h-4 w-4" />
                    </ApplyServiceTrigger>
                    <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="premium-button border border-white/34 bg-white/16 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] md:hover:bg-white/22">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  </>
                ) : dashboardConfig ? (
                  <>
                    <Link href={dashboardConfig.href} className="premium-button bg-white text-blue-700 shadow-[0_10px_22px_rgba(15,23,42,0.14)]">
                      <LayoutDashboard className="h-4 w-4" />
                      {dashboardConfig.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="premium-button border border-white/34 bg-white/16 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] transition-all duration-200 md:hover:bg-white/22">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  </>
                ) : (
                  <>
                    <Link href="/login/customer" className="premium-button bg-white text-blue-700 shadow-[0_10px_22px_rgba(15,23,42,0.14)]">
                      <LogIn className="h-4 w-4" />
                      Login
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="premium-button border border-white/34 bg-white/16 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] transition-all duration-200 md:hover:bg-white/22">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="hidden reveal-on-scroll lg:block">
              <div className="rounded-3xl border border-white/22 bg-white/14 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/72">Simple process</p>
                <div className="mt-4 space-y-3">
                  {["Choose service", "Share documents", "Track support"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/16 p-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-700">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-extrabold text-white">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
