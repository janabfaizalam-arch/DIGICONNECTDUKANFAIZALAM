import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import { formatCurrency } from "@/lib/portal-data";
import { type ServiceItem } from "@/lib/services-data";

export function ServicePrice({ service, className = "" }: { service: ServiceItem; className?: string }) {
  if (!service.offerPrice) {
    return <p className={`text-sm font-extrabold text-orange-600 ${className}`}>{service.priceLabel}</p>;
  }

  return (
    <div className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      {service.oldPrice ? <span className="text-xs font-bold text-slate-400 line-through">{service.oldPrice}</span> : null}
      <span className="text-lg font-extrabold text-orange-600">{service.offerPrice}</span>
    </div>
  );
}

export function ServiceCard({ service }: { service: ServiceItem }) {
  const Icon = service.icon;

  return (
    <Link
      href={`/services/${service.slug}`}
      className="liquid-card group flex h-full flex-col rounded-[1.25rem] p-4 transition duration-200 md:p-5 md:hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/50 bg-white/70 text-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-orange-200/80 bg-orange-50/80 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-orange-700">
          {service.badge}
        </span>
      </div>

      <h3 className="mt-4 text-base font-bold leading-snug text-slate-950 md:text-lg">{service.title}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{service.shortDescription}</p>
      <ServicePrice service={service} className="mt-4" />
      {service.ctaType === "apply" ? (
        <p className="mt-3 rounded-2xl bg-blue-50/70 px-3 py-2 text-xs font-extrabold leading-5 text-blue-700">
          Get 20% DigiWallet cashback after completed service
        </p>
      ) : null}

      <div className="mt-auto pt-5">
        <span className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563eb,#0f5db8)] px-4 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)] transition group-hover:bg-[linear-gradient(135deg,#f97316,#2563eb)]">
          {service.ctaType === "apply" ? "Apply Now" : "Enquiry Now"}
          {service.ctaType === "apply" ? <ArrowRight className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
        </span>
      </div>
    </Link>
  );
}

export function CategoryCard({
  title,
  description,
  href,
  icon: Icon,
  count,
}: {
  title: string;
  description: string;
  href: string;
  icon: ServiceItem["icon"];
  count: number;
}) {
  return (
    <Link href={href} className="liquid-card group rounded-[1.35rem] p-5 transition md:p-6 md:hover:-translate-y-1">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.2)]">
          <Icon className="h-6 w-6" />
        </div>
        <span className="rounded-full bg-white/75 px-3 py-1 text-xs font-extrabold text-slate-700">{count} services</span>
      </div>
      <h2 className="mt-5 text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-blue-700">
        View All
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export function DisplayAmount({ amount }: { amount: number }) {
  return amount > 0 ? formatCurrency(amount) : "Enquiry Now";
}
