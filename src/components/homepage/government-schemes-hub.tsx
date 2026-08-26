import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Landmark, Briefcase, FileCheck } from "lucide-react";

import { HomepageSection, HomepageSectionHeader, HomepageMobileRail } from "@/components/homepage/ui";
import { getPublicServices } from "@/lib/services";
import { type ServiceItem } from "@/lib/services-data";
import { resolveHomepageServiceImage } from "@/lib/homepage-visual-assets";

const SCHEME_SLUGS = new Set([
  "pm-vishwakarma-yojana",
  "mudra-loan",
  "startup-india-assistance",
  "msme-registration",
  "msme-certificate",
  "cm-yuva-entrepreneur-loan-assistance",
  "pmegp-loan",
]);

function getSchemeIcon(slug: string) {
  switch (slug) {
    case "pm-vishwakarma-yojana":
      return ShieldCheck;
    case "mudra-loan":
    case "pmegp-loan":
      return Landmark;
    case "startup-india-assistance":
      return Briefcase;
    case "msme-registration":
    case "msme-certificate":
      return FileCheck;
    default:
      return ShieldCheck;
  }
}

function looksLikeScheme(service: ServiceItem) {
  if (SCHEME_SLUGS.has(service.slug)) return true;
  const hay = `${service.categorySlug} ${service.category} ${service.slug}`.toLowerCase();
  return /scheme|yojana|mudra|msme|udyam|pmegp|vishwakarma|startup|subsidy/.test(hay);
}

function SchemeCard({ scheme }: { scheme: ServiceItem }) {
  const Icon = getSchemeIcon(scheme.slug);
  const imageSrc = resolveHomepageServiceImage(scheme.slug, scheme.title, scheme.heroImageUrl);

  return (
    <Link
      href={`/services/${scheme.slug}`}
      className="lg-card lg-raise lg-sheen group flex h-full flex-col overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
    >
      <span className="relative block aspect-[16/10] bg-[var(--dc-blue-soft)]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt=""
            fill
            loading="lazy"
            className="object-cover transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
            sizes="360px"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[var(--dc-blue-mid)]">
            <Icon className="h-10 w-10" aria-hidden="true" />
          </span>
        )}
        <span className="lg-pill absolute left-3 top-3 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--dc-flame)]">
          Scheme assistance
        </span>
      </span>
      <span className="flex flex-1 flex-col p-4 md:p-5">
        <span className="text-xs font-black uppercase tracking-wider text-[var(--dc-muted)]">{scheme.category}</span>
        <span className="mt-1.5 line-clamp-2 text-lg font-extrabold leading-snug text-[var(--dc-ink)]">{scheme.title}</span>
        {scheme.shortDescription ? (
          <span className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-[var(--dc-body)]">
            {scheme.shortDescription}
          </span>
        ) : null}
        <span className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--dc-blue-bright)]/10 pt-3.5">
          <span>
            <span className="block text-[11px] font-bold uppercase text-[var(--dc-muted)]">RNOS assistance fee</span>
            <span className="mt-0.5 block text-base font-black text-[var(--dc-ink)]">{scheme.priceLabel}</span>
          </span>
          <span
            className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-bold text-white"
            style={{ background: "var(--dc-grad-blue)" }}
          >
            Apply
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </span>
      </span>
    </Link>
  );
}

export async function GovernmentSchemesHub() {
  let dbServices: ServiceItem[] = [];
  try {
    dbServices = await getPublicServices();
  } catch (err) {
    console.warn("[government-schemes-hub] Failed to retrieve dynamic services:", err);
  }

  const schemesList = dbServices.filter(looksLikeScheme).slice(0, 6);
  if (!schemesList.length) return null;

  return (
    <HomepageSection id="schemes" surface="sky" wash="dual">
      <HomepageSectionHeader
        eyebrow="Scheme assistance"
        title="Government schemes support"
        description="Private documentation and filing assistance for selected schemes. DigiConnect Dukan is not a government portal."
        actionHref="/services"
        actionLabel="Browse schemes"
      />

      <p className="lg-card mb-5 rounded-2xl px-4 py-3 text-sm font-bold text-[var(--dc-ink)] md:text-[15px]">
        Private assistance only — DigiConnect does not claim government affiliation or portal status.
      </p>

      {/* Desktop: three cards per row */}
      <ul className="hidden gap-5 md:grid md:grid-cols-2 lg:grid-cols-3">
        {schemesList.map((scheme) => (
          <li key={scheme.slug}>
            <SchemeCard scheme={scheme} />
          </li>
        ))}
      </ul>

      {/* Mobile horizontal rail */}
      <div className="md:hidden">
        <HomepageMobileRail>
          {schemesList.map((scheme) => (
            <div key={scheme.slug} className="w-[82%] max-w-[300px] shrink-0 snap-start">
              <SchemeCard scheme={scheme} />
            </div>
          ))}
        </HomepageMobileRail>
      </div>
    </HomepageSection>
  );
}
