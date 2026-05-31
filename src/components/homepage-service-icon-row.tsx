import Link from "next/link";
import {
  ArrowRight,
  CarFront,
  CreditCard,
  Fingerprint,
  ReceiptText,
  ShieldCheck,
  Store,
} from "lucide-react";

const services = [
  { label: "GST", href: "/services/gst-registration-filing", icon: Store, gradient: "from-emerald-500 to-emerald-600" },
  { label: "ITR", href: "/services/itr-filing", icon: ReceiptText, gradient: "from-blue-500 to-blue-600" },
  { label: "Passport", href: "/services/passport", icon: Fingerprint, gradient: "from-purple-500 to-purple-600" },
  { label: "Driving Licence", href: "/services/learning-driving-license", icon: CarFront, gradient: "from-rose-500 to-rose-600" },
  { label: "Insurance", href: "/services/insurance", icon: ShieldCheck, gradient: "from-cyan-500 to-cyan-600" },
  { label: "Credit Cards", href: "/services/credit-cards", icon: CreditCard, gradient: "from-indigo-500 to-indigo-600" },
];

export function HomepageServiceIconRow() {
  return (
    <section aria-label="Popular services" className="bg-white px-3 py-3 md:px-0 md:py-6">
      <div className="container-shell">
        <div className="grid grid-cols-4 gap-2 md:grid-cols-8 md:gap-3">
          {services.map(({ label, href, icon: Icon, gradient }) => (
            <Link
              key={label}
              href={href}
              className="group flex min-w-0 touch-manipulation flex-col items-center justify-center gap-1.5 rounded-2xl bg-white px-1 py-2.5 text-center transition duration-150 active:scale-[0.95] md:py-3 md:hover:-translate-y-0.5 md:hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white shadow-sm transition-transform duration-150 group-active:scale-105 md:h-11 md:w-11`}>
                <Icon className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.8} />
              </span>
              <span className="max-w-full text-[10px] font-bold leading-tight text-slate-700 md:text-[11px]">{label}</span>
            </Link>
          ))}

          {/* All Services — always last */}
          <Link
            href="/services"
            className="group flex min-w-0 touch-manipulation flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 px-1 py-2.5 text-center transition duration-150 active:scale-[0.95] md:py-3 md:hover:-translate-y-0.5 md:hover:shadow-[0_8px_24px_rgba(249,115,22,0.08)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm transition-transform duration-150 group-active:scale-105 md:h-11 md:w-11">
              <ArrowRight className="h-4 w-4 md:h-5 md:w-5" strokeWidth={2} />
            </span>
            <span className="max-w-full text-[10px] font-extrabold leading-tight text-orange-950 md:text-[11px]">All Services</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

