import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/section-heading";
import { featuredServices } from "@/lib/portal-data";

export function ServicesSection() {
  return (
    <section id="services" className="section-pad">
      <div className="container-shell space-y-8 md:space-y-10">
        <SectionHeading
          eyebrow="Featured Services"
          title="Main digital services for customers across India"
          description="Focused support for the most requested identity, document, licence, and business registration services."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featuredServices.map(({ title, slug, icon: Icon, description }) => (
            <Card key={slug} className="group relative rounded-2xl border-white/80 p-4 transition hover:-translate-y-1 hover:border-[var(--primary)]/25 md:p-5">
              <Link href={`/services/${slug}`} aria-label={`View ${title} details`} className="absolute inset-0 rounded-2xl" />
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--muted)] text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-[var(--secondary)]" />
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-900 md:text-lg">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {description}
              </p>
              <p className="mt-5 text-sm font-bold text-[var(--primary)]">View service details</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
