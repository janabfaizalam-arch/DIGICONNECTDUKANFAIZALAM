import { ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/section-heading";
import { services } from "@/lib/constants";

export function ServicesSection() {
  return (
    <section id="services" className="section-pad">
      <div className="container-shell space-y-12">
        <SectionHeading
          eyebrow="Services"
          title="Local customers ke liye complete digital service portfolio"
          description="Government applications, online forms, business registrations aur document support sab ek clean, guided process mein."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map(({ title, icon: Icon }) => (
            <Card key={title} className="group rounded-[1.75rem] border-white/80 p-5 transition hover:-translate-y-1 hover:border-[var(--primary)]/25">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--muted)] text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-[var(--secondary)]" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Application support, document guidance aur follow-up updates ek hi trusted desk se.
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
