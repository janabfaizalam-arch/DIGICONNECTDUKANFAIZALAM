import Link from "next/link";

import { listPublicServices } from "@/lib/services";

export default async function HomePage() {
  const services = await listPublicServices();

  return (
    <div>
      <section className="bg-gradient-to-b from-[var(--hero-from)] to-[var(--hero-to)] text-white">
        <div className="container-narrow flex min-h-[72vh] flex-col justify-end gap-6 py-16 sm:py-24">
          <p className="font-[family-name:var(--font-display)] text-4xl leading-tight tracking-tight sm:text-6xl">
            DigiConnect Dukan
          </p>
          <h1 className="max-w-2xl text-lg text-white/80 sm:text-xl">
            Digital government and business services — GST, ITR, licences and loans — applied online with clear tracking.
          </h1>
          <div className="flex flex-wrap gap-3">
            <Link href="/services" className="btn bg-white text-[var(--hero-from)]">
              Browse services
            </Link>
            <Link href="/customer/signup" className="btn border border-white/30 text-white">
              Create account
            </Link>
          </div>
        </div>
      </section>

      <section className="container-narrow py-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">Services</h2>
        <p className="mt-2 max-w-xl text-[var(--muted)]">Seven essential services. Nothing extra.</p>
        <ul className="mt-10 grid gap-0 sm:grid-cols-2">
          {services.map((service) => (
            <li key={service.slug} className="card-quiet">
              <Link href={`/services/${service.slug}`} className="block">
                <p className="text-lg font-semibold">{service.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{service.shortDescription}</p>
                <p className="mt-3 text-sm font-medium">₹{service.amount}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
