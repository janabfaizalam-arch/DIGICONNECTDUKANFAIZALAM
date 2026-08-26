import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import type { ServiceItem } from "@/lib/services-data";
import { cn } from "@/lib/utils";

/**
 * The homepage's service card.
 *
 * One component now backs both Trending now and Featured digital assistance,
 * because they were two hand-built variations on the same card that had drifted
 * apart — different price rows, different CTA wording, different image
 * treatments.
 *
 * Two decisions worth keeping:
 *
 * **The copy sits below the image, never on it.** The old card laid the title
 * and description over the photograph behind a dark scrim. The catalogue's
 * photographs are bright — a laptop on a white desk, a passport on pale cloth —
 * so white text on a 25%-black scrim over them was close to unreadable, and it
 * got worse for exactly the services with the best artwork. An image band with
 * the words underneath is less clever and always legible.
 *
 * **A service with no price shows no price row.** `priceLabel` is the string
 * "Enquiry Now" when `amount` is 0, which the old layout printed under the
 * heading "Assistance fee" — so the card read "Assistance fee: Enquiry Now" and
 * then repeated the same words on the button beside it. When there is no fee to
 * quote the card now says so once, in the place a fee would have been.
 */

/** Gradient beds, from the logo's two ramps — the flame is the lead's alone. */
const BED_LEAD = "linear-gradient(150deg, #fe8602 0%, #f74a01 100%)";
const BED_REST = "linear-gradient(150deg, #0159c7 0%, #001d5f 100%)";

export function ServiceCard({
  service,
  imageSrc,
  featured = false,
  className,
  sizes = "(max-width: 768px) 82vw, 320px",
}: {
  service: ServiceItem;
  imageSrc: string | null;
  featured?: boolean;
  className?: string;
  sizes?: string;
}) {
  const href = `/services/${service.slug}`;
  const hasPrice = service.amount > 0;
  const badge = service.badge?.trim();

  return (
    <article
      className={cn("lg-card lg-raise lg-sheen group flex h-full flex-col overflow-hidden", className)}
    >
      <Link href={href} className="flex h-full flex-col focus-visible:outline-none">
        {/* Image band. `flex-1` on the featured card lets the picture absorb any
            extra column height instead of leaving a block of empty white. */}
        <span
          className={cn(
            "relative block overflow-hidden",
            featured ? "aspect-[16/10] lg:aspect-auto lg:min-h-[13rem] lg:flex-1" : "aspect-[16/10]",
          )}
          style={{ background: featured ? BED_LEAD : BED_REST }}
        >
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt=""
              fill
              loading="lazy"
              sizes={sizes}
              className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-9 w-9 text-white/70" aria-hidden="true" />
            </span>
          )}

          {badge ? (
            <span className="lg-pill absolute left-3 top-3 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--dc-flame)]">
              {badge}
            </span>
          ) : null}
        </span>

        {/* Copy */}
        <span className="flex flex-1 flex-col p-4">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-muted)]">
            {service.category}
          </span>

          <span
            className={cn(
              "mt-1.5 block font-extrabold leading-snug tracking-[-0.015em] text-[var(--dc-ink)] transition-colors group-hover:text-[var(--dc-blue-mid)]",
              featured ? "text-[1.35rem]" : "line-clamp-2 text-[15.5px]",
            )}
          >
            {service.title}
          </span>

          {service.shortDescription ? (
            <span
              className={cn(
                "mt-2 block font-medium leading-relaxed text-[var(--dc-body)]",
                featured ? "line-clamp-3 text-[14.5px]" : "line-clamp-2 text-[13px]",
              )}
            >
              {service.shortDescription}
            </span>
          ) : null}

          {/* Foot — pushed to the bottom so cards of different copy length still
              line their prices and buttons up across the row. */}
          <span className="mt-auto flex items-end justify-between gap-3 pt-4">
            <span className="min-w-0">
              {hasPrice ? (
                <>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--dc-muted)]">
                    Assistance fee
                  </span>
                  <span className="mt-0.5 block truncate text-[17px] font-extrabold text-[var(--dc-ink)]">
                    {service.priceLabel}
                  </span>
                </>
              ) : (
                <span className="block text-[12.5px] font-bold leading-snug text-[var(--dc-body)]">
                  Fee shared after
                  <br />
                  a free assessment
                </span>
              )}
            </span>

            <span
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-[13px] font-extrabold text-white transition duration-300 group-hover:brightness-110"
              style={{ background: featured ? BED_LEAD : BED_REST }}
            >
              {hasPrice ? "Apply now" : "Get a quote"}
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </span>
        </span>
      </Link>
    </article>
  );
}
