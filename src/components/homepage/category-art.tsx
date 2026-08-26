import {
  Building2,
  CarFront,
  CreditCard,
  FileCheck2,
  HandCoins,
  Landmark,
  ReceiptText,
  Receipt,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/**
 * Category tile artwork.
 *
 * The tiles used to carry ten AI-generated 3D photographs, each on its own
 * opaque pastel gradient — mint, cream, blush, lilac. Dropped into the corner
 * of a white glass card they read as stickers pasted on: a hard rectangular
 * edge, ten background colours the brand does not contain, and a different
 * lighting direction in every one.
 *
 * This replaces them with drawn artwork. It is transparent by construction —
 * there is no background to clash, because there is no background at all — it
 * is painted from the logo's own two ramps, it stays sharp at any size, and
 * ten of these together cost less than one of the webp files they replace.
 *
 * The composition is the same in every tile so the grid reads as a set: a
 * large glyph on a soft brand disc, a jaali arc behind it, and two connector
 * nodes from the mark. Only the glyph changes.
 */

const GLYPH_BY_MATCH: { match: RegExp; Icon: LucideIcon }[] = [
  { match: /pvc|card.?print|smart.?card|identity.?card|cards/, Icon: CreditCard },
  { match: /passport|licence|license|driving|travel|tourism|vehicle/, Icon: CarFront },
  { match: /tax|gst|itr/, Icon: ReceiptText },
  { match: /company|compliance|incorporation|roc|opc|private.?limited/, Icon: Building2 },
  { match: /loan|scheme|yojana|mudra|pmegp|vishwakarma|subsidy/, Icon: HandCoins },
  { match: /bank|finance|credit|wallet|cibil|account/, Icon: Landmark },
  { match: /bill|recharge|utility|payment/, Icon: Receipt },
  { match: /insur/, Icon: ShieldCheck },
  { match: /gov|document|certificate|id/, Icon: FileCheck2 },
];

export function categoryGlyph(slug: string, title: string): LucideIcon {
  const hay = `${slug} ${title}`.toLowerCase();
  return GLYPH_BY_MATCH.find((item) => item.match.test(hay))?.Icon ?? FileCheck2;
}

/**
 * The decorative half of a category tile.
 *
 * `tone` picks which of the logo's two ramps the disc is tinted with. It is
 * passed rather than derived so the caller can reserve the flame ramp for the
 * one tile that should lead the grid.
 */
export function CategoryArt({
  slug,
  title,
  tone = "blue",
}: {
  slug: string;
  title: string;
  tone?: "blue" | "flame";
}) {
  const Icon = categoryGlyph(slug, title);
  const flame = tone === "flame";
  const ink = flame ? "var(--dc-flame)" : "var(--dc-blue-bright)";

  return (
    <span className="pointer-events-none absolute -bottom-6 -right-5 h-[10.5rem] w-[10.5rem]" aria-hidden="true">
      {/* Soft brand disc — the only fill, held low so the glyph reads on top */}
      <svg viewBox="0 0 168 168" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`cat-disc-${slug}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ink} stopOpacity="0.16" />
            <stop offset="100%" stopColor={ink} stopOpacity="0.02" />
          </radialGradient>
        </defs>

        <circle cx="84" cy="84" r="76" fill={`url(#cat-disc-${slug})`} />

        {/* Jaali arcs — the same lattice geometry as the hero, reduced to two
            concentric rings so it reads as texture rather than a second motif */}
        <g fill="none" stroke={ink} strokeOpacity="0.18">
          <circle cx="84" cy="84" r="66" />
          <rect x="46" y="46" width="76" height="76" rx="10" transform="rotate(45 84 84)" />
        </g>

        {/* Two connector nodes, straight from the logo's D–C bridge */}
        <g fill={ink}>
          <circle cx="22" cy="62" r="4" fillOpacity="0.5" />
          <circle cx="140" cy="34" r="3" fillOpacity="0.35" />
        </g>
        <path d="M22 62 L84 84 L140 34" fill="none" stroke={ink} strokeOpacity="0.16" strokeDasharray="4 6" />
      </svg>

      {/* The glyph itself, in the ramp rather than a flat colour */}
      <span
        className="absolute left-1/2 top-1/2 flex h-[3.6rem] w-[3.6rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.15rem] text-white shadow-[0_10px_24px_-10px_rgba(0,29,95,0.55)]"
        style={{ background: flame ? "var(--dc-grad-flame)" : "var(--dc-grad-blue)" }}
      >
        <Icon className="h-7 w-7" />
      </span>
    </span>
  );
}
