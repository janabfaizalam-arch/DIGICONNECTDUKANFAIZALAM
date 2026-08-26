import Image from "next/image";

/**
 * The homepage's brand atmosphere.
 *
 * Two exports, one vocabulary:
 *
 *   <BrandField />  the deep navy-to-blue field the hero sits on
 *   <BrandWash />   the pale version that gives the light bands something for
 *                   the clear-glass panels to refract
 *
 * The ornament is deliberate. The logo's mark is a "D" and a "C" bridged by a
 * dot-and-line connector — a network link — so the field is drawn as a mesh of
 * nodes and links in the logo's own blue. Around it sit two pieces of Indian
 * geometry: an eight-point sitara jaali (the lattice screen you see cut into
 * stone at Fatehpur Sikri) and a rangoli mandala of petals and spokes.
 *
 * Both are ornamental geometry, chosen precisely because they are *not* state
 * iconography: no tricolour, no Ashoka Chakra, no emblem. RNOS is a private
 * assistance company and must not imply it is a government portal — and a page
 * that borrows official symbols is exactly the thing a careful customer is
 * right to distrust.
 *
 * It is all inline SVG and gradients: a few kB of markup that scales to any
 * viewport, needs no second art-directed raster, and causes no layout shift.
 */

/** Node positions for the connectivity mesh, in the 1440×900 field viewBox. */
const NODES: readonly (readonly [number, number])[] = [
  [188, 232],
  [262, 556],
  [468, 630],
  [512, 300],
  [656, 458],
  [872, 534],
  [960, 748],
  [1072, 366],
  [1218, 198],
  [1306, 606],
];

/** Links between those nodes — the "Connect" half of the mark, spelled out. */
const LINKS = [
  "M96 700 L262 556 L468 630 L656 458 L872 534 L1072 366 L1330 462",
  "M60 296 L188 232 L512 300 L656 458",
  "M262 556 L188 232",
  "M872 534 L960 748 L1218 690",
  "M1072 366 L1218 198",
  "M1306 606 L1072 366",
] as const;

function Mandala({ cx, cy, r, className }: { cx: number; cy: number; r: number; className?: string }) {
  const petals = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return {
      x1: cx + Math.cos(a) * r * 0.34,
      y1: cy + Math.sin(a) * r * 0.34,
      x2: cx + Math.cos(a) * r,
      y2: cy + Math.sin(a) * r,
    };
  });

  return (
    <g className={className} style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <circle cx={cx} cy={cy} r={r} />
      <circle cx={cx} cy={cy} r={r * 0.7} />
      <circle cx={cx} cy={cy} r={r * 0.34} />
      {petals.map((p, i) => (
        <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} />
      ))}
      {/* Petal ring — the rangoli read, and what keeps this from resembling a
          spoked national emblem. */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        const px = cx + Math.cos(a) * r * 0.7;
        const py = cy + Math.sin(a) * r * 0.7;
        return <circle key={`p${i}`} cx={px} cy={py} r={r * 0.13} />;
      })}
    </g>
  );
}

/**
 * The hero's dark field.
 *
 * @param imageUrl Optional admin-managed atmosphere photo, already validated
 *   as https by the caller. It is treated as texture, never as subject: the
 *   composition has to hold up when no slide has been set, which is most of
 *   the time.
 */
export function BrandField({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* 1 — the brand ramp, deepest at the top so the fixed header reads */}
      <div className="absolute inset-0" style={{ background: "var(--dc-grad-field)" }} />

      {/* 2 — optional CMS photograph, held back to texture */}
      {imageUrl ? (
        <div className="absolute inset-0 opacity-[0.2] mix-blend-luminosity">
          <Image src={imageUrl} alt="" fill priority sizes="100vw" className="object-cover object-center" />
        </div>
      ) : null}

      {/* 3 — the jaali screen, tiled and faded out toward the copy */}
      <div
        className="dc-jaali absolute inset-0 opacity-[0.07]"
        style={{
          maskImage: "radial-gradient(120% 90% at 50% 42%, transparent 18%, #000 78%)",
          WebkitMaskImage: "radial-gradient(120% 90% at 50% 42%, transparent 18%, #000 78%)",
        }}
      />

      {/* 4 — two slow atmospheric orbs, one brand flame, one brand sky */}
      <div className="dc-orb dc-orb-flame lg-drift -left-[16%] -top-[26%] h-[70vw] max-h-[680px] w-[70vw] max-w-[680px] opacity-60" />
      <div className="dc-orb dc-orb-sky lg-drift-slow -bottom-[28%] -right-[14%] h-[72vw] max-h-[720px] w-[72vw] max-w-[720px] opacity-55" />

      {/* 5 — mesh, mandala and the service motifs */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient id="dc-link" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#8ec5ff" stopOpacity="0.04" />
          </linearGradient>
          <radialGradient id="dc-centre" cx="50%" cy="36%" r="64%">
            <stop offset="0%" stopColor="#2f8bf0" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#00102c" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1440" height="900" fill="url(#dc-centre)" />

        <g stroke="#ffffff" strokeOpacity="0.085" fill="none" strokeWidth="1">
          <Mandala cx={1214} cy={196} r={158} className="lg-spin-slow" />
          <Mandala cx={168} cy={742} r={104} className="lg-spin-slow" />
        </g>

        {/* Static links, plus a travelling dash that reads as data in transit */}
        <g fill="none" strokeWidth="1.25">
          {LINKS.map((d) => (
            <path key={d} d={d} stroke="url(#dc-link)" />
          ))}
          <path d={LINKS[0]} stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.5" className="lg-dash" />
        </g>

        {/* The connector nodes — the dot from the logo's own D–C bridge */}
        <g fill="#ffffff">
          {NODES.map(([cx, cy], i) => (
            <g key={`${cx}-${cy}`} className="lg-node" style={{ animationDelay: `${i * 620}ms` }}>
              <circle cx={cx} cy={cy} r="15" fillOpacity="0.09" />
              <circle cx={cx} cy={cy} r="3.5" fillOpacity="0.9" />
            </g>
          ))}
        </g>

        {/* Paperwork motifs — a filing, a certificate, a form */}
        <g stroke="#ffffff" strokeOpacity="0.12" fill="#ffffff" fillOpacity="0.028" strokeWidth="1.25">
          <g transform="translate(108 116) rotate(-8)">
            <rect width="112" height="146" rx="14" />
            <path d="M22 38h68M22 64h68M22 90h44" strokeOpacity="0.18" />
          </g>
          <g transform="translate(1244 630) rotate(9)">
            <rect width="104" height="136" rx="14" />
            <path d="M20 36h64M20 60h64M20 84h40" strokeOpacity="0.18" />
          </g>
          <g transform="translate(548 760) rotate(-4)">
            <rect width="122" height="82" rx="14" />
            <path d="M22 28h50M22 52h78" strokeOpacity="0.18" />
          </g>
        </g>
      </svg>

      {/* 6 — hand off to the page background without a hard seam */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--dc-sky-soft)]" />
    </div>
  );
}

/**
 * The light-band wash.
 *
 * Clear glass takes its colour from whatever is behind it, so a glass panel on
 * flat white reads as grey plastic. This is what the panels on the pale
 * sections are actually refracting.
 */
export function BrandWash({ variant = "blue" }: { variant?: "blue" | "flame" | "dual" }) {
  return (
    <div className="dc-ambient-layer" aria-hidden="true">
      <div className="dc-kolam absolute inset-0 text-[var(--dc-blue-bright)] opacity-[0.055]" />

      {variant !== "flame" ? (
        <div className="dc-orb dc-orb-blue lg-drift -left-[12%] -top-[38%] h-[46rem] w-[46rem] opacity-70" />
      ) : null}

      {variant !== "blue" ? (
        <div className="dc-orb dc-orb-flame lg-drift-slow -bottom-[42%] -right-[10%] h-[40rem] w-[40rem] opacity-60" />
      ) : null}
    </div>
  );
}
