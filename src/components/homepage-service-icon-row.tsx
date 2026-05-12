import Link from "next/link";
import {
  BadgeCheck,
  BadgeIndianRupee,
  CarFront,
  CreditCard,
  Fingerprint,
  ReceiptText,
  Store,
  Utensils,
} from "lucide-react";

const services = [
  { label: "GST", href: "/services/gst-registration", icon: Store },
  { label: "ITR", href: "/services/itr-filing", icon: ReceiptText },
  { label: "MSME", href: "/services/msme-certificate", icon: BadgeIndianRupee },
  { label: "Food License", href: "/services/food-license-fssai", icon: Utensils },
  { label: "PAN Card", href: "/services/pan-card", icon: CreditCard },
  { label: "DSC", href: "/services/tax-business", icon: BadgeCheck },
  { label: "Aadhaar", href: "/services/gov-id-form-submission", icon: Fingerprint },
  { label: "Driving Licence", href: "/services/driving-licence", icon: CarFront },
];

export function HomepageServiceIconRow() {
  return (
    <section aria-label="Popular services" className="bg-white px-0 py-4 md:py-6">
      <div className="container-shell">
        <div className="grid grid-cols-4 gap-2 md:grid-cols-8 md:gap-3">
          {services.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="group flex min-h-[4.7rem] min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-blue-100 bg-white px-1.5 py-2 text-center shadow-[0_6px_16px_rgba(15,23,42,0.04)] transition md:min-h-[5.5rem] md:px-3 md:py-3 md:hover:-translate-y-0.5 md:hover:border-orange-100 md:hover:bg-orange-50/35"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition group-hover:bg-orange-50 group-hover:text-orange-600 md:h-10 md:w-10">
                <Icon className="h-4.5 w-4.5 md:h-5 md:w-5" />
              </span>
              <span className="max-w-full break-words text-[10px] font-extrabold leading-tight text-slate-700 md:text-xs">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
