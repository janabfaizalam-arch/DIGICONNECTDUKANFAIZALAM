import Image from "next/image";

type HeroBackgroundProps = {
  /** Optional admin-managed atmosphere photo, already validated as https. */
  imageUrl?: string | null;
};

/**
 * The hero's atmosphere.
 *
 * Built almost entirely from a gradient and one inline SVG rather than a large
 * raster: it costs a few hundred bytes of markup, scales to any viewport
 * without a second art-directed file, and never causes layout shift.
 *
 * What it is meant to say — a connected digital service network across India —
 * is carried by three quiet layers: a depth gradient, a node-and-line mesh, and
 * an abstract radial geometry that nods at Indian design without resorting to
 * a flag or an official emblem, neither of which a private company may imply.
 */
export function HeroBackground({ imageUrl }: HeroBackgroundProps) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* 1 — layered blue sky, deepest at the top so the header reads cleanly */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(178deg, #051d47 0%, #072c69 22%, #0a4292 55%, #0b57b8 82%, #0f66d0 100%)",
        }}
      />

      {/* 2 — optional CMS photograph, kept as texture rather than subject */}
      {imageUrl ? (
        <div className="absolute inset-0 opacity-[0.22] mix-blend-luminosity">
          <Image
            src={imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
      ) : null}

      {/* 3 — two slow atmospheric glows, one warm brand orange, one sky */}
      <div
        className="dc-hero-drift absolute -left-[18%] -top-[28%] h-[72vw] max-h-[720px] w-[72vw] max-w-[720px] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,104,0,0.42) 0%, transparent 68%)" }}
      />
      <div
        className="dc-hero-drift absolute -bottom-[30%] -right-[16%] h-[74vw] max-h-[760px] w-[74vw] max-w-[760px] rounded-full opacity-45 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(56,189,248,0.45) 0%, transparent 68%)",
          animationDelay: "-11s",
        }}
      />

      {/* 4 — the connectivity mesh and the service motifs */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient id="dc-hero-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#8ec5ff" stopOpacity="0.04" />
          </linearGradient>
          <radialGradient id="dc-hero-centre" cx="50%" cy="34%" r="62%">
            <stop offset="0%" stopColor="#1f7ae0" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#04173a" stopOpacity="0" />
          </radialGradient>
          <pattern id="dc-hero-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M60 0H0v60" fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width="1440" height="900" fill="url(#dc-hero-grid)" />
        <rect width="1440" height="900" fill="url(#dc-hero-centre)" />

        {/* India-inspired geometry: abstract concentric spokes, no emblem */}
        <g stroke="#ffffff" strokeOpacity="0.09" fill="none" className="dc-hero-spin">
          <circle cx="1180" cy="200" r="150" />
          <circle cx="1180" cy="200" r="104" />
          <circle cx="1180" cy="200" r="58" />
          {Array.from({ length: 12 }, (_, index) => {
            const angle = (index * Math.PI) / 6;
            return (
              <line
                key={index}
                x1={1180 + Math.cos(angle) * 58}
                y1={200 + Math.sin(angle) * 58}
                x2={1180 + Math.cos(angle) * 150}
                y2={200 + Math.sin(angle) * 150}
              />
            );
          })}
        </g>

        {/* Connectivity lines between service nodes */}
        <g stroke="url(#dc-hero-line)" strokeWidth="1.25" fill="none">
          <path d="M96 690 L268 546 L470 620 L648 452 L868 528 L1064 372 L1330 470" />
          <path d="M60 300 L246 214 L470 300 L648 452" />
          <path d="M268 546 L246 214" />
          <path d="M868 528 L960 742 L1216 690" />
          <path d="M1064 372 L1180 200" />
        </g>

        {/* Glowing nodes on the mesh */}
        <g fill="#ffffff">
          {[
            [268, 546],
            [470, 620],
            [648, 452],
            [868, 528],
            [1064, 372],
            [246, 214],
            [960, 742],
            [1180, 200],
          ].map(([cx, cy], index) => (
            <g key={`${cx}-${cy}`} className="dc-hero-node" style={{ animationDelay: `${index * 700}ms` }}>
              <circle cx={cx} cy={cy} r="14" fillOpacity="0.1" />
              <circle cx={cx} cy={cy} r="3.5" fillOpacity="0.85" />
            </g>
          ))}
        </g>

        {/* Soft document motifs — a filing, a certificate, a form */}
        <g stroke="#ffffff" strokeOpacity="0.13" fill="#ffffff" fillOpacity="0.03" strokeWidth="1.25">
          <g transform="translate(120 120) rotate(-8)">
            <rect width="112" height="146" rx="12" />
            <path d="M22 38h68M22 64h68M22 90h44" strokeOpacity="0.18" />
          </g>
          <g transform="translate(1236 626) rotate(9)">
            <rect width="104" height="136" rx="12" />
            <path d="M20 36h64M20 60h64M20 84h40" strokeOpacity="0.18" />
          </g>
          <g transform="translate(556 758) rotate(-4)">
            <rect width="120" height="80" rx="12" />
            <path d="M22 28h50M22 50h76" strokeOpacity="0.18" />
          </g>
        </g>
      </svg>

      {/* 5 — hand the section off to the page background without a hard edge */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-[var(--dc-sky-soft)]" />
    </div>
  );
}
