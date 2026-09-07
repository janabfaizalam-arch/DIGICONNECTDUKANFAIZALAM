import { redirect } from "next/navigation";

import { EngineTabs } from "@/components/content-engine/engine-tabs";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

/**
 * One admin check for every Content Engine screen.
 *
 * The middleware already keeps non-admins out of `/admin`, and this is the
 * second lock on the door: these screens spend money on model calls and reach
 * a public account, so the check is here as well as in every API route rather
 * than being inherited and assumed.
 */
export default async function ContentEngineLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-[1180px] pb-12">
      <header className="mb-4">
        <h1 className="text-[1.6rem] font-extrabold tracking-tight text-[var(--dc-ink)]">AI Content Engine</h1>
        <p className="mt-1 max-w-3xl text-[13px] font-medium leading-snug text-[var(--dc-body)]">
          Idea se lekar publish tak ka pura loop, ek jagah. Sarkari jaankari wali har post insaan ki approval
          ke bina kabhi publish nahi hogi.
        </p>
      </header>
      <EngineTabs />
      {children}
    </div>
  );
}
