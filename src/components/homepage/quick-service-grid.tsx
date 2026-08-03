import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  LayoutGrid,
  ReceiptText,
  CarFront,
  ShieldCheck,
  IdCard,
  Landmark,
  BriefcaseBusiness,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

import { getPublicCategoriesWithCounts } from "@/lib/services";
import { resolveHomepageCategoryArt } from "@/lib/homepage-visual-assets";
import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";

const ICON_BY_MATCH: { match: RegExp; Icon: LucideIcon }[] = [
  { match: /pvc|card.?print|smart.?card|identity.?card/, Icon: CreditCard },
  { match: /passport|licence|license|driving|travel|tourism|vehicle/, Icon: CarFront },
  { match: /tax|gst|itr/, Icon: ReceiptText },
  { match: /company|compliance|incorporation|roc/, Icon: BriefcaseBusiness },
  { match: /loan|scheme|yojana|mudra|subsidy/, Icon: Landmark },
  { match: /bank|finance|credit|wallet|cibil/, Icon: Landmark },
  { match: /insur/, Icon: ShieldCheck },
  { match: /gov|document|certificate|id/, Icon: IdCard },
];

function iconFor(slug: string, title: string) {
  const hay = `${slug} ${title}`.toLowerCase();
  return ICON_BY_MATCH.find((item) => item.match.test(hay))?.Icon ?? LayoutGrid;
}

export async function QuickServiceGrid() {
  const categories = await getPublicCategoriesWithCounts();
  const visible = categories.filter((c) => (c.serviceCount ?? 0) > 0).slice(0, 6);

  if (!visible.length) return null;

  return (
    <HomepageSection id="categories" surface="white">
      <HomepageSectionHeader
        eyebrow="Browse"
        title="Browse by category"
        actionHref="/services"
        actionLabel="All categories"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((category) => {
          const art = resolveHomepageCategoryArt(category.slug, category.title);
          const Icon = iconFor(category.slug, category.title);
          return (
            <Link
              key={category.slug}
              href={`/services/${category.slug}`}
              className={`group relative flex min-h-[156px] overflow-hidden rounded-[var(--dc-card-radius)] border ${art.border} ${art.tone} p-4 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-600)]`}
            >
              <span className="relative z-10 flex max-w-[58%] flex-col justify-between">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${art.iconTone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="mt-3 block text-[15px] font-extrabold leading-snug text-[var(--dc-ink)]">
                    {category.title}
                  </span>
                  <span className="mt-1 block text-[13px] font-semibold text-[var(--dc-body)]">
                    {art.descriptor}
                    {" · "}
                    {category.serviceCount} service{category.serviceCount === 1 ? "" : "s"}
                  </span>
                  <span className="mt-2 inline-flex min-h-11 items-center gap-0.5 text-sm font-bold text-[var(--dc-blue-600)]">
                    Explore <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </span>
              </span>
              <span className="pointer-events-none absolute bottom-0 right-0 h-[88%] w-[48%]">
                <Image
                  src={art.src}
                  alt=""
                  fill
                  className="object-contain object-bottom-right opacity-95"
                  sizes="(max-width: 640px) 45vw, 220px"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </HomepageSection>
  );
}
