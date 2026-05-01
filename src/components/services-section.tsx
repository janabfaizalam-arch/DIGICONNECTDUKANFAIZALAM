import Link from "next/link";
import { BadgeCheck, BriefcaseBusiness, Building2, CarFront, FileCheck2, FileText, IdCard, ShieldCheck } from "lucide-react";

const services = [
  {
    title: "Aadhaar Services",
    subtitle: "Update, print, and document support",
    href: "/services/aadhaar-update",
    icon: IdCard,
  },
  {
    title: "PAN Card Services",
    subtitle: "New PAN, correction, and reprint help",
    href: "/services/pan-card",
    icon: FileCheck2,
  },
  {
    title: "Voter ID Services",
    subtitle: "Application and correction assistance",
    href: "/services/voter-id",
    icon: BadgeCheck,
  },
  {
    title: "Passport Assistance",
    subtitle: "Form, appointment, and checklist support",
    href: "/services/passport-assistance",
    icon: ShieldCheck,
  },
  {
    title: "Driving Licence",
    subtitle: "Learner, permanent, and renewal support",
    href: "/services/driving-licence",
    icon: CarFront,
  },
  {
    title: "Business Registration",
    subtitle: "Registration guidance for businesses",
    href: "/services/trade-license",
    icon: BriefcaseBusiness,
  },
  {
    title: "GST Services",
    subtitle: "Registration and filing assistance",
    href: "/services/gst-registration",
    icon: Building2,
  },
  {
    title: "Digital Documentation",
    subtitle: "Certificates, forms, and online documents",
    href: "/services/other-government-services",
    icon: FileText,
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="section-pad">
      <div className="container-shell space-y-8 md:space-y-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Services</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">Popular Services</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Essential digital, government, and business service support in one clean online flow.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {services.map(({ title, href, icon: Icon, subtitle }) => (
            <Link key={title} href={href} className="liquid-card group rounded-[1.5rem] p-4 transition duration-300 hover:-translate-y-1 hover:border-blue-300/50 md:p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold leading-snug text-slate-950 md:text-base">{title}</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-600 md:text-sm md:leading-6">{subtitle}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
