import { Gauge, Headphones, MessageCircle, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

const trustCards = [
  { title: "Fast Processing", description: "Clear next steps and quick application handling.", icon: Gauge },
  { title: "Secure Data Handling", description: "Careful support for private customer documents.", icon: ShieldCheck },
  { title: "Expert Team", description: "Professional guidance before and after submission.", icon: UsersRound },
  { title: "PAN India Service", description: "Digital service assistance available across India.", icon: Sparkles },
  { title: "WhatsApp Support", description: "Easy support on the number customers already use.", icon: MessageCircle },
  { title: "Dedicated Help", description: "Helpful follow-up for forms, documents, and updates.", icon: Headphones },
];

export function WhyChooseUsSection() {
  return (
    <section id="about" className="section-pad bg-white/28">
      <div className="container-shell space-y-8">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div className="reveal-on-scroll">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">About & Trust</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">Professional digital service assistance powered by RNoS</h2>
          </div>
          <p className="reveal-on-scroll text-base leading-7 text-slate-600">
            DigiConnect Dukan is a professional digital service and document assistance platform powered by RNoS India Pvt Ltd. We help customers access Government Services Online with secure PAN-India support for PAN Card, Aadhaar, GST, certificates, licences, and more.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {trustCards.map(({ title, description, icon: Icon }) => (
            <div key={title} className="liquid-card reveal-on-scroll rounded-[1.2rem] p-4 transition-transform duration-200 md:p-5 md:hover:-translate-y-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold leading-tight text-slate-950 md:text-base">{title}</p>
              <p className="mt-1.5 text-xs leading-5 text-slate-600 md:text-sm md:leading-6">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
