import { BadgeCheck, FileText, Headset, Laptop, ShieldCheck, Smartphone } from "lucide-react";

import { SectionHeading } from "@/components/section-heading";

const galleryItems = [
  { title: "Document Support", icon: FileText, tone: "bg-blue-50 text-blue-700" },
  { title: "Online Applications", icon: Laptop, tone: "bg-orange-50 text-orange-700" },
  { title: "Mobile Updates", icon: Smartphone, tone: "bg-emerald-50 text-emerald-700" },
  { title: "Verified Process", icon: BadgeCheck, tone: "bg-sky-50 text-sky-700" },
  { title: "Secure Handling", icon: ShieldCheck, tone: "bg-slate-100 text-slate-700" },
  { title: "Customer Support", icon: Headset, tone: "bg-amber-50 text-amber-700" },
];

export function PhotoGallerySection() {
  return (
    <section id="gallery" className="section-pad">
      <div className="container-shell space-y-8">
        <SectionHeading
          eyebrow="Photo Gallery"
          title="A clean digital service experience"
          description="A quick look at the service moments DigiConnect Dukan supports every day."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {galleryItems.map(({ title, icon: Icon, tone }) => (
            <div key={title} className="min-h-44 rounded-2xl border bg-white p-5 shadow-soft">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="mt-8 text-lg font-bold text-slate-950">{title}</p>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div className="h-2 w-2/3 rounded-full bg-[var(--primary)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
