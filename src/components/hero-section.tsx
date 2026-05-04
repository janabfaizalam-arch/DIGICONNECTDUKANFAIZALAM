import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Fingerprint,
  IdCard,
  LayoutDashboard,
  LogIn,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Timer,
  UsersRound,
} from "lucide-react";

import { generateWhatsAppLink } from "@/lib/whatsapp";

type HeroViewer =
  | { role: "customer"; name: string }
  | { role: "agent" | "staff" | "admin" | "super_admin" }
  | null;

type HeroSectionProps = {
  viewer?: HeroViewer;
};

const miniServices = [
  { label: "PAN", icon: FileCheck2, tone: "text-orange-500" },
  { label: "Aadhaar", icon: Fingerprint, tone: "text-blue-600" },
  { label: "GST", icon: Building2, tone: "text-sky-600" },
  { label: "Voter ID", icon: IdCard, tone: "text-emerald-600" },
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

  return { href: "/customer/dashboard", label: "My Dashboard" };
}

export function HeroSection({ viewer = null }: HeroSectionProps) {
  const isCustomer = viewer?.role === "customer";
  const dashboardConfig = viewer ? getDashboardConfig(viewer) : null;

  return (
    <section className="relative isolate overflow-hidden px-0 pb-8 pt-4 md:pb-14 md:pt-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(37,99,235,0.18),transparent_30%),radial-gradient(circle_at_92%_20%,rgba(249,115,22,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.55),rgba(239,247,255,0.35))]" />
      <div className="container-shell">
        <div className="glass-panel shadow-liquid mx-auto min-w-0 overflow-hidden rounded-[1.75rem] border border-white/10 px-5 py-6 sm:px-7 md:rounded-[2rem] md:px-9 md:py-8">
          <div className="grid gap-7 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="reveal-on-scroll">
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/45 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] sm:px-4 sm:text-sm">
                  <Sparkles className="h-4 w-4 shrink-0 text-orange-500" />
                  <span className="truncate">Digital Services Across India</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/70 bg-orange-50/80 px-3 py-1.5 text-xs font-extrabold text-orange-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:px-4 sm:text-sm">
                  <Timer className="h-4 w-4 shrink-0" />
                  Fast Service &ndash; Same Day Process Available
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <h1 className="max-w-3xl text-balance text-[2.15rem] font-bold leading-[1.05] text-slate-950 sm:text-5xl md:text-[3.65rem]">
                  All Digital & Government Services at One Place
                </h1>
                <p className="text-base font-bold text-blue-700 md:text-lg">
                  Connecting People, Empowering Digital India
                </p>
                <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base md:leading-8">
                  Apply for PAN, Aadhaar, GST, certificates, licences and more with fast, trusted and professional support.
                </p>
                {isCustomer ? (
                  <p className="text-sm font-bold text-slate-700 md:text-base">
                    Welcome, {viewer.name}
                  </p>
                ) : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-4 text-sm font-extrabold text-emerald-800 shadow-sm">
                  <UsersRound className="h-4 w-4" />
                  50000+ Customers Served
                </div>
                <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-blue-200/50 bg-white/45 px-4 text-sm font-semibold text-blue-800 shadow-sm">
                  <ShieldCheck className="h-4 w-4" />
                  Secure Document Support
                </div>
              </div>
              <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 min-[390px]:grid-cols-2 sm:flex sm:flex-row">
                {isCustomer ? (
                  <>
                    <Link href="/services" className="premium-button premium-button-blue">
                      <FileCheck2 className="h-4 w-4" />
                      Apply Now
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/customer/dashboard" className="premium-button border border-white/15 bg-white/65 text-blue-800 shadow-sm md:hover:-translate-y-0.5 md:hover:bg-white/80">
                      <LayoutDashboard className="h-4 w-4" />
                      My Dashboard
                    </Link>
                  </>
                ) : dashboardConfig ? (
                  <Link href={dashboardConfig.href} className="premium-button premium-button-blue">
                    <LayoutDashboard className="h-4 w-4" />
                    {dashboardConfig.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link href="/login/customer" className="premium-button premium-button-blue">
                      <LogIn className="h-4 w-4" />
                      Login to Apply
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="premium-button premium-button-whatsapp">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp Support
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="relative min-h-[24rem] reveal-on-scroll lg:min-h-[28rem]">
              <div className="absolute inset-5 rounded-[2rem] bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.2),transparent_30%),radial-gradient(circle_at_86%_70%,rgba(249,115,22,0.16),transparent_28%)]" />
              <div className="floating-card-tilt-left liquid-card absolute left-0 top-4 w-[82%] rounded-[1.6rem] p-4 sm:w-[72%]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Digital Verification</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">Document Processing</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-bold text-emerald-700">Secure</span>
                </div>
                <div className="mt-4 space-y-2.5">
                  {["Identity proof checked", "Application details reviewed", "Service status updated"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/45 p-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-bold text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="floating-card-tilt-right liquid-card absolute bottom-6 right-0 w-[88%] rounded-[1.75rem] p-4 sm:w-[76%]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Popular Services</p>
                  <ClipboardCheck className="h-4 w-4 text-orange-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {miniServices.map(({ label, icon: Icon, tone }) => (
                    <div key={label} className="rounded-[1.1rem] border border-white/20 bg-white/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                      <Icon className={`h-5 w-5 ${tone}`} />
                      <p className="mt-3 text-sm font-semibold text-slate-950">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute right-6 top-0 rounded-full border border-white/20 bg-white/55 px-4 py-2 text-xs font-bold text-orange-600 shadow-sm">
                Government Services Online
              </div>
              <div className="absolute bottom-0 left-7 rounded-full border border-white/15 bg-slate-950/86 px-4 py-2 text-xs font-bold text-white shadow-sm">
                PAN Card, Aadhaar, GST, Certificates
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
