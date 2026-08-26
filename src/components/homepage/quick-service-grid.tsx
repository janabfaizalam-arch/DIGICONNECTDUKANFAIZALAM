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
import { BrandIcon, HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";
import { Stagger, StaggerItem } from "@/components/homepage/motion";

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

/**
 * Browse by category.
 *
 * The tiles used to carry six different pastel tints from the visual-asset
 * map, which meant the grid's colour told you nothing — the tint was decoration
 * that looked like information. Now every tile is the same glass, the category
 * artwork supplies the colour, and the only tile that differs is the first,
 * whose icon takes the flame ramp so the eye has somewhere to enter the grid.
 */
export async function QuickServiceGrid() {
  const categories = await getPublicCategoriesWithCounts();
  const visible = categories.filter((c) => (c.serviceCount ?? 0) > 0).slice(0, 6);

  if (!visible.length) return null;

  return (
    <HomepageSection id="categories" surface="white" wash="blue">
      <HomepageSectionHeader
        eyebrow="Browse"
        title="Browse by category"
        actionHref="/services"
        actionLabel="All categories"
      />

      <Stagger className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((category, index) => {
          const art = resolveHomepageCategoryArt(category.slug, category.title);
          const Icon = iconFor(category.slug, category.title);
          return (
            <StaggerItem key={category.slug} className="h-full">
              <Link
                href={`/services/${category.slug}`}
                className="lg-card lg-raise lg-sheen group relative flex min-h-[160px] h-full p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
              >
                <span className="relative z-10 flex max-w-[58%] flex-col justify-between">
                  <BrandIcon tone={index === 0 ? "flame" : "blue"}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </BrandIcon>
                  <span>
                    <span className="mt-3 block text-[15px] font-extrabold leading-snug text-[var(--dc-ink)]">
                      {category.title}
                    </span>
                    <span className="mt-1 block text-[13px] font-medium text-[var(--dc-body)]">
                      {art.descriptor}
                      {" · "}
                      {category.serviceCount} service{category.serviceCount === 1 ? "" : "s"}
                    </span>
                    <span className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-[var(--dc-blue-mid)]">
                      Explore
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                </span>

                <span className="pointer-events-none absolute bottom-0 right-0 h-[88%] w-[48%]">
                  <Image
                    src={art.src}
                    alt=""
                    fill
                    loading="lazy"
                    className="object-contain object-bottom-right opacity-95 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                    sizes="(max-width: 640px) 45vw, 220px"
                  />
                </span>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </HomepageSection>
  );
}
