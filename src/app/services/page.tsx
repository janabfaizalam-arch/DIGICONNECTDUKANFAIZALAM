import Link from "next/link";
import type { Metadata } from "next";

import { listPublicServices } from "@/lib/services";

export const metadata: Metadata = {
  title: "Services",
};

export default async function ServicesPage() {
  const services = await listPublicServices();

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Services</h1>
      <p className="mt-2 text-[var(--muted)]">Choose a service to start your application.</p>
      <ul className="mt-10 divide-y divide-[var(--border)]">
        {services.map((service) => (
          <li key={service.slug} className="py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{service.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{service.shortDescription}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium">₹{service.amount}</span>
                <Link href={`/services/${service.slug}`} className="btn btn-primary">
                  View
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
