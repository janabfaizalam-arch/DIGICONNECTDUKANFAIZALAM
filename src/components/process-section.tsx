import { SectionHeading } from "@/components/section-heading";
import { processSteps } from "@/lib/constants";

export function ProcessSection() {
  return (
    <section id="process" className="section-pad">
      <div className="container-shell space-y-8 md:space-y-10">
        <SectionHeading
          eyebrow="Process"
          title="Simple 3-step process jo local customers ke liye easy aur transparent hai"
          description="Har application ko ek guided workflow mein handle kiya jata hai, jisse status samajhna aur documents complete rakhna aasaan ho."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {processSteps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border bg-white p-6 shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-lg font-bold text-white">
                0{index + 1}
              </div>
              <p className="mt-5 text-xl font-bold text-slate-900">{step.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
