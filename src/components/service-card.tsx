import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import { formatCurrency } from "@/lib/portal-data";
import { type ServiceItem } from "@/lib/services-data";

export function ServicePrice({ service, className = "", compact = false }: { service: ServiceItem; className?: string; compact?: boolean }) {
  if (!service.offerPrice) {
    return <p className={`${compact ? "text-xs" : "text-sm"} font-extrabold text-orange-600 ${className}`}>{service.priceLabel}</p>;
  }

  return (
    <div className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      {service.oldPrice ? <span className="text-xs font-bold text-slate-400 line-through">{service.oldPrice}</span> : null}
      <span className={`${compact ? "text-sm" : "text-base md:text-lg"} font-extrabold text-orange-600`}>{service.offerPrice}</span>
    </div>
  );
}

export function ServiceCard({ service, compact = false }: { service: ServiceItem; compact?: boolean }) {
  const Icon = service.icon;

  return (
    <Link
      href={`/services/${service.slug}`}
      className={`liquid-card group flex h-full min-w-0 flex-col rounded-2xl transition duration-200 md:hover:-translate-y-1 ${
        compact ? "min-h-[11.75rem] p-3" : "min-h-[13rem] p-3 md:min-h-[18rem] md:p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`${compact ? "h-10 w-10" : "h-11 w-11 md:h-12 md:w-12"} flex shrink-0 items-center justify-center rounded-2xl border border-white/50 bg-white/70 text-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]`}>
          <Icon className={`${compact ? "h-4.5 w-4.5" : "h-5 w-5"}`} />
        </div>
        <span className="max-w-[5.4rem] rounded-full border border-orange-200/80 bg-orange-50/80 px-2 py-1 text-[9px] font-extrabold uppercase leading-none tracking-[0.04em] text-orange-700 md:max-w-none md:text-[11px]">
          {service.badge}
        </span>
      </div>

      <h3 className={`${compact ? "mt-3 min-h-10 text-sm" : "mt-3 min-h-10 text-sm md:mt-4 md:text-lg"} break-words font-bold leading-snug text-slate-950`}>{service.title}</h3>
      <p className={`${compact ? "hidden" : "mt-1.5 line-clamp-2 text-xs leading-5 md:mt-2 md:min-h-12 md:text-sm md:leading-6"} text-slate-600`}>{service.shortDescription}</p>
      <ServicePrice service={service} compact={compact} className="mt-2 md:mt-4" />
      {!compact && service.ctaType === "apply" ? (
        <p className="mt-3 rounded-2xl bg-blue-50/70 px-3 py-2 text-xs font-extrabold leading-5 text-blue-700">
          Get 20% Cashback in Wallet
        </p>
      ) : null}

      <div className={`${compact ? "pt-3" : "pt-4 md:pt-5"} mt-auto`}>
        <span className={`${compact ? "min-h-9 px-3 text-xs" : "min-h-10 px-3 text-xs md:min-h-11 md:px-4 md:text-sm"} inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#2563eb,#0f5db8)] font-extrabold text-white shadow-[0_8px_18px_rgba(37,99,235,0.15)] transition group-hover:bg-[linear-gradient(135deg,#f97316,#2563eb)]`}>
          View Details
          {service.ctaType === "apply" ? <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />}
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
