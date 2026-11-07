import type { ReactNode } from "react";

import type { CapabilityId } from "@/lib/portfolio/content";

/**
 * One small illustration per capability, drawn in markup so each has its own
 * character instead of a row of stock icons. Decorative.
 */

const INK = "#0b1d3a";
const BLUE = "var(--dc-blue-bright)";
const FLAME = "var(--dc-flame)";

function Panel({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden="true" className="relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-br from-white to-[var(--dc-blue-soft)] ring-1 ring-slate-900/5">
      {children}
    </div>
  );
}

export function CapabilityVisual({ id }: { id: CapabilityId }) {
  switch (id) {
    case "websites":
      return (
        <Panel>
          <div className="absolute inset-x-[10%] top-[14%] bottom-[-6%] rounded-t-xl bg-white shadow-[0_20px_40px_-20px_rgba(1,29,95,0.4)] ring-1 ring-slate-900/10">
            <div className="flex gap-1 border-b border-slate-100 px-3 py-2">
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <span key={c} className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <div className="grid grid-cols-[1.2fr_1fr] gap-3 p-4">
              <div className="space-y-2">
                <div className="h-3 w-[90%] rounded bg-[var(--dc-ink)]" />
                <div className="h-3 w-[70%] rounded bg-[var(--dc-ink)]" />
                <div className="h-1.5 w-[80%] rounded bg-slate-200" />
                <div className="mt-3 h-4 w-16 rounded-full" style={{ background: BLUE }} />
              </div>
              <div className="rounded-lg bg-gradient-to-br from-[var(--dc-blue-soft)] to-[#c9dcff]" />
            </div>
          </div>
        </Panel>
      );
    case "ecommerce":
      return (
        <Panel>
          <div className="absolute inset-0 grid grid-cols-3 gap-3 p-[10%]">
            {[BLUE, FLAME, INK].map((color, i) => (
              <div key={i} className="flex flex-col rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-900/5">
                <div className="flex-1 rounded-lg" style={{ background: `linear-gradient(160deg, white, ${color})`, opacity: 0.85 }} />
                <div className="mt-2 h-1.5 w-[70%] rounded bg-slate-300" />
                <div className="mt-1 h-1.5 w-[40%] rounded" style={{ background: color }} />
              </div>
            ))}
          </div>
          <div className="absolute bottom-[8%] right-[8%] flex items-center gap-2 rounded-full bg-[var(--dc-ink)] px-3 py-1.5 text-[10px] font-bold text-white shadow-lg">
            <span className="h-1.5 w-1.5 rounded-full bg-[#28c840]" /> UPI · Paid
          </div>
        </Panel>
      );
    case "software":
      return (
        <Panel>
          <div className="absolute inset-[10%] grid grid-cols-[22%_1fr] overflow-hidden rounded-xl bg-white shadow-[0_20px_40px_-24px_rgba(1,29,95,0.5)] ring-1 ring-slate-900/10">
            <div className="space-y-1.5 bg-[var(--dc-ink)] p-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={i === 0 ? "h-2 rounded bg-white/70" : "h-2 rounded bg-white/20"} />
              ))}
            </div>
            <div className="space-y-2 p-3">
              <div className="grid grid-cols-3 gap-1.5">
                {[BLUE, "#16b47e", FLAME].map((c) => (
                  <div key={c} className="rounded-md bg-slate-50 p-1.5">
                    <div className="h-1 w-[60%] rounded bg-slate-300" />
                    <div className="mt-1 h-2 w-[80%] rounded" style={{ background: c }} />
                  </div>
                ))}
              </div>
              <div className="flex h-[46%] items-end gap-1">
                {[40, 64, 52, 80, 70, 92, 60].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 5 ? BLUE : "#cfdcf7" }} />
                ))}
              </div>
            </div>
          </div>
        </Panel>
      );
    case "design":
      return (
        <Panel>
          <div className="absolute inset-[10%] grid grid-cols-6 grid-rows-4 gap-1.5">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="rounded-[3px] border border-dashed border-[var(--dc-blue-bright)]/25" />
            ))}
          </div>
          <div className="absolute left-[18%] top-[22%] h-[30%] w-[44%] rounded-lg border-2 border-[var(--dc-blue-bright)] bg-white/80">
            <span className="absolute -left-1 -top-1 h-2 w-2 rounded-sm bg-white ring-2 ring-[var(--dc-blue-bright)]" />
            <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-sm bg-white ring-2 ring-[var(--dc-blue-bright)]" />
          </div>
          <svg viewBox="0 0 24 24" className="absolute left-[58%] top-[48%] h-7 w-7 drop-shadow" aria-hidden="true">
            <path d="M3 2 L20 11 L12 13 L9 21 Z" fill={INK} stroke="white" strokeWidth="1.5" />
          </svg>
        </Panel>
      );
    case "branding":
      return (
        <Panel>
          <div className="absolute inset-[10%] grid grid-cols-[1.1fr_1fr] gap-3">
            <div className="flex flex-col justify-between rounded-xl bg-[var(--dc-ink)] p-3 text-white">
              <span className="font-[family-name:var(--font-display)] text-4xl italic leading-none">Aa</span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">Display · Italic</span>
            </div>
            <div className="grid grid-rows-4 gap-1.5">
              {["var(--dc-blue-bright)", "var(--dc-brand-navy)", "var(--dc-flame)", "var(--dc-amber)"].map((c) => (
                <div key={c} className="rounded-md" style={{ background: c }} />
              ))}
            </div>
          </div>
        </Panel>
      );
    case "marketing":
      return (
        <Panel>
          <div className="absolute inset-x-[10%] top-[14%] flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-900/10">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-slate-400" />
            <span className="h-1.5 w-[55%] rounded bg-slate-300" />
          </div>
          <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="absolute inset-x-[10%] bottom-[12%] h-[48%] w-[80%]" aria-hidden="true">
            <defs>
              <linearGradient id="mk-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#0159c7" stopOpacity="0.28" />
                <stop offset="1" stopColor="#0159c7" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 44 L16 38 L30 40 L46 28 L60 30 L76 16 L100 6 L100 50 L0 50 Z" fill="url(#mk-fill)" />
            <polyline points="0,44 16,38 30,40 46,28 60,30 76,16 100,6" fill="none" stroke="#0159c7" strokeWidth="1.6" />
            <circle cx="100" cy="6" r="2.4" fill="#f74a01" />
          </svg>
        </Panel>
      );
    case "automation":
    default:
      return (
        <Panel>
          <svg viewBox="0 0 120 80" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <g fill="none" stroke="#0159c7" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="3 3">
              <path d="M28 40 C 48 40, 48 18, 66 18" />
              <path d="M28 40 C 48 40, 48 62, 66 62" />
              <path d="M74 18 C 90 18, 90 40, 98 40" />
              <path d="M74 62 C 90 62, 90 40, 98 40" />
            </g>
            {[
              [22, 40, "#0b1d3a"],
              [70, 18, "#0159c7"],
              [70, 62, "#16b47e"],
              [102, 40, "#f74a01"],
            ].map(([cx, cy, fill]) => (
              <g key={`${cx}-${cy}`}>
                <rect x={Number(cx) - 8} y={Number(cy) - 8} width="16" height="16" rx="4" fill="white" stroke="#0b1d3a" strokeOpacity="0.1" />
                <circle cx={cx} cy={cy} r="3.5" fill={String(fill)} />
              </g>
            ))}
          </svg>
        </Panel>
      );
  }
}
