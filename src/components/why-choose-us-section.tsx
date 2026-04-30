import { CheckCircle2 } from "lucide-react";

import { features } from "@/lib/constants";

export function WhyChooseUsSection() {
  return (
    <section className="section-pad bg-white/35">
      <div className="container-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-soft md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300">Why Choose Us</p>
          <h2 className="mt-4 text-3xl font-black leading-tight md:text-4xl">Professional local brand jo speed aur trust dono deliver karta hai</h2>
          <p className="mt-4 max-w-xl text-base leading-8 text-white/75">
            DigiConnect Dukan, powered by RNoS India Pvt Ltd, local families aur small businesses ko practical, fast aur guided support deta hai.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((item) => (
            <div key={item.title} className="rounded-2xl border bg-white/85 p-5 shadow-soft">
              <CheckCircle2 className="h-6 w-6 text-[var(--secondary)]" />
              <p className="mt-4 text-lg font-bold text-slate-900">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
