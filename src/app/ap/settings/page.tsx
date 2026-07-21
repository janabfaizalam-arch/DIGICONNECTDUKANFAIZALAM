import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, KeyRound, ShieldCheck, UserRound } from "lucide-react";

import { GlassPanel, PageHeader, TierBadge, VerifiedBadge } from "@/components/ap/ui";
import { partnerInitials } from "@/lib/ap/format";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Settings is a read-only account hub. Identity/KYC fields are not editable here
 * without dedicated backend validation endpoints.
 */
export default async function APSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) redirect("/unauthorized");

  const verified = ap.kyc_status === "approved" && ap.status === "active";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F6F8FC] pb-24 text-[#0F172A] md:pb-10">
      <div className="relative mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <PageHeader
          eyebrow="Account"
          title="Settings"
          description="Account overview and security shortcuts. Protected KYC and bank fields stay read-only on the portal."
        />

        <GlassPanel padding="md" className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 text-sm font-extrabold text-white">
            {ap.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ap.profile_photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              partnerInitials(ap.full_name)
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-base font-extrabold text-slate-900">{ap.full_name}</p>
            <p className="truncate text-xs font-semibold text-slate-500">
              {ap.business_name || "Shop name not set"} · {ap.partner_code}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {verified ? <VerifiedBadge /> : null}
              <TierBadge name={ap.tier?.name} />
            </div>
          </div>
        </GlassPanel>

        <GlassPanel padding="md" className="space-y-2 text-sm font-semibold text-slate-600">
          <p>
            <span className="text-slate-400">Mobile</span> · {ap.mobile || "—"}
          </p>
          <p className="truncate">
            <span className="text-slate-400">Email</span> · {ap.email || "—"}
          </p>
          <p>
            <span className="text-slate-400">Service area</span> ·{" "}
            {[ap.district, ap.state].filter(Boolean).join(", ") || "Not set"}
          </p>
        </GlassPanel>

        <nav aria-label="Account settings" className="grid gap-2">
          {[
            { href: "/ap/profile", label: "Full profile", icon: UserRound, hint: "Identity, bank and KYC snapshot" },
            { href: "/ap/documents", label: "Documents", icon: ShieldCheck, hint: "Partner KYC files" },
            { href: "/ap/change-password", label: "Change password", icon: KeyRound, hint: "Account security" },
            { href: "/ap/notifications", label: "Notifications", icon: Bell, hint: "Alerts workspace" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-[52px] items-center gap-3 rounded-[20px] border border-white/70 bg-white/75 px-4 shadow-sm backdrop-blur-xl transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-slate-900">{item.label}</span>
                  <span className="block text-[11px] font-semibold text-slate-500">{item.hint}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
