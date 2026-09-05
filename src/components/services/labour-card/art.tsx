import {
  Accessibility,
  Baby,
  Bike,
  CloudRain,
  Droplets,
  Flame,
  GraduationCap,
  HeartCrack,
  HeartHandshake,
  Link2,
  Megaphone,
  PiggyBank,
  School,
  Stethoscope,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { SchemeCategory } from "@/lib/labour/types";

/**
 * The page's artwork, drawn rather than downloaded.
 *
 * Every illustration here is inline SVG in the brand palette. That is not a
 * compromise for its own sake: this page is read on a ₹6,000 phone on shop
 * wifi, and a set of stock photographs would have added a megabyte and a
 * second of blank space to the section a worker actually came to read. SVG
 * costs bytes in the hundreds, scales to any screen, and — because the fills
 * are the same tokens the rest of the site uses — the colour matches instead
 * of approximately matching.
 *
 * Everything is aria-hidden. None of it carries meaning the text does not
 * already carry, so a screen reader announcing "graphic" fifteen times would
 * be noise.
 */

/* ─────────────────────────────────────────────────────────────────────────
   Category colour and icon
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A colour and a mark per category.
 *
 * The colours are chosen to be told apart at a glance on a small screen and to
 * carry white at the weights used here. Nothing is encoded by colour alone —
 * every tile also has its icon and its written label.
 */
export const CATEGORY_ART: Record<SchemeCategory, { icon: LucideIcon; from: string; to: string }> = {
  child_maternity: { icon: Baby, from: "#be185d", to: "#f472b6" },
  marriage: { icon: HeartHandshake, from: "#be123c", to: "#fb7185" },
  education: { icon: GraduationCap, from: "#0f5db8", to: "#2f80ed" },
  cycle: { icon: Bike, from: "#0f766e", to: "#2dd4bf" },
  residential_education: { icon: School, from: "#5b21b6", to: "#a78bfa" },
  medical: { icon: Stethoscope, from: "#047857", to: "#34d399" },
  disability: { icon: Accessibility, from: "#0e7490", to: "#22d3ee" },
  death: { icon: HeartCrack, from: "#475569", to: "#94a3b8" },
  funeral: { icon: Flame, from: "#78350f", to: "#d97706" },
  pension: { icon: PiggyBank, from: "#b45309", to: "#fbbf24" },
  toilet: { icon: Droplets, from: "#075985", to: "#38bdf8" },
  skill: { icon: Wrench, from: "#c2410c", to: "#fb923c" },
  awareness: { icon: Megaphone, from: "#4338ca", to: "#818cf8" },
  disaster: { icon: CloudRain, from: "#b91c1c", to: "#f87171" },
  linked: { icon: Link2, from: "#0b3f80", to: "#1268e8" },
};

/** A category as a coloured tile — the fastest way to tell one card from another. */
export function CategoryBadge({ category, size = 44 }: { category: SchemeCategory; size?: number }) {
  const art = CATEGORY_ART[category];
  const Icon = art.icon;
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-2xl shadow-[0_6px_16px_-8px_rgba(16,33,61,0.55)]"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, ${art.from} 0%, ${art.to} 100%)`,
      }}
    >
      <Icon className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2.1} />
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   The hero scene
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A construction skyline with the card itself in front of it.
 *
 * The card is the subject because the card is what the page is about — a
 * worker recognises the object before they read the heading. The crane and the
 * scaffolding sit behind it at low contrast so they read as setting rather
 * than as competing detail.
 *
 * The only motion is the crane hook and the sun's glow, both slow and both
 * switched off under `prefers-reduced-motion` by the CSS in globals.
 */
export function HeroScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 330"
      className={className}
      role="presentation"
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="lc-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dbe7fa" />
        </linearGradient>
        <linearGradient id="lc-strip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="lc-tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.07" />
        </linearGradient>
        <radialGradient id="lc-sun" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fdba74" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#fdba74" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sun glow behind everything. */}
      <circle cx="330" cy="70" r="78" fill="url(#lc-sun)" className="lc-pulse" />
      <circle cx="330" cy="70" r="24" fill="#ffd7a8" opacity="0.9" />

      {/* Skyline. */}
      <rect x="24" y="150" width="62" height="150" rx="6" fill="url(#lc-tower)" />
      <rect x="96" y="112" width="74" height="188" rx="6" fill="url(#lc-tower)" />
      <rect x="256" y="168" width="58" height="132" rx="6" fill="url(#lc-tower)" />
      <rect x="324" y="196" width="70" height="104" rx="6" fill="url(#lc-tower)" />

      {/* Windows — a lit grid reads as "building" faster than any outline. */}
      <g fill="#ffffff" opacity="0.34">
        {[0, 1, 2, 3].map((row) =>
          [0, 1].map((col) => (
            <rect key={`a${row}${col}`} x={38 + col * 22} y={166 + row * 28} width="12" height="15" rx="2.5" />
          )),
        )}
        {[0, 1, 2, 3, 4].map((row) =>
          [0, 1, 2].map((col) => (
            <rect key={`b${row}${col}`} x={108 + col * 20} y={130 + row * 30} width="11" height="15" rx="2.5" />
          )),
        )}
        {[0, 1, 2, 3].map((row) => (
          <rect key={`c${row}`} x={270} y={184 + row * 27} width="28" height="13" rx="2.5" />
        ))}
      </g>

      {/* Crane: mast, jib, counterweight, and a hook that sways. */}
      <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3.2" strokeLinecap="round">
        <path d="M196 300V78" />
        <path d="M150 78h132" />
        <path d="M196 78l-30 26M196 78l30 26" strokeOpacity="0.35" />
        <path d="M196 300h-16m16-40h-16m16-40h-16" strokeOpacity="0.28" />
      </g>
      <rect x="150" y="70" width="18" height="16" rx="3" fill="#ffffff" fillOpacity="0.5" />
      <g className="lc-sway" style={{ transformOrigin: "266px 78px" }}>
        <path d="M266 80v44" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="256" y="124" width="20" height="14" rx="3" fill="#f97316" fillOpacity="0.9" />
      </g>

      {/* The Labour Card, tilted forward. */}
      <g transform="translate(76 176) rotate(-7)">
        <rect x="6" y="10" width="238" height="146" rx="18" fill="#071a31" opacity="0.4" />
        <rect width="238" height="146" rx="18" fill="url(#lc-card)" />
        <rect y="0" width="238" height="30" rx="18" fill="url(#lc-strip)" />
        <rect y="18" width="238" height="12" fill="url(#lc-strip)" />
        <text x="16" y="21" fill="#ffffff" fontSize="12.5" fontWeight="800" letterSpacing="0.4">
          LABOUR CARD
        </text>

        {/* Photograph panel with a helmeted head. */}
        <rect x="16" y="44" width="60" height="72" rx="10" fill="#e2edfb" />
        <circle cx="46" cy="76" r="15" fill="#134074" opacity="0.28" />
        <path d="M29 74a17 17 0 0 1 34 0z" fill="#f97316" />
        <rect x="27" y="73" width="38" height="5" rx="2.5" fill="#ea580c" />
        <path d="M28 116c2-14 8-22 18-22s16 8 18 22z" fill="#134074" opacity="0.45" />

        <rect x="88" y="48" width="118" height="9" rx="4.5" fill="#134074" opacity="0.8" />
        <rect x="88" y="66" width="88" height="8" rx="4" fill="#10213d" opacity="0.22" />
        <rect x="88" y="82" width="104" height="8" rx="4" fill="#10213d" opacity="0.22" />
        <rect x="88" y="98" width="70" height="8" rx="4" fill="#10213d" opacity="0.22" />

        {/* Verification tick — the card is a registration, and that is the point. */}
        <circle cx="206" cy="118" r="17" fill="#059669" />
        <path
          d="M198 118l6 6 12-13"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="88" y="120" width="86" height="7" rx="3.5" fill="#10213d" opacity="0.14" />
      </g>

      {/* Hazard rhythm along the base. */}
      <rect x="0" y="300" width="420" height="12" fill="#ffffff" fillOpacity="0.14" />
      <g fill="#f97316" fillOpacity="0.55">
        {/* Parallelograms, not skewed rects: a skew transform moves the whole
            row sideways by tan(angle) x height, which slid the stripes clean
            off one end of the band. */}
        {Array.from({ length: 15 }, (_, index) => {
          const x = index * 29;
          return <path key={index} d={`M${x + 8} 300h15l-8 12h-15z`} />;
        })}
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Section vignettes
   ───────────────────────────────────────────────────────────────────────── */

const STROKE = { strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A registration card opening a set of doors — one card, many schemes. */
export function OverviewArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 160" className={className} aria-hidden="true" fill="none">
      <rect x="8" y="26" width="96" height="66" rx="12" fill="#0f5db8" opacity="0.12" />
      <rect x="16" y="34" width="96" height="66" rx="12" fill="#ffffff" stroke="#0f5db8" strokeWidth="2.6" />
      <rect x="16" y="34" width="96" height="17" rx="12" fill="#0f5db8" />
      <rect x="16" y="43" width="96" height="8" fill="#0f5db8" />
      <circle cx="42" cy="72" r="11" fill="#f25a00" opacity="0.9" />
      <rect x="62" y="62" width="38" height="6" rx="3" fill="#0f5db8" opacity="0.45" />
      <rect x="62" y="75" width="30" height="6" rx="3" fill="#10213d" opacity="0.2" />

      {[0, 1, 2].map((index) => (
        <g key={index} transform={`translate(${140 + index * 32} ${44 + index * 14})`}>
          <rect width="26" height="42" rx="6" fill="#ffffff" stroke="#078b75" strokeWidth="2.4" />
          <circle cx="19" cy="24" r="2.6" fill="#078b75" />
        </g>
      ))}
      <path d="M116 78h20" stroke="#f25a00" strokeWidth="3" strokeDasharray="4 5" {...STROKE} />
    </svg>
  );
}

/** Tools of the trades the card covers. */
export function TradesArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 120" className={className} aria-hidden="true" fill="none">
      <rect x="0" y="94" width="240" height="8" rx="4" fill="#0f5db8" opacity="0.14" />
      {/* Helmet */}
      <path d="M28 88a26 26 0 0 1 52 0z" fill="#f25a00" />
      <rect x="22" y="86" width="64" height="9" rx="4.5" fill="#d94b00" />
      <path d="M54 62v-8" stroke="#d94b00" strokeWidth="4" {...STROKE} />
      {/* Trowel */}
      <path d="M108 88l30-30 14 14-30 30z" fill="#0f5db8" opacity="0.85" />
      <path d="M150 56l14-14" stroke="#10213d" strokeWidth="6" opacity="0.5" {...STROKE} />
      {/* Brick stack */}
      <g fill="#d94b00" opacity="0.8">
        <rect x="176" y="74" width="52" height="14" rx="3" />
        <rect x="184" y="56" width="52" height="14" rx="3" opacity="0.75" />
        <rect x="176" y="38" width="40" height="14" rx="3" opacity="0.55" />
      </g>
    </svg>
  );
}

/** A checked document set. */
export function DocumentsArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 150" className={className} aria-hidden="true" fill="none">
      <rect x="26" y="18" width="104" height="122" rx="12" fill="#0f5db8" opacity="0.1" />
      <rect x="40" y="10" width="104" height="122" rx="12" fill="#ffffff" stroke="#0f5db8" strokeWidth="2.6" />
      {[0, 1, 2, 3].map((index) => (
        <g key={index}>
          <circle cx="60" cy={38 + index * 24} r="6.5" fill="#0f9d58" opacity="0.9" />
          <path
            d={`M57 ${38 + index * 24}l2.4 2.5 4.4-5`}
            stroke="#ffffff"
            strokeWidth="2"
            {...STROKE}
          />
          <rect
            x="74"
            y={34 + index * 24}
            width={index % 2 ? 44 : 54}
            height="8"
            rx="4"
            fill="#10213d"
            opacity="0.18"
          />
        </g>
      ))}
      <rect x="158" y="46" width="62" height="78" rx="10" fill="#fff1e6" stroke="#f25a00" strokeWidth="2.4" />
      <circle cx="189" cy="72" r="12" fill="#f25a00" opacity="0.35" />
      <rect x="170" y="94" width="38" height="6" rx="3" fill="#f25a00" opacity="0.45" />
      <rect x="170" y="106" width="26" height="6" rx="3" fill="#f25a00" opacity="0.3" />
    </svg>
  );
}

/**
 * The route an application takes.
 *
 * Six nodes, because the list beside it has six steps and an illustration
 * that disagrees with the text it illustrates is worse than no illustration.
 * The colours are the same per-step tints the cards use, so the drawing and
 * the list read as one thing.
 */
export function ProcessArt({ className }: { className?: string }) {
  const steps = [
    { x: 26, y: 70, fill: "#0f5db8" },
    { x: 92, y: 44, fill: "#0f766e" },
    { x: 158, y: 62, fill: "#5b21b6" },
    { x: 224, y: 38, fill: "#0e7490" },
    { x: 290, y: 60, fill: "#c2410c" },
    { x: 356, y: 30, fill: "#047857" },
  ];
  return (
    <svg viewBox="0 0 382 100" className={className} aria-hidden="true" fill="none">
      <path
        d={`M${steps[0].x} ${steps[0].y}` +
          steps
            .slice(1)
            .map((step, index) => {
              const previous = steps[index];
              const midpoint = (previous.x + step.x) / 2;
              return ` C${midpoint} ${previous.y}, ${midpoint} ${step.y}, ${step.x} ${step.y}`;
            })
            .join("")}
        stroke="#0f5db8"
        strokeOpacity="0.3"
        strokeWidth="2.6"
        strokeDasharray="5 6"
        {...STROKE}
      />
      {steps.map((step, index) => (
        <g key={index}>
          <circle cx={step.x} cy={step.y} r="13" fill={step.fill} opacity="0.15" />
          <circle cx={step.x} cy={step.y} r="8.5" fill={step.fill} />
          <text x={step.x} y={step.y + 3.4} textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="800">
            {index + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** A form turned away — the section's whole subject in one shape. */
export function RejectionArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden="true" fill="none">
      <rect x="30" y="14" width="104" height="118" rx="12" fill="#ffffff" stroke="#f25a00" strokeWidth="2.6" />
      <rect x="46" y="36" width="72" height="8" rx="4" fill="#f25a00" opacity="0.3" />
      <rect x="46" y="54" width="54" height="8" rx="4" fill="#10213d" opacity="0.16" />
      <rect x="46" y="72" width="64" height="8" rx="4" fill="#10213d" opacity="0.16" />
      <rect x="46" y="90" width="40" height="8" rx="4" fill="#10213d" opacity="0.16" />
      <circle cx="140" cy="102" r="28" fill="#fee2e2" />
      <circle cx="140" cy="102" r="28" stroke="#dc2626" strokeWidth="3" />
      <path d="M130 92l20 20M150 92l-20 20" stroke="#dc2626" strokeWidth="4" {...STROKE} />
    </svg>
  );
}

/** The counter this is actually sold from. */
export function ShopArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 140" className={className} aria-hidden="true" fill="none">
      <rect x="20" y="46" width="180" height="80" rx="12" fill="#ffffff" stroke="#0f5db8" strokeWidth="2.6" />
      <path d="M14 46l16-24h160l16 24z" fill="#0f5db8" opacity="0.16" />
      <g fill="#f25a00" opacity="0.75">
        {Array.from({ length: 6 }, (_, index) => (
          <rect key={index} x={22 + index * 30} y="40" width="16" height="10" rx="3" />
        ))}
      </g>
      <rect x="40" y="70" width="60" height="40" rx="8" fill="#0f5db8" opacity="0.12" />
      <rect x="50" y="80" width="40" height="6" rx="3" fill="#0f5db8" opacity="0.5" />
      <rect x="50" y="92" width="28" height="6" rx="3" fill="#0f5db8" opacity="0.3" />
      <rect x="120" y="70" width="60" height="40" rx="8" fill="#078b75" opacity="0.12" />
      <circle cx="150" cy="86" r="11" fill="#078b75" opacity="0.5" />
      <rect x="132" y="102" width="36" height="6" rx="3" fill="#078b75" opacity="0.35" />
    </svg>
  );
}

/** Two people, one question. */
export function FaqArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 120" className={className} aria-hidden="true" fill="none">
      <rect x="12" y="16" width="110" height="60" rx="16" fill="#0f5db8" opacity="0.12" />
      <path d="M40 76l-4 20 24-20z" fill="#0f5db8" opacity="0.12" />
      <text x="52" y="56" textAnchor="middle" fill="#0f5db8" fontSize="30" fontWeight="800">
        ?
      </text>
      <rect x="82" y="52" width="106" height="54" rx="16" fill="#f25a00" opacity="0.14" />
      <path d="M164 106l6 16-24-16z" fill="#f25a00" opacity="0.14" />
      <rect x="98" y="70" width="60" height="8" rx="4" fill="#f25a00" opacity="0.5" />
      <rect x="98" y="86" width="42" height="8" rx="4" fill="#f25a00" opacity="0.32" />
    </svg>
  );
}
