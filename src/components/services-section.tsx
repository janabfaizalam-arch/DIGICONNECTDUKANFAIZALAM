import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CarFront,
  FileCheck2,
  FileSearch,
  HeartPulse,
  IdCard,
  Landmark,
  MapPinHouse,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";

const services = [
  { title: "PAN Card", subtitle: "Apply, correction, reprint", href: "/services/pan-card", icon: FileCheck2 },
  { title: "Aadhaar Update", subtitle: "Demographic update support", href: "/services/aadhaar-update", icon: IdCard },
  { title: "Voter ID", subtitle: "New ID and corrections", href: "/services/voter-id", icon: BadgeCheck },
  { title: "Ration Card", subtitle: "Family card assistance", href: "/services/ration-card", icon: WalletCards },
  { title: "Income Certificate", subtitle: "Certificate application help", href: "/services/income-caste-domicile-certificate", icon: FileSearch },
  { title: "Caste Certificate", subtitle: "Document guidance", href: "/services/income-caste-domicile-certificate", icon: Users },
  { title: "Domicile Certificate", subtitle: "Residence proof support", href: "/services/income-caste-domicile-certificate", icon: MapPinHouse },
  { title: "GST Registration", subtitle: "Business GST onboarding", href: "/services/gst-registration", icon: Building2 },
  { title: "MSME Certificate", subtitle: "Udyam/MSME support", href: "/services/msme", icon: Landmark },
  { title: "Passport Assistance", subtitle: "Form and appointment help", href: "/services/passport-assistance", icon: ShieldCheck },
  { title: "Driving Licence", subtitle: "Learner, permanent, renewal", href: "/services/driving-licence", icon: CarFront },
  { title: "Ayushman Card", subtitle: "Eligibility and print support", href: "/services/ayushman-card", icon: HeartPulse },
];

export function ServicesSection() {
  return (
    <section id="services" className="section-pad">
      <div className="container-shell space-y-8 md:space-y-10">
        <div className="reveal-on-scroll mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Services</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">Popular Digital & Government Services Online</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Compact PAN-India service support for PAN Card, Aadhaar, GST, certificates, licences, and document assistance.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {services.map(({ title, href, icon: Icon, subtitle }) => (
            <Link key={title} href={href} className="liquid-card reveal-on-scroll group rounded-[1.2rem] p-3.5 transition duration-300 hover:-translate-y-1 hover:border-blue-300/50 hover:shadow-[0_18px_42px_rgba(37,99,235,0.14)] md:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/30 text-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] backdrop-blur-md">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500" />
              </div>
              <h3 className="mt-3 text-sm font-bold leading-snug text-slate-950 md:text-base">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">{subtitle}</p>
            </Link>
          ))}
        </div>
        <div className="flex justify-center">
          <Link href="/services" className="premium-button premium-button-white">
            View All Services
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
