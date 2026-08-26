/**
 * Section illustrations, drawn.
 *
 * Four AI-generated 3D renders used to sit in these slots — a shield, a
 * clipboard, a pile of coins, an office block. Each came on its own opaque
 * background (pale blue, cream, near-black, lilac), none of which the brand
 * contains, and each was lit from a different direction. Dropped onto a glass
 * card or a blue gradient they read as stickers pasted on: four rectangles,
 * four moods, four background colours fighting the one behind them.
 *
 * These replace them. They are transparent by construction — there is no
 * background to clash because there is none at all — they are painted from the
 * logo's own two ramps, they stay sharp at any size, and all four together
 * weigh less than one of the webp files they replace.
 *
 * Every one is built from the same three parts as the rest of the page: the
 * jaali lattice, a mandala ring, and the connector nodes from the mark. Only
 * the subject at the centre changes.
 */

type Tone = "onLight" | "onDark";

/** Ink and wash for the two surfaces these are dropped onto. */
function palette(tone: Tone) {
  return tone === "onDark"
    ? { ink: "#ffffff", inkSoft: "rgba(255,255,255,0.55)", hair: "rgba(255,255,255,0.22)", accent: "#fe8602" }
    : { ink: "#0159c7", inkSoft: "rgba(1,89,199,0.45)", hair: "rgba(1,89,199,0.2)", accent: "#f74a01" };
}

/** The shared stage: mandala rings, jaali hint, connector nodes. */
function Stage({ tone, id }: { tone: Tone; id: string }) {
  const c = palette(tone);
  return (
    <>
      <defs>
        <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={tone === "onDark" ? "#4d9bff" : "#0f6de0"} />
          <stop offset="100%" stopColor={tone === "onDark" ? "#0159c7" : "#001d5f"} />
        </linearGradient>
        <linearGradient id={`${id}-flame`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#ffa02c" />
          <stop offset="100%" stopColor="#f74a01" />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c.accent} stopOpacity="0.16" />
          <stop offset="100%" stopColor={c.accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="140" cy="140" r="132" fill={`url(#${id}-halo)`} />

      <g fill="none" stroke={c.hair} strokeWidth="1.2">
        <circle cx="140" cy="140" r="118" />
        <circle cx="140" cy="140" r="96" strokeDasharray="4 7" />
        <rect x="72" y="72" width="136" height="136" rx="18" transform="rotate(45 140 140)" />
      </g>

      <g fill={c.inkSoft}>
        <circle cx="30" cy="86" r="4" />
        <circle cx="252" cy="196" r="3.2" />
        <circle cx="214" cy="42" r="2.6" />
      </g>
      <path
        d="M30 86 L140 140 L252 196"
        fill="none"
        stroke={c.hair}
        strokeWidth="1.2"
        strokeDasharray="3 6"
      />
    </>
  );
}

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 280 280"
      className={className ?? "h-full w-full"}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Secure handling — a shield with the tick, over a document. */
export function TrustIllustration({ tone = "onLight", className }: { tone?: Tone; className?: string }) {
  const c = palette(tone);
  return (
    <Frame className={className}>
      <Stage tone={tone} id="trust" />

      {/* the document behind */}
      <g transform="translate(96 74) rotate(-7)">
        <rect width="96" height="124" rx="12" fill={c.ink} fillOpacity={tone === "onDark" ? 0.14 : 0.07} />
        <g stroke={c.ink} strokeOpacity="0.32" strokeWidth="3" strokeLinecap="round">
          <path d="M20 32h56M20 52h56M20 72h34" />
        </g>
      </g>

      {/* the shield */}
      <g transform="translate(140 152)">
        <path
          d="M0 -62 L52 -40 V4 C52 38 28 60 0 70 C-28 60 -52 38 -52 4 V-40 Z"
          fill="url(#trust-blue)"
        />
        <path
          d="M0 -62 L52 -40 V4 C52 38 28 60 0 70 C-28 60 -52 38 -52 4 V-40 Z"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <path
          d="M-22 2 L-7 18 L24 -18"
          fill="none"
          stroke="#ffffff"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* the padlock, in the flame ramp — the one warm note */}
      <g transform="translate(206 178)">
        <rect x="-22" y="-8" width="44" height="38" rx="9" fill="url(#trust-flame)" />
        <path d="M-11 -8 v-10 a11 11 0 0 1 22 0 v10" fill="none" stroke="url(#trust-flame)" strokeWidth="6" />
        <circle cx="0" cy="10" r="4.5" fill="#ffffff" fillOpacity="0.9" />
      </g>
    </Frame>
  );
}

/** Application tracking — a checklist with a progress path and a pin. */
export function TrackingIllustration({ tone = "onDark", className }: { tone?: Tone; className?: string }) {
  const c = palette(tone);
  return (
    <Frame className={className}>
      <Stage tone={tone} id="track" />

      {/* the clipboard */}
      <g transform="translate(70 62)">
        <rect width="120" height="156" rx="16" fill={c.ink} fillOpacity={tone === "onDark" ? 0.16 : 0.08} />
        <rect
          width="120"
          height="156"
          rx="16"
          fill="none"
          stroke={c.ink}
          strokeOpacity="0.28"
          strokeWidth="1.5"
        />
        <rect x="38" y="-9" width="44" height="20" rx="7" fill="url(#track-blue)" />

        {[36, 70, 104].map((y, i) => (
          <g key={y} transform={`translate(22 ${y})`}>
            <rect width="18" height="18" rx="6" fill={i < 2 ? "url(#track-blue)" : "none"} stroke={c.ink} strokeOpacity={i < 2 ? 0 : 0.3} strokeWidth="1.5" />
            {i < 2 ? (
              <path d="M4.5 9 L8 12.5 L13.5 5.5" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
            <rect x="28" y="5" width="46" height="7" rx="3.5" fill={c.ink} fillOpacity="0.28" />
          </g>
        ))}
      </g>

      {/* the route, ending in a flame pin */}
      <path
        d="M196 210 C210 176 176 158 196 128 C214 100 190 84 204 62"
        fill="none"
        stroke={c.ink}
        strokeOpacity="0.32"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 10"
      />
      <g fill={c.ink} fillOpacity="0.4">
        <circle cx="196" cy="210" r="5" />
        <circle cx="196" cy="128" r="5" />
      </g>
      <g transform="translate(204 44)">
        <path d="M0 30 C-14 12 -20 4 -20 -6 A20 20 0 0 1 20 -6 C20 4 14 12 0 30Z" fill="url(#track-flame)" />
        <circle cx="0" cy="-6" r="7" fill="#ffffff" fillOpacity="0.92" />
      </g>
    </Frame>
  );
}

/** Wallet rewards — a wallet with coins rising out of it. */
export function RewardsIllustration({ tone = "onDark", className }: { tone?: Tone; className?: string }) {
  const c = palette(tone);
  return (
    <Frame className={className}>
      <Stage tone={tone} id="reward" />

      {/* rising coins, the flame ramp */}
      {[
        { x: 96, y: 92, r: 20 },
        { x: 148, y: 66, r: 26 },
        { x: 196, y: 100, r: 17 },
      ].map((coin) => (
        <g key={`${coin.x}-${coin.y}`} transform={`translate(${coin.x} ${coin.y})`}>
          <ellipse rx={coin.r} ry={coin.r * 0.82} fill="url(#reward-flame)" />
          <ellipse rx={coin.r * 0.62} ry={coin.r * 0.5} fill="#ffffff" fillOpacity="0.24" />
          <path
            d={`M${-coin.r * 0.24} ${coin.r * 0.3} v${-coin.r * 0.6} h${coin.r * 0.48}`}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.85"
            strokeWidth={coin.r * 0.16}
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* the wallet */}
      <g transform="translate(66 138)">
        <rect width="148" height="98" rx="20" fill="url(#reward-blue)" />
        <rect width="148" height="98" rx="20" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.5" />
        <path d="M0 32 h148" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1.5" />
        <g transform="translate(104 56)">
          <rect x="-26" y="-14" width="52" height="28" rx="10" fill="#ffffff" fillOpacity="0.16" />
          <circle cx="0" cy="0" r="7" fill="#ffffff" fillOpacity="0.85" />
        </g>
      </g>

      <g fill={c.ink} fillOpacity="0.35">
        <circle cx="58" cy="118" r="3" />
        <circle cx="228" cy="150" r="2.4" />
      </g>
    </Frame>
  );
}

/** Digi Partner — a counter with the DigiConnect mark above it. */
export function PartnerIllustration({ tone = "onDark", className }: { tone?: Tone; className?: string }) {
  const c = palette(tone);
  return (
    <Frame className={className}>
      <Stage tone={tone} id="partner" />

      {/* the awning */}
      <g transform="translate(62 70)">
        <path d="M0 30 L14 0 h128 l14 30 Z" fill="url(#partner-flame)" />
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M${20 + i * 29} 30 v-30`}
            stroke="#ffffff"
            strokeOpacity="0.28"
            strokeWidth="1.5"
          />
        ))}
      </g>

      {/* the counter */}
      <g transform="translate(62 100)">
        <rect width="156" height="112" rx="16" fill="url(#partner-blue)" />
        <rect width="156" height="112" rx="16" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.5" />

        {/* service window */}
        <rect x="22" y="24" width="60" height="46" rx="9" fill="#ffffff" fillOpacity="0.15" />
        <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round">
          <path d="M34 40h36M34 52h24" />
        </g>

        {/* the counter person, abstracted */}
        <g transform="translate(118 44)" fill="#ffffff" fillOpacity="0.8">
          <circle cx="0" cy="-8" r="11" />
          <path d="M-18 26 a18 18 0 0 1 36 0 Z" />
        </g>
      </g>

      {/* the mark's own connector, floating above the counter */}
      <g transform="translate(140 44)">
        <circle cx="-26" cy="0" r="7" fill="url(#partner-blue)" />
        <circle cx="26" cy="0" r="7" fill="url(#partner-flame)" />
        <path d="M-26 0 h52" stroke={c.ink} strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </Frame>
  );
}
