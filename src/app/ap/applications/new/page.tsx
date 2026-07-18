import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, isAgencyPartnerRole } from "@/lib/auth";
import { listPublicServices } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function ApNewApplicationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  const role = await getCurrentUserRole(user);
  if (!isAgencyPartnerRole(role)) redirect("/unauthorized");

  const services = await listPublicServices();

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Submit application</h1>
      <p className="mt-2 text-[var(--muted)]">Create a customer application for one of the seven services.</p>
      <form action="/api/ap/applications" method="post" className="mt-8 max-w-lg space-y-4">
        <label className="block text-sm">
          Customer name
          <input name="full_name" required className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">
          Mobile
          <input name="mobile" required className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">
          Service
          <select name="service_slug" required className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2">
            {services.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.title} — ₹{service.amount}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary">
          Create
        </button>
      </form>
    </div>
  );
}
