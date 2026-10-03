import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-shell";

import { LabourSchemeManager } from "@/components/admin/labour-scheme-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { daysSinceVerified, getAllLabourSchemes, needsReview } from "@/lib/labour/repository";

export const dynamic = "force-dynamic";

/**
 * Labour Card schemes, and how fresh each figure is.
 *
 * The list is ordered by whatever needs attention rather than by name: a
 * scheme nobody has re-read since March is the thing this screen exists to
 * surface.
 */
export default async function Page() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/admin/login");
  if (!isAdminRole(role)) redirect("/admin/login");

  const { schemes, source } = await getAllLabourSchemes();
  const rows = schemes
    .map((scheme) => ({
      ...scheme,
      daysSinceVerified: daysSinceVerified(scheme),
      stale: needsReview(scheme),
    }))
    .sort((a, b) => Number(b.stale) - Number(a.stale) || a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto max-w-[1100px] pb-10">
      <AdminPageHeader
        eyebrow="Services"
        title="Labour Card schemes"
        description="Sarkari rakam aur shartein badalti rehti hain. Yahan har scheme ke saath likha hai ki wo aakhri baar kab check hui thi — 90 din se purani ho to dobara dekh lijiye."
      />
      <LabourSchemeManager schemes={rows} readOnly={source === "seed"} />
    </div>
  );
}
