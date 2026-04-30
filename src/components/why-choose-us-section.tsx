import { CheckCircle2 } from "lucide-react";

import { features } from "@/lib/constants";

const trustItems = [
  "1000+ Customers Served",
  "Fast Response Time",
  "Secure Document Handling",
  "Online Service Platform",
  "Powered by RNoS India Pvt Ltd",
];

export function WhyChooseUsSection() {
  return (
    <section className="section-pad bg-white/35">
      <div className="container-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-soft md:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-300">Why Choose Us</p>
          <h2 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">A professional digital service platform built for speed and trust</h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75">
            DigiConnect Dukan, powered by RNoS India Pvt Ltd, helps individuals and businesses apply for essential services online with secure guidance.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-white/85 p-5 shadow-soft md:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {trustItems.map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
          {features.map((item) => (
            <div key={item.title} className="rounded-2xl border bg-white/85 p-5 shadow-soft">
              <CheckCircle2 className="h-6 w-6 text-[var(--secondary)]" />
              <p className="mt-4 text-lg font-bold text-slate-900">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
