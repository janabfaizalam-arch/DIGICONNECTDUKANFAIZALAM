import type { CSSProperties, ReactNode } from "react";

import type { MockLayout, Project } from "@/lib/portfolio/content";

/**
 * A concept website, drawn in HTML and CSS.
 *
 * No screenshots and no stock photography: every mockup is real markup sized
 * in container units (cqw), so it stays sharp at any size, weighs almost
 * nothing and never shifts layout while an image loads. The art blocks are
 * gradients and simple shapes, standing in for the photography a real client
 * site would carry.
 *
 * Decorative: the figure around it carries the accessible description, so
 * everything inside is hidden from assistive technology.
 */

const u = (n: number) => `${n}cqw`;

type Theme = Project["mock"]["theme"];
type Mock = Project["mock"];

function headFont(theme: Theme): CSSProperties {
  return theme.serif
    ? { fontFamily: "var(--font-display), Georgia, serif", fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.01em" }
    : { fontFamily: "var(--font-heading), system-ui, sans-serif", fontWeight: 700, letterSpacing: "-0.03em" };
}

const body: CSSProperties = { fontFamily: "var(--font-body), system-ui, sans-serif" };

/* ───────────────────────── Art ───────────────────────── */

/** An abstract "photograph" for each kind of business. */
function Art({ layout, theme, style, variant = 0 }: { layout: MockLayout; theme: Theme; style?: CSSProperties; variant?: number }) {
  const base: CSSProperties = { position: "relative", overflow: "hidden", borderRadius: u(1.2), ...style };
  const glow = `radial-gradient(120% 90% at ${20 + variant * 25}% 10%, ${theme.tint} 0%, transparent 60%)`;

  if (layout === "resort") {
    return (
      <div style={{ ...base, background: `linear-gradient(180deg, ${theme.accent2}55 0%, #f4d9b0 38%, ${theme.accent}cc 62%, ${theme.ink} 100%)` }}>
        <div style={{ position: "absolute", left: "62%", top: "24%", width: u(6), height: u(6), borderRadius: "50%", background: "#fff7e0", boxShadow: `0 0 ${u(5)} #fff2c4` }} />
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ position: "absolute", bottom: "34%", width: "100%", height: "22%" }}>
          <path d="M0 40 L18 12 L30 26 L46 6 L64 28 L78 14 L100 34 L100 40 Z" fill={theme.ink} opacity="0.55" />
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", background: `linear-gradient(180deg, ${theme.accent}aa, ${theme.ink})` }} />
        <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "20%", height: "1px", background: "#ffffff55" }} />
      </div>
    );
  }
  if (layout === "property") {
    return (
      <div style={{ ...base, background: `linear-gradient(180deg, #dbe7f0 0%, ${theme.tint} 70%, ${theme.accent}55 100%)` }}>
        {[14, 36, 58].map((left, i) => (
          <div
            key={left}
            style={{
              position: "absolute",
              left: `${left}%`,
              bottom: "12%",
              width: "22%",
              height: `${52 + i * 12}%`,
              background: `linear-gradient(180deg, #ffffff, ${theme.tint})`,
              border: `1px solid ${theme.ink}22`,
              backgroundImage: `repeating-linear-gradient(0deg, transparent 0 ${u(1.6)}, ${theme.ink}18 ${u(1.6)} ${u(1.8)}), repeating-linear-gradient(90deg, transparent 0 ${u(1.6)}, ${theme.ink}12 ${u(1.6)} ${u(1.8)})`,
            }}
          />
        ))}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "14%", background: theme.accent, opacity: 0.75 }} />
      </div>
    );
  }
  if (layout === "store") {
    const jars = variant === -1 ? [theme.accent, theme.accent2, "#7c2d12"] : [[theme.accent, theme.accent2, "#7c2d12", "#a16207"][variant % 4]];
    return (
      <div style={{ ...base, background: `${glow}, linear-gradient(140deg, ${theme.tint}, ${theme.accent2}40)`, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "6%", paddingBottom: "10%" }}>
        {jars.map((color, i) => (
          <div key={i} style={{ position: "relative", width: jars.length > 1 ? "20%" : "34%", height: jars.length > 1 ? `${[62, 74, 56][i]}%` : "70%" }}>
            <div style={{ position: "absolute", left: "8%", right: "8%", top: 0, height: "16%", borderRadius: `${u(0.6)} ${u(0.6)} ${u(0.2)} ${u(0.2)}`, background: theme.ink }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: "13%", bottom: 0, borderRadius: u(0.9), background: `linear-gradient(90deg, ${color}, ${color}cc 55%, ${color})`, boxShadow: `0 ${u(0.8)} ${u(1.6)} ${theme.ink}30` }} />
            <div style={{ position: "absolute", left: "12%", right: "12%", top: "40%", height: "34%", borderRadius: u(0.4), background: theme.paper, display: "grid", placeItems: "center" }}>
              <div style={{ width: "60%", height: "14%", borderRadius: 9, background: `${theme.ink}55` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (layout === "editorial") {
    const tones = [theme.accent, theme.accent2, theme.ink];
    const a = tones[variant % 3];
    const b = tones[(variant + 1) % 3];
    return (
      <div style={{ ...base, background: `linear-gradient(160deg, ${theme.tint} 0%, ${theme.paper} 100%)` }}>
        <div
          style={{
            position: "absolute",
            left: "34%",
            top: "-10%",
            width: "36%",
            height: "130%",
            transform: "rotate(8deg)",
            background: `repeating-linear-gradient(90deg, ${a} 0 ${u(0.9)}, ${a}d9 ${u(0.9)} ${u(1.3)}, ${b} ${u(1.3)} ${u(1.5)}), ${a}`,
            boxShadow: `${u(-1.2)} 0 ${u(2.4)} ${theme.ink}30`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "52%",
            top: "-10%",
            width: "22%",
            height: "130%",
            transform: "rotate(-6deg)",
            background: `repeating-linear-gradient(0deg, ${b} 0 ${u(0.5)}, ${b}cc ${u(0.5)} ${u(1)}), ${b}`,
            opacity: 0.92,
          }}
        />
        <div style={{ position: "absolute", left: "34%", right: "26%", bottom: "8%", height: u(0.5), background: theme.accent2, opacity: 0.8 }} />
      </div>
    );
  }
  if (layout === "clinic") {
    return (
      <div style={{ ...base, background: `${glow}, linear-gradient(150deg, ${theme.tint}, #ffffff)` }}>
        <div style={{ position: "absolute", right: "10%", top: "18%", width: "34%", aspectRatio: "1", borderRadius: u(1.6), background: theme.accent, opacity: 0.9 }} />
        <div style={{ position: "absolute", right: "21%", top: "26%", width: "12%", height: "36%", borderRadius: u(0.5), background: "#fff" }} />
        <div style={{ position: "absolute", right: "14%", top: "38%", width: "26%", height: "13%", borderRadius: u(0.5), background: "#fff" }} />
      </div>
    );
  }
  if (layout === "academy") {
    return (
      <div style={{ ...base, background: `linear-gradient(140deg, ${theme.accent}, ${theme.ink})` }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: "absolute", left: `${12 + i * 8}%`, bottom: `${14 + i * 6}%`, width: "56%", height: "12%", borderRadius: u(0.6), background: [theme.accent2, "#ffffff", theme.tint][i], transform: `rotate(${-4 + i * 3}deg)` }} />
        ))}
        <div style={{ position: "absolute", right: "10%", top: "14%", width: "22%", aspectRatio: "1", borderRadius: "50%", border: `${u(0.6)} solid ${theme.accent2}` }} />
      </div>
    );
  }
  if (layout === "corporate") {
    return (
      <div style={{ ...base, background: `linear-gradient(150deg, ${theme.accent} 0%, ${theme.ink} 100%)` }}>
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <polyline points="0,48 18,40 32,44 48,30 64,34 80,18 100,10" fill="none" stroke={theme.accent2} strokeWidth="1.2" />
          <polyline points="0,56 20,50 40,52 60,42 80,38 100,30" fill="none" stroke="#ffffff55" strokeWidth="0.8" />
        </svg>
      </div>
    );
  }
  return <div style={{ ...base, background: `${glow}, ${theme.tint}` }} />;
}

/* ───────────────────────── Pieces ───────────────────────── */

function Nav({ mock, compact = false }: { mock: Mock; compact?: boolean }) {
  const t = mock.theme;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: compact ? `${u(4)} ${u(6)}` : `${u(1.6)} ${u(3)}`, borderBottom: `1px solid ${t.ink}12` }}>
      <span style={{ ...headFont(t), fontSize: compact ? u(5.2) : u(1.9), color: t.ink }}>{mock.brand}</span>
      {compact ? (
        <span style={{ display: "grid", gap: u(1.2) }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ display: "block", width: u(6), height: u(0.7), borderRadius: 9, background: t.ink }} />
          ))}
        </span>
      ) : (
        <span style={{ display: "flex", alignItems: "center", gap: u(2.4), ...body, fontSize: u(1.1), color: `${t.ink}bb` }}>
          {mock.nav.map((item) => (
            <span key={item}>{item}</span>
          ))}
          <span style={{ background: t.accent, color: "#fff", padding: `${u(0.7)} ${u(1.4)}`, borderRadius: 999, fontWeight: 600 }}>{mock.cta}</span>
        </span>
      )}
    </div>
  );
}

function Button({ theme, children, size = 1.2 }: { theme: Theme; children: ReactNode; size?: number }) {
  return (
    <span style={{ display: "inline-block", background: theme.accent, color: "#fff", padding: `${u(size * 0.75)} ${u(size * 1.5)}`, borderRadius: 999, fontSize: u(size), fontWeight: 600, ...body }}>
      {children}
    </span>
  );
}

function Lines({ theme, widths, h = 0.8, gap = 0.9 }: { theme: Theme; widths: number[]; h?: number; gap?: number }) {
  return (
    <span style={{ display: "grid", gap: u(gap) }}>
      {widths.map((w, i) => (
        <span key={i} style={{ display: "block", width: `${w}%`, height: u(h), borderRadius: 9, background: `${theme.ink}18` }} />
      ))}
    </span>
  );
}

/** The rest of the page: a footer that takes whatever height is left. */
function FooterBand({ mock }: { mock: Mock }) {
  const t = mock.theme;
  return (
    <div style={{ flex: 1, minHeight: u(4), marginTop: "auto", background: t.ink, color: "#ffffffcc", padding: `${u(2.4)} ${u(3.4)}`, display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: u(2), alignContent: "start" }}>
      <div>
        <div style={{ ...headFont(t), fontSize: u(1.8), color: "#fff" }}>{mock.brand}</div>
        <div style={{ ...body, fontSize: u(0.95), marginTop: u(0.6), opacity: 0.7 }}>{mock.sub}</div>
      </div>
      {[0, 1, 2].map((col) => (
        <div key={col} style={{ display: "grid", gap: u(0.7), alignContent: "start" }}>
          {mock.nav.slice(col, col + 3).map((item) => (
            <span key={item} style={{ ...body, fontSize: u(0.95), opacity: 0.75 }}>
              {item}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Desktop layouts ───────────────────────── */

function Dashboard({ mock }: { mock: Mock }) {
  const t = mock.theme;
  const bars = [42, 58, 36, 70, 64, 82, 54, 90, 76, 68, 94, 80];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `${u(17)} 1fr`, height: "100%", background: t.paper }}>
      <div style={{ background: t.ink, color: "#fff", padding: `${u(2.2)} ${u(1.8)}`, display: "grid", alignContent: "start", gap: u(0.6) }}>
        <span style={{ ...headFont(t), fontSize: u(1.8), marginBottom: u(1.6) }}>{mock.brand}</span>
        {mock.nav.map((item, i) => (
          <span key={item} style={{ ...body, fontSize: u(1.05), padding: `${u(0.7)} ${u(1)}`, borderRadius: u(0.6), background: i === 0 ? "#ffffff1f" : "transparent", color: i === 0 ? "#fff" : "#ffffffaa" }}>
            {item}
          </span>
        ))}
      </div>
      <div style={{ padding: `${u(2.2)} ${u(2.6)}`, display: "grid", gap: u(1.6), alignContent: "start" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ ...headFont(t), fontSize: u(2.1), color: t.ink }}>{mock.headline}</div>
            <div style={{ ...body, fontSize: u(1.05), color: `${t.ink}88`, marginTop: u(0.4) }}>{mock.sub}</div>
          </div>
          <Button theme={t} size={1.05}>+ {mock.cta}</Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: u(1.2) }}>
          {mock.items.map((item, i) => (
            <div key={item.title} style={{ background: "#fff", borderRadius: u(1), padding: u(1.4), border: `1px solid ${t.ink}10`, boxShadow: `0 ${u(0.3)} ${u(1)} ${t.ink}0d` }}>
              <div style={{ ...body, fontSize: u(0.95), color: `${t.ink}88` }}>{item.title}</div>
              <div style={{ ...headFont(t), fontSize: u(1.9), color: t.ink, marginTop: u(0.4) }}>{item.meta}</div>
              <div style={{ marginTop: u(0.8), height: u(0.5), borderRadius: 9, background: `${[t.accent, t.accent2, "#f59e0b"][i]}33` }}>
                <div style={{ width: `${[68, 84, 42][i]}%`, height: "100%", borderRadius: 9, background: [t.accent, t.accent2, "#f59e0b"][i] }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: u(1.2) }}>
          <div style={{ background: "#fff", borderRadius: u(1), padding: u(1.4), border: `1px solid ${t.ink}10` }}>
            <div style={{ ...body, fontSize: u(1), color: t.ink, fontWeight: 600, marginBottom: u(1) }}>Collections</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: u(0.7), height: u(11) }}>
              {bars.map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: `${u(0.4)} ${u(0.4)} 0 0`, background: i === bars.length - 2 ? t.accent : `${t.accent}40` }} />
              ))}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: u(1), padding: u(1.4), border: `1px solid ${t.ink}10`, display: "grid", gap: u(0.9), alignContent: "start" }}>
            <div style={{ ...body, fontSize: u(1), color: t.ink, fontWeight: 600 }}>Due today</div>
            {["INV-1042", "INV-1047", "INV-1051"].map((inv, i) => (
              <div key={inv} style={{ display: "flex", justifyContent: "space-between", ...body, fontSize: u(0.95), color: `${t.ink}aa` }}>
                <span>{inv}</span>
                <span style={{ color: i === 0 ? "#dc2626" : t.accent2, fontWeight: 600 }}>{i === 0 ? "Overdue" : "Today"}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: u(1), border: `1px solid ${t.ink}10`, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", padding: `${u(0.9)} ${u(1.4)}`, background: t.tint, ...body, fontSize: u(0.9), fontWeight: 600, color: `${t.ink}aa` }}>
            <span>Invoice</span>
            <span>Customer</span>
            <span>Amount</span>
            <span>Status</span>
          </div>
          {[
            ["INV-1052", "Gupta Hardware", "₹38,400", "Paid"],
            ["INV-1053", "Sai Electricals", "₹12,960", "Sent"],
            ["INV-1054", "Om Textiles", "₹71,250", "Paid"],
            ["INV-1055", "Patel & Sons", "₹9,840", "Draft"],
          ].map((row) => (
            <div key={row[0]} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", padding: `${u(0.85)} ${u(1.4)}`, borderTop: `1px solid ${t.ink}0d`, ...body, fontSize: u(0.95), color: t.ink }}>
              <span style={{ color: `${t.ink}99` }}>{row[0]}</span>
              <span>{row[1]}</span>
              <span>{row[2]}</span>
              <span style={{ color: row[3] === "Paid" ? t.accent2 : row[3] === "Draft" ? `${t.ink}77` : t.accent, fontWeight: 600 }}>{row[3]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroSplit({ mock, art }: { mock: Mock; art: ReactNode }) {
  const t = mock.theme;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: u(3), padding: `${u(3.4)} ${u(3.4)} ${u(2.4)}`, alignItems: "center" }}>
      <div>
        <div style={{ ...headFont(t), fontSize: u(4), lineHeight: 1.05, color: t.ink }}>{mock.headline}</div>
        <div style={{ ...body, fontSize: u(1.25), lineHeight: 1.5, color: `${t.ink}99`, margin: `${u(1.4)} 0 ${u(2)}` }}>{mock.sub}</div>
        <Button theme={t}>{mock.cta}</Button>
      </div>
      {art}
    </div>
  );
}

function Cards({ mock, layout, columns = 3, artHeight = 9 }: { mock: Mock; layout: MockLayout; columns?: number; artHeight?: number }) {
  const t = mock.theme;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: u(1.4), padding: `0 ${u(3.4)} ${u(3)}` }}>
      {mock.items.slice(0, columns).map((item, i) => (
        <div key={item.title} style={{ background: "#ffffffcc", borderRadius: u(1.2), padding: u(1), border: `1px solid ${t.ink}10` }}>
          <Art layout={layout} theme={t} variant={i} style={{ height: u(artHeight) }} />
          <div style={{ ...body, fontSize: u(1.1), fontWeight: 600, color: t.ink, marginTop: u(0.9) }}>{item.title}</div>
          <div style={{ ...body, fontSize: u(0.95), color: `${t.ink}88`, marginTop: u(0.2) }}>{item.meta}</div>
        </div>
      ))}
    </div>
  );
}

function DesktopBody({ project }: { project: Project }) {
  const mock = project.mock;
  const t = mock.theme;
  switch (mock.layout) {
    case "dashboard":
      return <Dashboard mock={mock} />;
    case "store":
      return (
        <>
          <Nav mock={mock} />
          <HeroSplit mock={mock} art={<Art layout="store" theme={t} variant={-1} style={{ height: u(21) }} />} />
          <Cards mock={mock} layout="store" columns={4} artHeight={7} />
        </>
      );
    case "editorial":
      return (
        <>
          <Nav mock={mock} />
          <div style={{ position: "relative", margin: `${u(2)} ${u(3)} 0` }}>
            <Art layout="editorial" theme={t} style={{ height: u(24) }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: u(1.2), background: `linear-gradient(90deg, ${t.paper}f2 0%, ${t.paper}cc 38%, transparent 62%)` }} />
            <div style={{ position: "absolute", left: u(3), bottom: u(2.6), maxWidth: "52%" }}>
              <div style={{ ...body, fontSize: u(1), letterSpacing: "0.2em", textTransform: "uppercase", color: t.ink }}>{mock.sub}</div>
              <div style={{ ...headFont(t), fontSize: u(4.2), lineHeight: 1, color: t.ink, marginTop: u(0.8) }}>{mock.headline}</div>
            </div>
          </div>
          <Cards mock={mock} layout="editorial" artHeight={10} />
        </>
      );
    case "resort":
      return (
        <>
          <div style={{ position: "relative" }}>
            <Art layout="resort" theme={t} style={{ height: u(30), borderRadius: 0 }} />
            <div style={{ position: "absolute", inset: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: `${u(1.6)} ${u(3)}`, color: "#fff" }}>
                <span style={{ ...headFont(t), fontSize: u(1.9) }}>{mock.brand}</span>
                <span style={{ display: "flex", gap: u(2.4), ...body, fontSize: u(1.1) }}>
                  {mock.nav.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </span>
              </div>
              <div style={{ textAlign: "center", color: "#fff", marginTop: u(5) }}>
                <div style={{ ...headFont(t), fontSize: u(4.6), lineHeight: 1 }}>{mock.headline}</div>
                <div style={{ ...body, fontSize: u(1.2), opacity: 0.85, marginTop: u(1) }}>{mock.sub}</div>
              </div>
            </div>
            <div style={{ position: "absolute", left: "50%", bottom: u(-2.6), transform: "translateX(-50%)", display: "flex", gap: u(1.6), alignItems: "center", background: "#fff", borderRadius: 999, padding: `${u(0.9)} ${u(0.9)} ${u(0.9)} ${u(2.4)}`, boxShadow: `0 ${u(0.8)} ${u(2.4)} ${t.ink}26`, ...body, fontSize: u(1), color: t.ink }}>
              <span>Check-in · 12 Dec</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span>Check-out · 14 Dec</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span>2 guests</span>
              <Button theme={t} size={1}>{mock.cta}</Button>
            </div>
          </div>
          <div style={{ height: u(4.4) }} />
          <Cards mock={mock} layout="resort" artHeight={7.5} />
        </>
      );
    case "clinic":
      return (
        <>
          <Nav mock={mock} />
          <HeroSplit
            mock={mock}
            art={
              <div style={{ background: "#fff", borderRadius: u(1.4), padding: u(2), boxShadow: `0 ${u(1)} ${u(3)} ${t.ink}14`, display: "grid", gap: u(1.1) }}>
                <div style={{ ...body, fontSize: u(1.2), fontWeight: 600, color: t.ink }}>Book an appointment</div>
                <div style={{ ...body, fontSize: u(1), color: `${t.ink}99`, border: `1px solid ${t.ink}1f`, borderRadius: u(0.8), padding: u(0.9) }}>General Physician · Dr. A. Verma</div>
                <div style={{ display: "flex", gap: u(0.8) }}>
                  {["Mon 9", "Tue 10", "Wed 11", "Thu 12"].map((d, i) => (
                    <span key={d} style={{ flex: 1, textAlign: "center", ...body, fontSize: u(0.95), padding: `${u(0.8)} 0`, borderRadius: u(0.8), background: i === 1 ? t.accent : t.tint, color: i === 1 ? "#fff" : t.ink }}>
                      {d}
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: u(0.8), flexWrap: "wrap" }}>
                  {["10:00", "10:30", "11:15", "12:00"].map((s, i) => (
                    <span key={s} style={{ ...body, fontSize: u(0.95), padding: `${u(0.5)} ${u(1.1)}`, borderRadius: 999, border: `1px solid ${i === 2 ? t.accent2 : `${t.ink}22`}`, color: i === 2 ? t.accent2 : `${t.ink}aa` }}>
                      {s}
                    </span>
                  ))}
                </div>
                <Button theme={t} size={1.05}>Confirm slot</Button>
              </div>
            }
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: u(1.4), padding: `0 ${u(3.4)} ${u(2.6)}` }}>
            {mock.items.map((item, i) => (
              <div key={item.title} style={{ display: "flex", gap: u(1.2), alignItems: "center", background: "#fff", borderRadius: u(1.2), padding: u(1.3), border: `1px solid ${t.ink}10` }}>
                <span style={{ display: "grid", placeItems: "center", width: u(4.2), height: u(4.2), borderRadius: "50%", background: [t.tint, "#d1fae5", "#fef3c7"][i], color: t.ink, ...body, fontSize: u(1.2), fontWeight: 700 }}>
                  {item.title.replace("Dr. ", "").split(" ").map((w) => w[0]).join("")}
                </span>
                <span>
                  <span style={{ display: "block", ...body, fontSize: u(1.1), fontWeight: 600, color: t.ink }}>{item.title}</span>
                  <span style={{ display: "block", ...body, fontSize: u(0.95), color: `${t.ink}88` }}>{item.meta}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      );
    case "academy":
      return (
        <>
          <Nav mock={mock} />
          <HeroSplit mock={mock} art={<Art layout="academy" theme={t} style={{ height: u(20) }} />} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: u(1.4), padding: `0 ${u(3.4)} ${u(3)}` }}>
            {mock.items.map((item, i) => (
              <div key={item.title} style={{ background: "#fff", borderRadius: u(1.2), overflow: "hidden", border: `1px solid ${t.ink}10` }}>
                <div style={{ height: u(1), background: [t.accent, t.accent2, t.ink][i] }} />
                <div style={{ padding: u(1.4) }}>
                  <div style={{ ...headFont(t), fontSize: u(1.6), color: t.ink }}>{item.title}</div>
                  <div style={{ ...body, fontSize: u(0.95), color: `${t.ink}88`, margin: `${u(0.4)} 0 ${u(1)}` }}>{item.meta}</div>
                  <Lines theme={t} widths={[90, 70]} h={0.6} gap={0.6} />
                </div>
              </div>
            ))}
          </div>
        </>
      );
    case "property":
      return (
        <>
          <Nav mock={mock} />
          <HeroSplit mock={mock} art={<Art layout="property" theme={t} style={{ height: u(21) }} />} />
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: u(1.6), padding: `0 ${u(3.4)} ${u(3)}` }}>
            <div style={{ background: "#fff", borderRadius: u(1.2), padding: u(1.4), border: `1px solid ${t.ink}10` }}>
              <svg viewBox="0 0 120 60" style={{ width: "100%", height: u(10) }}>
                <rect x="2" y="2" width="116" height="56" fill="none" stroke={t.ink} strokeWidth="1.2" />
                <line x1="48" y1="2" x2="48" y2="40" stroke={t.ink} strokeWidth="0.8" />
                <line x1="2" y1="34" x2="48" y2="34" stroke={t.ink} strokeWidth="0.8" />
                <line x1="48" y1="24" x2="118" y2="24" stroke={t.ink} strokeWidth="0.8" />
                <line x1="84" y1="24" x2="84" y2="58" stroke={t.ink} strokeWidth="0.8" />
                <rect x="88" y="30" width="26" height="24" fill={`${t.accent}22`} />
                <text x="12" y="20" fontSize="5" fill={t.ink}>Bedroom</text>
                <text x="64" y="14" fontSize="5" fill={t.ink}>Living</text>
                <text x="54" y="44" fontSize="5" fill={t.ink}>Kitchen</text>
                <text x="91" y="44" fontSize="5" fill={t.ink}>Balcony</text>
              </svg>
            </div>
            <div style={{ display: "grid", gap: u(0.8), alignContent: "start" }}>
              {mock.items.map((item, i) => (
                <div key={item.title} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: i === 1 ? t.ink : "#fff", color: i === 1 ? "#fff" : t.ink, borderRadius: u(0.9), padding: `${u(1)} ${u(1.3)}`, border: `1px solid ${t.ink}10`, ...body, fontSize: u(1.05) }}>
                  <span style={{ fontWeight: 600 }}>{item.title}</span>
                  <span style={{ opacity: 0.75 }}>{item.meta}</span>
                </div>
              ))}
              <div style={{ ...body, fontSize: u(0.85), color: `${t.ink}88` }}>RERA No. shown on every page</div>
            </div>
          </div>
        </>
      );
    case "corporate":
    default:
      return (
        <>
          <Nav mock={mock} />
          <div style={{ position: "relative", margin: `${u(2)} ${u(3)} 0` }}>
            <Art layout="corporate" theme={t} style={{ height: u(22) }} />
            <div style={{ position: "absolute", left: u(3), top: u(3.4), maxWidth: "56%", color: "#fff" }}>
              <div style={{ ...headFont(t), fontSize: u(3.8), lineHeight: 1.05 }}>{mock.headline}</div>
              <div style={{ ...body, fontSize: u(1.2), opacity: 0.8, margin: `${u(1.2)} 0 ${u(1.8)}` }}>{mock.sub}</div>
              <span style={{ display: "inline-block", background: "#fff", color: t.accent, padding: `${u(0.9)} ${u(1.8)}`, borderRadius: 999, fontSize: u(1.15), fontWeight: 600, ...body }}>{mock.cta}</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: u(1.4), padding: `${u(2)} ${u(3)} ${u(3)}` }}>
            {mock.items.map((item, i) => (
              <div key={item.title} style={{ borderTop: `${u(0.25)} solid ${i === 0 ? t.accent2 : `${t.ink}22`}`, paddingTop: u(1.2) }}>
                <div style={{ ...body, fontSize: u(0.9), color: t.accent2, fontWeight: 600 }}>0{i + 1}</div>
                <div style={{ ...headFont(t), fontSize: u(1.7), color: t.ink, marginTop: u(0.4) }}>{item.title}</div>
                <div style={{ ...body, fontSize: u(1), color: `${t.ink}88`, marginTop: u(0.3) }}>{item.meta}</div>
              </div>
            ))}
          </div>
        </>
      );
  }
}

/* ───────────────────────── Mobile layout ───────────────────────── */

function MobileBody({ project }: { project: Project }) {
  const mock = project.mock;
  const t = mock.theme;
  if (mock.layout === "dashboard") {
    return (
      <div style={{ padding: u(6), display: "grid", gap: u(4) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ ...headFont(t), fontSize: u(5.6), color: t.ink }}>{mock.brand}</span>
          <span style={{ width: u(8), height: u(8), borderRadius: "50%", background: t.tint }} />
        </div>
        <div>
          <div style={{ ...headFont(t), fontSize: u(6.4), color: t.ink, lineHeight: 1.1 }}>{mock.headline}</div>
          <div style={{ ...body, fontSize: u(3.6), color: `${t.ink}88`, marginTop: u(1.4) }}>{mock.sub}</div>
        </div>
        {mock.items.map((item, i) => (
          <div key={item.title} style={{ background: i === 0 ? t.ink : "#fff", color: i === 0 ? "#fff" : t.ink, borderRadius: u(4), padding: u(4.4), border: `1px solid ${t.ink}10` }}>
            <div style={{ ...body, fontSize: u(3.4), opacity: 0.7 }}>{item.title}</div>
            <div style={{ ...headFont(t), fontSize: u(7), marginTop: u(1) }}>{item.meta}</div>
          </div>
        ))}
        <Button theme={t} size={3.8}>+ {mock.cta}</Button>
      </div>
    );
  }
  const heroOverlay = mock.layout === "resort" || mock.layout === "corporate" || mock.layout === "editorial";
  return (
    <div>
      <Nav mock={mock} compact />
      {heroOverlay ? (
        <div style={{ position: "relative" }}>
          <Art layout={mock.layout} theme={t} style={{ height: u(92), borderRadius: 0 }} />
          <div style={{ position: "absolute", inset: 0, background: mock.layout === "editorial" ? `linear-gradient(0deg, ${t.paper} 8%, ${t.paper}e6 42%, transparent 75%)` : `linear-gradient(0deg, ${t.ink}e6 0%, ${t.ink}66 45%, transparent 75%)` }} />
          <div style={{ position: "absolute", left: u(6), right: u(6), bottom: u(8), color: mock.layout === "editorial" ? t.ink : "#fff" }}>
            <div style={{ ...headFont(t), fontSize: u(10), lineHeight: 1.02 }}>{mock.headline}</div>
            <div style={{ ...body, fontSize: u(3.8), opacity: 0.85, margin: `${u(3)} 0 ${u(4)}` }}>{mock.sub}</div>
            <Button theme={t} size={3.8}>{mock.cta}</Button>
          </div>
        </div>
      ) : (
        <div style={{ padding: `${u(6)} ${u(6)} ${u(2)}` }}>
          <div style={{ ...headFont(t), fontSize: u(10), lineHeight: 1.03, color: t.ink }}>{mock.headline}</div>
          <div style={{ ...body, fontSize: u(3.8), color: `${t.ink}99`, margin: `${u(3)} 0 ${u(5)}` }}>{mock.sub}</div>
          <Button theme={t} size={3.8}>{mock.cta}</Button>
          <Art layout={mock.layout} theme={t} style={{ height: u(56), marginTop: u(7), borderRadius: u(4) }} />
        </div>
      )}
      <div style={{ padding: u(6), display: "grid", gap: u(3) }}>
        {mock.items.slice(0, 2).map((item) => (
          <div key={item.title} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderRadius: u(3.4), padding: `${u(4)} ${u(4.4)}`, border: `1px solid ${t.ink}12`, ...body, fontSize: u(3.6), color: t.ink }}>
            <span style={{ fontWeight: 600 }}>{item.title}</span>
            <span style={{ color: `${t.ink}88` }}>{item.meta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Public ───────────────────────── */

/** The concept site itself, filling its box. Wrap in a frame. */
export function SiteMock({ project, device = "desktop" }: { project: Project; device?: "desktop" | "mobile" }) {
  const dashboard = project.mock.layout === "dashboard";
  return (
    <div
      aria-hidden="true"
      style={{ containerType: "inline-size", width: "100%", height: "100%", overflow: "hidden", background: project.mock.theme.paper, userSelect: "none" }}
    >
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", height: dashboard ? "100%" : undefined }}>
        {device === "desktop" ? <DesktopBody project={project} /> : <MobileBody project={project} />}
        {!dashboard && device === "desktop" ? <FooterBand mock={project.mock} /> : null}
        {device === "mobile" ? <MobileTabBar mock={project.mock} /> : null}
      </div>
    </div>
  );
}

function MobileTabBar({ mock }: { mock: Mock }) {
  const t = mock.theme;
  return (
    <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-around", padding: `${u(4)} ${u(4)} ${u(6)}`, borderTop: `1px solid ${t.ink}14`, background: "#ffffffee" }}>
      {mock.nav.slice(0, 4).map((item, i) => (
        <span key={item} style={{ display: "grid", justifyItems: "center", gap: u(1.4), ...body, fontSize: u(2.8), color: i === 0 ? t.accent : `${t.ink}88`, fontWeight: i === 0 ? 700 : 500 }}>
          <span style={{ width: u(5.4), height: u(5.4), borderRadius: u(1.6), background: i === 0 ? t.accent : `${t.ink}1a` }} />
          {item.split(" ")[0]}
        </span>
      ))}
    </div>
  );
}
