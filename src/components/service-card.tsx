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
      className={`group flex h-full min-w-0 flex-col rounded-3xl border border-slate-100 bg-white/78 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.02)] backdrop-blur-sm transition duration-200 md:hover:-translate-y-1 md:hover:border-blue-100 md:hover:shadow-[0_12px_32px_rgba(37,99,235,0.06)] ${
        compact ? "min-h-[11rem]" : "min-h-[13rem] md:min-h-[17.5rem]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`${compact ? "h-9 w-9" : "h-11 w-11"} flex shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700`}>
          <Icon className={`${compact ? "h-4.5 w-4.5" : "h-5 w-5"}`} />
        </div>
        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[9px] font-extrabold uppercase leading-none tracking-[0.04em] text-orange-700 md:text-[10px]">
          {service.badge}
        </span>
      </div>

      <h3 className={`${compact ? "mt-3 min-h-8 text-xs" : "mt-4 min-h-10 text-sm md:text-base"} break-words font-extrabold leading-snug text-slate-950`}>{service.title}</h3>
      <p className={`${compact ? "hidden" : "mt-2 line-clamp-2 text-xs leading-relaxed md:min-h-10"} text-slate-500`}>{service.shortDescription}</p>
      
      <div className="mt-3 flex items-baseline">
        <ServicePrice service={service} compact={compact} />
      </div>
      
      {!compact && service.ctaType === "apply" ? (
        <p className="mt-3 rounded-xl bg-blue-50/50 px-3 py-1.5 text-[10px] font-extrabold leading-none text-blue-700">
          Get 20% Wallet Reward Earning
        </p>
      ) : null}

      <div className="mt-4 pt-2">
        <span className={`${compact ? "h-8 px-3 text-[11px]" : "h-9 px-4 text-xs"} inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/40 font-extrabold text-blue-700 transition duration-150 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 group-hover:shadow-[0_4px_12px_rgba(37,99,235,0.15)]`}>
          View Details
          {service.ctaType === "apply" ? <ArrowRight className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
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
