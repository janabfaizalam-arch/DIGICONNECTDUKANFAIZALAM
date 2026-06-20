import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Settings,
  ListChecks,
  AlertOctagon,
  Image,
  RefreshCw,
  ArrowRight,
  Database,
  ShieldCheck,
  Smartphone,
  Eye,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type SettingItem = {
  href: string;
  title: string;
  description: string;
  badge: string;
  icon: typeof ListChecks;
  tone: "blue" | "orange" | "green" | "purple";
};

const settingsLinks: SettingItem[] = [
  {
    href: "/admin/services",
    title: "Service Catalog Registry",
    description: "Manage consumer service categories, pricing structures, TAT parameters, and dynamic workflow form builders.",
    badge: "Catalog",
    icon: ListChecks,
    tone: "blue",
  },
  {
    href: "/admin/homepage-notices",
    title: "Homepage Notices & Offer Strip",
    description: "Manage global layout notice banners, discount announcements, and thin scrolling text strips in real-time.",
    badge: "Notices",
    icon: AlertOctagon,
    tone: "orange",
  },
  {
    href: "/admin/homepage-slides",
    title: "Hero Media & Slides",
    description: "Update client dashboard landing page image slideshow orders, captions, and links with drag-and-drop hierarchy.",
    badge: "Media Gallery",
    icon: Image,
    tone: "purple",
  },
  {
    href: "/admin/payment-reconciliation",
    title: "Payment Reconciliation Ledger",
    description: "Synchronize stuck Razorpay invoice orders, repair mismatch payloads, and trigger manual wallet adjustment consistency audits.",
    badge: "Finance Core",
    icon: RefreshCw,
    tone: "green",
  },
];

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="System Configuration"
        title="Admin Settings Console"
        description="Configure central catalog rules, layout notifications, homepage slideshows, and financial API reconciliation parameters."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {settingsLinks.map((item) => {
          const Icon = item.icon;
          const toneClass = {
            blue: "bg-blue-50 text-blue-600 border-blue-100",
            orange: "bg-orange-50 text-orange-600 border-orange-100",
            purple: "bg-purple-50 text-purple-600 border-purple-100",
            green: "bg-emerald-50 text-emerald-600 border-emerald-100",
          }[item.tone];

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-300 hover:border-slate-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 glass-liquid-premium"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${toneClass}`}>
                    {item.badge}
                  </span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-105 ${toneClass}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                </div>
                <h3 className="mt-4 font-bold text-slate-900 text-sm font-heading group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>
              </div>
              
              <div className="mt-5 flex items-center justify-between border-t border-slate-50 pt-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1 font-semibold">
                  <Database className="h-3 w-3" /> System Registry
                </span>
                <span className="flex items-center gap-1 font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
                  Configure <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Advanced system statistics panel */}
      <Card className="p-5 border border-slate-200 bg-white/60 shadow-xs glass-liquid-premium grid gap-5 md:grid-cols-3">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 border border-slate-100 shrink-0">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 font-heading">Security Hardening</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">RBAC controls, JWT sessions, and RLS policies are enabled.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 border border-slate-100 shrink-0">
            <Smartphone className="h-4.5 w-4.5" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 font-heading">Capacitor PWA Sync</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">PWA install prompt, service worker caching, offline manifests are live.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 border border-slate-100 shrink-0">
            <Eye className="h-4.5 w-4.5" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 font-heading">Audit Trails Active</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">All configuration updates write logs to `system_events` table.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
