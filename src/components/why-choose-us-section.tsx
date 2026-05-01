import { Gauge, Globe2, Headphones, ShieldCheck } from "lucide-react";

const trustCards = [
  { title: "Secure Process", description: "Private document handling with guided submission.", icon: ShieldCheck },
  { title: "Fast Online Support", description: "Quick help for forms, files, and next steps.", icon: Headphones },
  { title: "50+ Services", description: "Digital, documentation, and business assistance.", icon: Gauge },
  { title: "Pan India Access", description: "Online service support available across India.", icon: Globe2 },
];

export function WhyChooseUsSection() {
  return (
    <section id="why-choose-us" className="section-pad bg-white/35">
      <div className="container-shell space-y-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Why Choose Us</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">Built for reliable online service support</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            DigiConnect Dukan keeps the experience simple, secure, and accessible for customers across India.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {trustCards.map(({ title, description, icon: Icon }) => (
            <div key={title} className="liquid-card rounded-[1.5rem] p-4 md:p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-bold leading-tight text-slate-950 md:text-base">{title}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600 md:text-sm md:leading-6">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
