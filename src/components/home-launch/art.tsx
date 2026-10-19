import type { CSSProperties } from "react";

import type { ModuleGroup, StructureId } from "@/lib/homepage/launch-catalog";

/**
 * The homepage's drawn visual language.
 *
 * One idea runs through every illustration: a business as an isometric
 * blueprint that is assembled layer by layer. The hero builds it, the builder
 * grows it as services are chosen, the service cards show one piece of it and
 * the finale shows it complete. Drawn in SVG so it is sharp at every size,
 * weighs a few kilobytes, and never contains text a reader needs.
 */

const SKY = "#8ab8ff";
const CYAN = "#5fd4ff";

export const TONES = {
  blue: { top: "#2f80ed", left: "#0f4fb3", right: "#0a3c8c", edge: "#a9cbff" },
  cyan: { top: "#46c4f0", left: "#0f86b3", right: "#0b678c", edge: "#bdeeff" },
  orange: { top: "#ff8a3d", left: "#d95a0b", right: "#a94406", edge: "#ffd1ad" },
  violet: { top: "#8b6cf0", left: "#5a3ec7", right: "#45309a", edge: "#d6c9ff" },
  ghost: { top: "rgba(138,184,255,0.06)", left: "rgba(138,184,255,0.03)", right: "rgba(138,184,255,0.02)", edge: "rgba(138,184,255,0.45)" },
  paper: { top: "#fffdf8", left: "#e9e3d5", right: "#d9d1bf", edge: "#ffffff" },
} as const;

export type Tone = keyof typeof TONES;

/** An isometric slab: top face plus the two visible sides. */
export function Prism({
  cx,
  cy,
  w,
  t,
  tone = "blue",
  className,
  style,
  dashed,
}: {
  cx: number;
  cy: number;
  w: number;
  t: number;
  tone?: Tone;
  className?: string;
  style?: CSSProperties;
  dashed?: boolean;
}) {
  const h = w * 0.5;
  const c = TONES[tone];
  const top = `M${cx} ${cy - h} L${cx + w} ${cy} L${cx} ${cy + h} L${cx - w} ${cy} Z`;
  const left = `M${cx - w} ${cy} L${cx} ${cy + h} L${cx} ${cy + h + t} L${cx - w} ${cy + t} Z`;
  const right = `M${cx} ${cy + h} L${cx + w} ${cy} L${cx + w} ${cy + t} L${cx} ${cy + h + t} Z`;
  const stroke = { stroke: c.edge, strokeWidth: 1, strokeDasharray: dashed ? "4 4" : undefined, strokeLinejoin: "round" as const };
  return (
    <g className={className} style={style}>
      <path d={left} fill={c.left} {...stroke} strokeOpacity={0.5} />
      <path d={right} fill={c.right} {...stroke} strokeOpacity={0.5} />
      <path d={top} fill={c.top} {...stroke} />
    </g>
  );
}

/** The isometric floor grid the blueprint stands on. */
export function IsoGrid({ cx, cy, size, step = 28, opacity = 0.35 }: { cx: number; cy: number; size: number; step?: number; opacity?: number }) {
  // A rhombus of half-width `size`, ruled with lines parallel to both edges.
  const n = Math.max(1, Math.round(size / step));
  const lines: string[] = [];
  for (let i = 1; i < n; i++) {
    const f = i / n;
    const x = cx - size + f * size;
    lines.push(`M${x} ${cy + (f * size) / 2} l${size} ${-size / 2}`);
    lines.push(`M${x} ${cy - (f * size) / 2} l${size} ${size / 2}`);
  }
  return (
    <g stroke={SKY} strokeOpacity={opacity} strokeWidth={0.6} fill="none">
      <path d={`M${cx - size} ${cy} L${cx} ${cy - size / 2} L${cx + size} ${cy} L${cx} ${cy + size / 2} Z`} strokeOpacity={Math.min(1, opacity * 1.6)} />
      <path d={lines.join(" ")} />
    </g>
  );
}

export type BlueprintLayer = {
  key: string;
  label: string;
  tone: Tone;
  /** Unlit layers are drawn as dashed outlines: planned, not yet built. */
  lit: boolean;
};

/**
 * The company, assembled.
 *
 * Layers stack from the foundation up; each has a leader line to a label on
 * the side. Used by the hero, the builder and the finale at different sizes.
 */
export function BlueprintStack({
  layers,
  width = 640,
  height = 560,
  cx = 300,
  base = 430,
  w = 150,
  t = 22,
  gap = 52,
  labels = true,
  idea = true,
  animate = false,
  title,
}: {
  layers: BlueprintLayer[];
  width?: number;
  height?: number;
  cx?: number;
  base?: number;
  w?: number;
  t?: number;
  gap?: number;
  labels?: boolean;
  idea?: boolean;
  animate?: boolean;
  title?: string;
}) {
  const topY = base - (layers.length - 1) * gap;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title} focusable="false">
      <defs>
        <radialGradient id="rl-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={CYAN} stopOpacity="0.9" />
          <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rl-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CYAN} stopOpacity="0" />
          <stop offset="100%" stopColor={CYAN} stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <IsoGrid cx={cx} cy={base + t + w * 0.55} size={w * 1.7} step={30} opacity={0.22} />

      {idea ? (
        <g className="rl-pulse">
          <rect x={cx - 1} y={topY - w * 0.5 - 120} width={2} height={110} fill="url(#rl-beam)" />
          <circle cx={cx} cy={topY - w * 0.5 - 128} r={26} fill="url(#rl-glow)" />
          <circle cx={cx} cy={topY - w * 0.5 - 128} r={4.5} fill="#fff" />
        </g>
      ) : null}

      {layers
        .map((layer, index) => ({ layer, index, y: base - index * gap }))
        .map(({ layer, index, y }) => (
          <Prism
            key={layer.key}
            cx={cx}
            cy={y}
            w={index === 0 ? w * 1.08 : w}
            t={index === 0 ? t * 1.4 : t}
            tone={layer.lit ? layer.tone : "ghost"}
            dashed={!layer.lit}
            className={animate ? "rl-slab" : undefined}
            style={animate ? ({ "--i": index } as CSSProperties) : undefined}
          />
        ))}

      {labels
        ? layers.map((layer, index) => {
            const y = base - index * gap + 6;
            const right = index % 2 === 0;
            const x1 = right ? cx + w + 6 : cx - w - 6;
            const x2 = right ? cx + w + 58 : cx - w - 58;
            return (
              <g key={`l-${layer.key}`} className={animate ? "rl-fadein" : undefined} style={animate ? ({ "--i": index } as CSSProperties) : undefined}>
                <path
                  d={`M${x1} ${y} L${x2} ${y}`}
                  stroke={layer.lit ? SKY : "rgba(138,184,255,0.4)"}
                  strokeWidth={1}
                  strokeDasharray={layer.lit ? undefined : "3 3"}
                  className={animate ? "rl-draw" : undefined}
                  style={animate ? ({ "--i": index, "--len": 60 } as CSSProperties) : undefined}
                />
                <circle cx={x1} cy={y} r={2.5} fill={layer.lit ? CYAN : "rgba(138,184,255,0.5)"} />
                <text
                  x={right ? x2 + 6 : x2 - 6}
                  y={y + 4}
                  textAnchor={right ? "start" : "end"}
                  fill={layer.lit ? "#e6efff" : "rgba(199,214,243,0.6)"}
                  style={{ font: "500 12px var(--rl-mono)", letterSpacing: "0.06em" }}
                >
                  {layer.label}
                </text>
              </g>
            );
          })
        : null}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Structure diagrams
   ───────────────────────────────────────────────────────────────────────── */

function Person({ x, y, r = 7, fill = SKY, dashed = false }: { x: number; y: number; r?: number; fill?: string; dashed?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y - r * 0.55} r={r * 0.62} fill={dashed ? "none" : fill} stroke={fill} strokeDasharray={dashed ? "2 2" : undefined} />
      <path
        d={`M${x - r} ${y + r * 1.1} Q${x} ${y - r * 0.05} ${x + r} ${y + r * 1.1}`}
        fill={dashed ? "none" : fill}
        stroke={fill}
        strokeDasharray={dashed ? "2 2" : undefined}
      />
    </g>
  );
}

function Entity({ x, y, s = 22, tone = "#2f80ed" }: { x: number; y: number; s?: number; tone?: string }) {
  return (
    <g>
      <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={5} fill={tone} />
      <path d={`M${x - s / 4} ${y + s / 5} V${y - s / 6} M${x} ${y + s / 5} V${y - s / 4} M${x + s / 4} ${y + s / 5} V${y - s / 6}`} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}

const LINE = { stroke: SKY, strokeWidth: 1.2, fill: "none", strokeOpacity: 0.7 };

/** A small diagram of who owns what, one per structure. */
export function StructureGlyph({ id, size = 40, title }: { id: StructureId; size?: number; title?: string }) {
  const body: Record<StructureId, React.ReactNode> = {
    pvt: (
      <>
        <Entity x={50} y={30} s={26} />
        <path d={`M50 44 V56 M24 56 H76 M24 56 V66 M50 56 V66 M76 56 V66`} {...LINE} />
        <Person x={24} y={74} />
        <Person x={50} y={74} />
        <Person x={76} y={74} />
        <path d="M50 12 l10 4 v6 c0 6 -4 9 -10 11" stroke={CYAN} strokeWidth={1.2} fill="none" opacity={0.8} />
      </>
    ),
    llp: (
      <>
        <Entity x={50} y={32} s={24} tone="#46c4f0" />
        <path d="M30 70 Q50 48 70 70" {...LINE} />
        <path d="M30 70 H70" stroke={CYAN} strokeWidth={1.6} />
        <Person x={28} y={70} />
        <Person x={72} y={70} />
      </>
    ),
    opc: (
      <>
        <Entity x={50} y={30} s={24} />
        <path d="M50 43 V60" {...LINE} />
        <Person x={50} y={70} r={8} />
        <path d="M60 72 H74" stroke={SKY} strokeDasharray="2 3" />
        <Person x={80} y={72} r={6} dashed />
      </>
    ),
    partnership: (
      <>
        <circle cx={40} cy={50} r={22} fill="rgba(47,128,237,0.25)" stroke={SKY} />
        <circle cx={60} cy={50} r={22} fill="rgba(255,138,61,0.22)" stroke="#ffb37a" />
        <Person x={36} y={50} r={6} />
        <Person x={64} y={50} r={6} fill="#ffb37a" />
        <path d="M44 82 H56" stroke={SKY} strokeDasharray="2 2" />
      </>
    ),
    proprietorship: (
      <>
        <circle cx={50} cy={50} r={28} fill="none" stroke={SKY} strokeDasharray="3 3" />
        <Person x={50} y={50} r={10} fill="#ff8a3d" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      {body[id]}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Card art
   ───────────────────────────────────────────────────────────────────────── */

const GROUP_TONE: Record<ModuleGroup, Tone> = {
  foundation: "blue",
  tax: "cyan",
  licence: "orange",
  ip: "violet",
  digital: "violet",
  finance: "cyan",
};

/**
 * A service card's header: the piece of the blueprint this service builds,
 * lit, with the rest of the structure ghosted behind it.
 */
export function ModuleArt({ group, seed = 0, structure }: { group: ModuleGroup; seed?: number; structure?: StructureId }) {
  const order: ModuleGroup[] = ["foundation", "tax", "licence", "digital", "finance"];
  const litIndex = Math.max(0, order.indexOf(group === "ip" ? "digital" : group));
  const layers: BlueprintLayer[] = order.map((g, index) => ({ key: g, label: "", tone: GROUP_TONE[g], lit: index === litIndex }));
  const offset = (seed % 3) * 24 - 24;
  return (
    <svg viewBox="0 0 360 150" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={`rl-card-glow-${seed}`} cx="70%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#2f80ed" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#2f80ed" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="360" height="150" fill={`url(#rl-card-glow-${seed})`} />
      <g opacity={0.5}>
        {Array.from({ length: 9 }).map((_, i) => (
          <path key={i} d={`M${i * 45} 0 V150`} stroke={SKY} strokeOpacity={0.08} />
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <path key={`h${i}`} d={`M0 ${i * 45 + 15} H360`} stroke={SKY} strokeOpacity={0.08} />
        ))}
      </g>
      <g transform={`translate(${offset} 0)`}>
        {layers
          .map((layer, index) => ({ layer, index }))
          .map(({ layer, index }) => (
            <Prism
              key={layer.key}
              cx={250}
              cy={118 - index * 20}
              w={index === litIndex ? 62 : 54}
              t={index === litIndex ? 12 : 8}
              tone={layer.lit ? layer.tone : "ghost"}
              dashed={!layer.lit}
            />
          ))}
      </g>
      {structure ? (
        <svg x={18} y={22} width={96} height={96} viewBox="0 0 100 100">
          <StructureGlyph id={structure} size={100} />
        </svg>
      ) : null}
    </svg>
  );
}
