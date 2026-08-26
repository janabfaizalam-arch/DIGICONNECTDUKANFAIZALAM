import Image from "next/image";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { categoryGlyph } from "@/components/homepage/category-art";
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

/**
 * A small, stable number for a service.
 *
 * Used only to pick between equivalent decorative treatments, so that a grid of
 * cards with no photograph does not render the same tile thirty times. It must
 * be deterministic — the same service has to look the same on every render and
 * on the server as on the client — so it is a hash of the slug, not a random.
 */
function slugSeed(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Blue beds, all inside the logo's own ramp, differing only in depth and angle. */
const BEDS = [
  "linear-gradient(150deg, #0f6de0 0%, #001d5f 100%)",
  "linear-gradient(165deg, #0159c7 0%, #00164a 100%)",
  "linear-gradient(135deg, #1170dd 0%, #012456 100%)",
  "linear-gradient(158deg, #0b5fce 0%, #001936 100%)",
];

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
  const seed = slugSeed(service.slug);
  // Only the drawn band varies its bed; a card with a photograph keeps the one
  // flat blue behind it, because nothing of it is visible anyway.
  const bed = featured ? BED_LEAD : imageSrc ? BED_REST : BEDS[seed % BEDS.length];

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
          style={{ background: bed }}
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
            <ArtlessBand
              subject={`${service.slug} ${service.title} ${service.category}`}
              seed={seed}
              Glyph={service.icon}
            />
          )}

          {badge ? (
            <span className="lg-pill absolute left-3 top-3 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--dc-flame)]">
              {badge}
            </span>
          ) : null}
        </span>

        {/*
          Copy.

          `flex-1` deliberately only on the non-featured card. When both this
          and the image band above carried it, the two split the leftover
          column height between them — so the featured card grew a block of
          empty white between its description and its price row, which is the
          dead space this layout was supposed to remove. On the featured card
          the image takes all the slack and the copy stays its natural height.
        */}
        <span className={cn("flex flex-col p-3 sm:p-4", featured ? "" : "flex-1")}>
          {/* One line, always. "Company Registration & Compliance" wrapped to
              three lines in a 180px column and shoved the title halfway down
              the card, so cards in the same row no longer lined up. */}
          <span className="block truncate text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-muted)] sm:text-[10.5px] sm:tracking-[0.14em]">
            {service.category}
          </span>

          <span
            className={cn(
              "mt-1.5 block font-extrabold leading-snug tracking-[-0.015em] text-[var(--dc-ink)] transition-colors group-hover:text-[var(--dc-blue-mid)]",
              featured ? "text-[1.2rem] sm:text-[1.35rem]" : "line-clamp-2 text-[14px] sm:text-[15.5px]",
            )}
          >
            {service.title}
          </span>

          {service.shortDescription ? (
            <span
              className={cn(
                "mt-2 block font-medium leading-relaxed text-[var(--dc-body)]",
                featured ? "line-clamp-3 text-[13px] sm:text-[14.5px]" : "line-clamp-2 text-[12px] sm:text-[13px]",
              )}
            >
              {service.shortDescription}
            </span>
          ) : null}

          {/* Foot — pushed to the bottom so cards of different copy length still
              line their prices and buttons up across the row. */}
          {/* Below sm the grid is two columns on a 390px phone, so each card
              is about 180px wide — not enough for a price and a button to
              share a row. The foot stacks there and goes side-by-side from sm
              up, where there is room. */}
          <span className="mt-auto flex flex-col items-stretch gap-2 pt-3.5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-3 sm:gap-y-2.5 sm:pt-4">
            <span className="min-w-0 sm:min-w-[6.5rem] sm:flex-1">
              {hasPrice ? (
                <>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--dc-muted)]">
                    Assistance fee
                  </span>
                  <span className="mt-0.5 block truncate text-[15px] font-extrabold text-[var(--dc-ink)] sm:text-[17px]">
                    {service.priceLabel}
                  </span>
                </>
              ) : (
                /* No hard line break. On the 290px-wide phone rail card the
                   forced two-liner plus the button could not share a row, so
                   the text broke to four lines and crushed the button; letting
                   it wrap naturally — and letting the row wrap — keeps both
                   readable at every card width. */
                <span className="block text-[11.5px] font-bold leading-snug text-[var(--dc-body)] sm:text-[12.5px]">
                  Fee shared after a free assessment
                </span>
              )}
            </span>

            <span
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[12.5px] font-extrabold text-white transition duration-300 group-hover:brightness-110 sm:px-4 sm:text-[13px]"
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

/**
 * What a card shows when the catalogue has no photograph for that service.
 *
 * The catalogue only carries artwork for a handful of services, so most cards
 * outside the top few have none — and the first version of this card filled
 * that gap with one small sparkle on a flat gradient, which read as a broken
 * image rather than a design.
 *
 * This uses the vocabulary the category tiles already established: the jaali
 * lattice at low opacity, a large glyph, and the connector dots from the logo.
 * It is drawn, so it costs nothing.
 *
 * Everything below the jaali varies with the service's slug. On the homepage,
 * showing six cards, one fixed composition was enough. The services directory
 * shows thirty-four at once, and a fixed composition there produced a wall of
 * tiles that were pixel-identical apart from the words underneath — which is
 * exactly the "padded catalogue" look the drawn band was supposed to avoid. So
 * the bed's depth and angle, the ornament, its rotation and the placement of
 * the connector nodes are all chosen from a hash of the slug: stable for a
 * given service, different from its neighbours.
 */
function ArtlessBand({ subject, seed, Glyph }: { subject: string; seed: number; Glyph?: LucideIcon }) {
  // The service's own icon first. The category is part of the fallback subject
  // on purpose: matching on slug and title alone gave "Voter ID" a document
  // glyph, because "id" reaches the generic certificate rule before anything
  // notices it is a card; adding "Cards & PVC Printing" gets it the card.
  const Mark = Glyph ?? categoryGlyph(subject, "");
  const variant = seed % 4;
  const spin = (seed % 8) * 11 - 44;

  return (
    <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <span className="dc-jaali absolute inset-0 opacity-[0.13]" />

      <svg
        viewBox="0 0 200 130"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        focusable="false"
      >
        <g
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.14"
          transform={`rotate(${spin} 100 65)`}
        >
          {variant === 0 ? (
            <>
              <circle cx="100" cy="65" r="46" />
              <circle cx="100" cy="65" r="32" />
              <rect x="72" y="37" width="56" height="56" rx="8" transform="rotate(45 100 65)" />
            </>
          ) : null}

          {variant === 1 ? (
            <>
              {/* Ashtakona — two squares, eight points. */}
              <rect x="66" y="31" width="68" height="68" rx="6" />
              <rect x="66" y="31" width="68" height="68" rx="6" transform="rotate(45 100 65)" />
              <circle cx="100" cy="65" r="15" />
            </>
          ) : null}

          {variant === 2 ? (
            <>
              {/* Rays, like the spokes of a rangoli laid over a half circle. */}
              <circle cx="100" cy="65" r="50" />
              {[0, 45, 90, 135].map((a) => (
                <line
                  key={a}
                  x1="100"
                  y1="15"
                  x2="100"
                  y2="115"
                  transform={`rotate(${a} 100 65)`}
                  strokeOpacity="0.1"
                />
              ))}
            </>
          ) : null}

          {variant === 3 ? (
            <>
              {/* Nested diamonds, the kolam's simplest repeat. */}
              <rect x="74" y="39" width="52" height="52" transform="rotate(45 100 65)" />
              <rect x="60" y="25" width="80" height="80" transform="rotate(45 100 65)" />
              <circle cx="100" cy="65" r="7" />
            </>
          ) : null}
        </g>

        {/* Connector nodes and dashed link, from the logo's own mark. Their
            placement shifts with the seed so no two neighbours line up. */}
        <g fill="#ffffff" fillOpacity="0.4">
          <circle cx={18 + (seed % 5) * 9} cy={22 + (seed % 3) * 8} r="2.5" />
          <circle cx={168 - (seed % 4) * 8} cy={98 - (seed % 3) * 7} r="2" />
        </g>
        <path
          d={`M${18 + (seed % 5) * 9} ${22 + (seed % 3) * 8} L100 65 L${168 - (seed % 4) * 8} ${98 - (seed % 3) * 7}`}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.14"
          strokeDasharray="3 5"
        />
      </svg>

      <Mark className="relative h-12 w-12 text-white/85" strokeWidth={1.5} />
    </span>
  );
}
