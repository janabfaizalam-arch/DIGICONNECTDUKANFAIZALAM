import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeading } from "@/components/section-heading";
import { services } from "@/lib/constants";

export function ServicesSection() {
  return (
    <section id="services" className="section-pad">
      <div className="container-shell space-y-8 md:space-y-10">
        <SectionHeading
          eyebrow="Services"
          title="Complete digital service portfolio across India"
          description="Government applications, online forms, business registrations, and document support through one guided process."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map(({ title, slug, icon: Icon }) => (
            <Card key={slug} className="group rounded-2xl border-white/80 p-5 transition hover:-translate-y-1 hover:border-[var(--primary)]/25">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--muted)] text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-[var(--secondary)]" />
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-900 md:text-lg">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Document guidance, online form support, and expert follow-up.
              </p>
              <Link href={`/apply/${slug}`} className={buttonVariants({ size: "default", className: "mt-5 w-full" })}>
                Apply Now
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
