import { Gauge, Headphones, MessageCircle, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

const trustCards = [
  { title: "Fast Processing", description: "Clear next steps and quick application handling.", icon: Gauge, color: "bg-blue-50 text-blue-700" },
  { title: "Secure Data Handling", description: "Careful support for private customer documents.", icon: ShieldCheck, color: "bg-emerald-50 text-emerald-700" },
  { title: "Expert Team", description: "Professional guidance before and after submission.", icon: UsersRound, color: "bg-indigo-50 text-indigo-700" },
  { title: "PAN India Service", description: "Digital service assistance available across India.", icon: Sparkles, color: "bg-purple-50 text-purple-700" },
  { title: "WhatsApp Support", description: "Easy support on the number customers already use.", icon: MessageCircle, color: "bg-emerald-50 text-emerald-700" },
  { title: "Dedicated Help", description: "Helpful follow-up for forms, documents, and updates.", icon: Headphones, color: "bg-orange-50 text-orange-700" },
];

export function WhyChooseUsSection() {
  return (
    <section id="about" className="section-pad bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)]">
      <div className="container-shell space-y-8">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div className="reveal-on-scroll">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">About & Trust</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">Professional digital assistance by RNoS</h2>
          </div>
          <p className="reveal-on-scroll text-sm font-semibold leading-relaxed text-slate-600 md:text-base md:leading-8">
            DigiConnect Dukan is a digital support and document assistance platform powered by RNOS India Pvt Ltd. We help customers access Tax & Business, Vehicle Insurance, Finance & Banking, and Gov ID form support across India.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {trustCards.map(({ title, description, icon: Icon, color }) => (
            <div key={title} className="reveal-on-scroll rounded-3xl border border-slate-100 bg-white/78 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] backdrop-blur-sm transition duration-200 md:p-5 md:hover:-translate-y-1 md:hover:border-blue-100 md:hover:shadow-[0_12px_32px_rgba(37,99,235,0.06)]">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-extrabold leading-tight text-slate-950 md:text-base">{title}</p>
              <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-500 md:text-sm md:leading-6">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
