import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BadgeIndianRupee,
  CarFront,
  ChartNoAxesColumnIncreasing,
  Fingerprint,
  ReceiptText,
  Store,
  Utensils,
} from "lucide-react";

const services = [
  { label: "GST", href: "/services/gst-registration", icon: Store, bg: "bg-emerald-50 text-emerald-700 md:group-hover:bg-emerald-600 md:group-hover:text-white" },
  { label: "ITR", href: "/services/itr-filing", icon: ReceiptText, bg: "bg-blue-50 text-blue-700 md:group-hover:bg-blue-600 md:group-hover:text-white" },
  { label: "MSME", href: "/services/msme-certificate", icon: BadgeIndianRupee, bg: "bg-indigo-50 text-indigo-700 md:group-hover:bg-indigo-600 md:group-hover:text-white" },
  { label: "Food License", href: "/services/food-license-fssai", icon: Utensils, bg: "bg-amber-50 text-amber-700 md:group-hover:bg-amber-600 md:group-hover:text-white" },
  { label: "DSC", href: "/services/tax-business", icon: BadgeCheck, bg: "bg-cyan-50 text-cyan-700 md:group-hover:bg-cyan-600 md:group-hover:text-white" },
  { label: "Aadhaar", href: "/services/gov-id-form-submission", icon: Fingerprint, bg: "bg-purple-50 text-purple-700 md:group-hover:bg-purple-600 md:group-hover:text-white" },
  { label: "Driving Licence", href: "/services/driving-licence", icon: CarFront, bg: "bg-rose-50 text-rose-700 md:group-hover:bg-rose-600 md:group-hover:text-white" },
  { label: "CIBIL", href: "/services/cibil-report-analysis-and-credit-health-consultation", icon: ChartNoAxesColumnIncreasing, bg: "bg-orange-50 text-orange-700 md:group-hover:bg-orange-600 md:group-hover:text-white" },
];

export function HomepageServiceIconRow() {
  return (
    <section aria-label="Popular services" className="bg-white px-0 py-5 md:py-8">
      <div className="container-shell">
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-9 md:gap-3">
          {services.map(({ label, href, icon: Icon, bg }) => (
            <Link
              key={label}
              href={href}
              className="group flex min-h-[4.5rem] min-w-0 touch-manipulation flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-100 bg-white px-1 py-2 text-center shadow-[0_4px_16px_rgba(15,23,42,0.02)] transition duration-200 active:scale-[0.98] md:min-h-[5.5rem] md:px-3 md:py-3 md:hover:-translate-y-0.5 md:hover:border-slate-200 md:hover:shadow-[0_12px_28px_rgba(0,0,0,0.04)]"
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200 md:h-10 md:w-10 ${bg}`}>
                <Icon className="h-4.5 w-4.5 md:h-5 md:w-5" />
              </span>
              <span className="max-w-full break-words text-[10px] font-bold leading-tight text-slate-700 md:text-[11px]">{label}</span>
            </Link>
          ))}
          <Link
            href="/services"
            className="group flex min-h-[4.5rem] min-w-0 touch-manipulation flex-col items-center justify-center gap-1.5 rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,rgba(255,247,237,0.5),rgba(255,255,255,0.9))] px-1 py-2 text-center shadow-[0_8px_20px_rgba(249,115,22,0.04)] transition duration-200 active:scale-[0.98] md:min-h-[5.5rem] md:px-3 md:py-3 md:hover:-translate-y-0.5 md:hover:border-orange-200 md:hover:shadow-[0_12px_28px_rgba(249,115,22,0.08)]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white md:h-10 md:w-10 transition-transform duration-200 md:group-hover:scale-105">
              <ArrowRight className="h-4.5 w-4.5 md:h-5 md:w-5" />
            </span>
            <span className="max-w-full break-words text-[10px] font-extrabold leading-tight text-orange-950 md:text-[11px]">All Services</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
