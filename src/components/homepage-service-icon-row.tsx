import Link from "next/link";
import {
  BadgeIndianRupee,
  CarFront,
  FileBadge2,
  FileText,
  HandCoins,
  IdCard,
  ReceiptText,
  ShieldCheck,
  Store,
  Utensils,
} from "lucide-react";

const services = [
  { label: "GST", href: "/services/gst-registration", icon: Store },
  { label: "ITR", href: "/services/itr-filing", icon: ReceiptText },
  { label: "MSME", href: "/services/msme-certificate", icon: BadgeIndianRupee },
  { label: "Food License", href: "/services/food-license-fssai", icon: Utensils },
  { label: "DPR Project Report", href: "/services/dpr-project-report", icon: FileText },
  { label: "Vehicle Insurance", href: "/services/insurance", icon: ShieldCheck },
  { label: "Loan", href: "/services/finance-banking", icon: HandCoins },
  { label: "Passport", href: "/services/passport-assistance", icon: FileBadge2 },
  { label: "Driving Licence", href: "/services/driving-licence", icon: CarFront },
  { label: "Voter Card", href: "/services/voter-id", icon: IdCard },
  { label: "Labour Card", href: "/services/labour-card-e-shram-card", icon: FileText },
];

export function HomepageServiceIconRow() {
  return (
    <section aria-label="Popular services" className="px-0 pb-5 md:pb-8">
      <div className="container-shell">
        <div className="glass-panel overflow-hidden rounded-[1.35rem] border border-white/10 px-3 py-3 shadow-liquid md:rounded-[1.75rem] md:px-4">
          <div className="relative z-10 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-6 lg:grid-cols-11">
            {services.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="group flex min-w-[5.25rem] flex-col items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/58 px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition md:min-w-0 md:hover:-translate-y-0.5 md:hover:bg-white/76"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition group-hover:bg-orange-50 group-hover:text-orange-600">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-extrabold leading-tight text-slate-700">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
