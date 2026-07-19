import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getAllServiceSlugs } from "@/lib/services-data";
import { getPublicServiceBySlug } from "@/lib/services";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllServiceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);
  return { title: service?.title ?? "Service" };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);
  if (!service) notFound();

  return (
    <div className="container-narrow py-12">
      <p className="text-sm text-[var(--muted)]">
        <Link href="/services">Services</Link> / {service.title}
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-tight">{service.title}</h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">{service.shortDescription}</p>
      <p className="mt-6 text-2xl font-semibold">₹{service.amount}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/customer/signup?service=${service.slug}`} className="btn btn-primary">
          Apply now
        </Link>
        <Link href="/contact" className="btn btn-secondary">
          Enquire
        </Link>
      </div>

      <section className="mt-12 grid gap-10 sm:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Documents required</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            {service.documents.map((doc) => (
              <li key={doc}>• {doc}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Benefits</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            {service.benefits.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
