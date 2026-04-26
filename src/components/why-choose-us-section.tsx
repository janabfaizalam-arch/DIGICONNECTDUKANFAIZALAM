import { CheckCircle2 } from "lucide-react";

import { features } from "@/lib/constants";

export function WhyChooseUsSection() {
  return (
    <section className="section-pad">
      <div className="container-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-soft md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300">Why Choose Us</p>
          <h2 className="mt-4 text-3xl font-black leading-tight md:text-4xl">Professional local brand jo speed aur trust dono deliver karta hai</h2>
          <p className="mt-4 max-w-xl text-base leading-8 text-white/75">
            DigiConnect Dukan, powered by RNoS India Pvt Ltd, local families aur small businesses ko practical, fast aur guided support deta hai.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((item) => (
            <div key={item} className="rounded-[1.75rem] border bg-white/85 p-6 shadow-soft">
              <CheckCircle2 className="h-6 w-6 text-[var(--secondary)]" />
              <p className="mt-4 text-lg font-bold text-slate-900">{item}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Har step par clear guidance milti hai, taaki customer ko confusion ya repeat visits kam karni padein.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
