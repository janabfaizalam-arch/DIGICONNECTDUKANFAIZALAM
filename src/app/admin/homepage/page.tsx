import Link from "next/link";
import { redirect } from "next/navigation";
import { Image, Megaphone, Sparkles } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const LINKS = [
  {
    href: "/admin/homepage-slides",
    title: "Homepage Slides",
    // The first active slide now supplies the hero photo, headline, subtitle
    // and both buttons, so this is where the hero image is changed.
    description: "Hero image, headline and buttons",
    icon: Image,
  },
  {
    href: "/admin/homepage-notices",
    title: "Homepage Notices",
    description: "Announcement strip content",
    icon: Megaphone,
  },
  {
    href: "/admin/homepage-offer-strip",
    title: "Offer Strip",
    description: "Promotional offer strip",
    icon: Sparkles,
  },
];

export default async function AdminHomepageCmsHubPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/admin/login");
  if (!isAdminRole(role)) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Content"
        title="Homepage CMS"
        description="Manage public homepage banners, notices and offer strips. Existing editors open from these cards."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {LINKS.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-sm font-bold text-slate-900">{title}</p>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
