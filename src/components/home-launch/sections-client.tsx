"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarClock,
  Check,
  Factory,
  FileSpreadsheet,
  FileText,
  Globe,
  KeyRound,
  Landmark,
  Mail,
  Minus,
  Palette,
  Plus,
  Receipt,
  Rocket,
  Search,
  Ship,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { BlueprintStack, StructureGlyph, type BlueprintLayer } from "@/components/home-launch/art";
import { AVAILABILITY_LABEL, formatINR, priceText } from "@/components/home-launch/format";
import { NATURE_LABEL, stackFor } from "@/components/home-launch/launch-builder";
import { goTo, launchStore, useLaunchState } from "@/components/home-launch/launch-store";
import {
  ACCEPTED_UPLOAD_FORMATS,
  DOCUMENTS,
  FAQ_CATEGORIES,
  JOURNEY,
  JOURNEY_PHASES,
  LAUNCH_FAQS,
  LAUNCH_MODULES,
  MODULE_GROUPS,
  PRESETS,
  SCENARIOS,
  STRUCTURES,
  moduleApplicability,
  moduleById,
  presetModules,
  structureById,
  summariseSelection,
  type ModuleGroup,
  type ModuleId,
  type ResolvedModule,
  type StructureId,
} from "@/lib/homepage/launch-catalog";

type Resolved = Record<ModuleId, ResolvedModule>;

const MODULE_ICONS: Partial<Record<ModuleId, LucideIcon>> = {
  dsc: KeyRound,
  gst: Receipt,
  "gst-returns": CalendarClock,
  msme: Factory,
  "startup-india": Rocket,
  trademark: BadgeCheck,
  fssai: UtensilsCrossed,
  iec: Ship,
  "shops-establishment": Store,
  iso: Award,
  "current-account": Landmark,
  website: Globe,
  "brand-identity": Palette,
  "business-email": Mail,
  accounting: BookOpen,
  "annual-compliance": CalendarCheck,
  itr: FileText,
  "project-report": FileSpreadsheet,
};

export function moduleIcon(id: ModuleId): LucideIcon {
  return MODULE_ICONS[id] ?? Building2;
}

function StructurePicker({ value, onChange, label }: { value: StructureId; onChange: (id: StructureId) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="rl-addon-filter">
      {STRUCTURES.map((structure) => (
        <button key={structure.id} type="button" className="rl-pill" aria-pressed={value === structure.id} onClick={() => onChange(structure.id)}>
          {structure.short}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Packages
   ───────────────────────────────────────────────────────────────────────── */

export function PackageComparison({ resolved }: { resolved: Resolved }) {
  const state = useLaunchState();
  const [structure, setStructure] = useState<StructureId>("pvt");
  useEffect(() => {
    if (state.structure) setStructure(state.structure);
  }, [state.structure]);

  const presets = PRESETS.map((preset) => {
    const modules = presetModules(preset, structure);
    return { preset, modules, summary: summariseSelection(modules, resolved) };
  });
  const rows = [...new Set(presets.flatMap((entry) => entry.modules))];

  const choose = (index: number) => {
    const { preset, modules } = presets[index];
    launchStore.apply({ structure, modules, step: preset.id === "custom" ? 2 : 3 });
    goTo("builder");
  };

  return (
    <div>
      <StructurePicker value={structure} onChange={setStructure} label="Show packages for" />
      <div className="rl-packages">
        {presets.map(({ preset, modules, summary }, index) => {
          const featured = preset.id === "business-ready";
          return (
            <article key={preset.id} className="rl-pkg" data-featured={featured ? "true" : undefined} data-reveal style={{ "--rl-delay": `${index * 70}ms` } as CSSProperties}>
              <div className="rl-pkg__stack" style={{ background: featured ? "transparent" : "var(--rl-night-2)", borderRadius: 14 }}>
                <BlueprintStack layers={stackFor(modules)} width={300} height={90} cx={150} base={64} w={32} t={6} gap={10} labels={false} idea={false} />
              </div>
              <h3>{preset.name}</h3>
              <p>{preset.forWho}</p>
              <div className="rl-pkg__price">
                {preset.id === "custom" ? (
                  <strong>Your choice</strong>
                ) : (
                  <>
                    <strong className="rl-price">{summary.online.length ? formatINR(summary.onlineTotal) : "Quoted"}</strong>
                    <div className="rl-fine">
                      {summary.online.length ? "online service fees" : "on request"}
                      {summary.quoted.length && summary.online.length ? ` + ${summary.quoted.length} quoted` : ""}
                      {" · government fees extra where they apply"}
                    </div>
                  </>
                )}
              </div>
              <ul>
                {preset.id === "custom" ? (
                  <>
                    <li>
                      <Check aria-hidden="true" />
                      Any service, one at a time
                    </li>
                    <li>
                      <Check aria-hidden="true" />
                      Itemised price for each
                    </li>
                  </>
                ) : (
                  modules.map((id) => (
                    <li key={id}>
                      <Check aria-hidden="true" />
                      {moduleById(id)?.label}
                    </li>
                  ))
                )}
              </ul>
              <button type="button" className={`rl-btn ${featured ? "rl-btn--launch" : "rl-btn--ghost"}`} onClick={() => choose(index)}>
                {preset.id === "custom" ? "Build your own" : "Start with this"}
                <ArrowRight className="rl-arrow" aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>

      <div className="rl-table-wrap" data-reveal>
        <table className="rl-table">
          <caption>
            What each starting point includes — {structureById(structure)?.name}
          </caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              {presets.map(({ preset }) => (
                <th key={preset.id} scope="col">
                  {preset.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((id) => {
              const mod = moduleById(id)!;
              const price = priceText(resolved[id]);
              return (
                <tr key={id}>
                  <th scope="row">
                    {mod.label}
                    <div className="rl-fine" style={{ fontWeight: 400 }}>
                      {NATURE_LABEL[mod.nature]} · {resolved[id].availability === "checkout" && price ? price : AVAILABILITY_LABEL[resolved[id].availability]}
                    </div>
                  </th>
                  {presets.map(({ preset, modules }) => (
                    <td key={preset.id}>
                      {preset.id === "custom" ? (
                        <span className="rl-no">Your choice</span>
                      ) : modules.includes(id) ? (
                        <span className="rl-yes">
                          <Check aria-hidden="true" /> Included
                        </span>
                      ) : (
                        <span className="rl-no">
                          <Minus aria-hidden="true" /> Not included
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr>
              <th scope="row">Service fees (online)</th>
              {presets.map(({ preset, summary }) => (
                <td key={preset.id}>{preset.id === "custom" ? "Per item" : summary.online.length ? formatINR(summary.onlineTotal) : "—"}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Quoted on request</th>
              {presets.map(({ preset, summary }) => (
                <td key={preset.id}>{preset.id === "custom" ? "Per item" : summary.quoted.length ? `${summary.quoted.length} item${summary.quoted.length > 1 ? "s" : ""}` : "None"}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Government fees & stamp duty</th>
              <td colSpan={presets.length}>Not included in service fees. Set by the authority — for incorporation, by authorised capital and state.</td>
            </tr>
            <tr>
              <th scope="row">Taxes</th>
              <td colSpan={presets.length}>Any tax on our fees is shown at checkout and on the invoice.</td>
            </tr>
            <tr>
              <th scope="row">Directors / partners</th>
              <td colSpan={presets.length}>
                The structure&apos;s minimum. More directors or partners mean more documents and DSCs, and can change costs — we confirm before work starts.
              </td>
            </tr>
            <tr>
              <th scope="row">Documents & timeline</th>
              <td colSpan={presets.length}>
                Per item. See the <a className="rl-link" href="#documents">document checklist</a>; quoted turnarounds appear next to each service. Approval times are set by the authority.
              </td>
            </tr>
            <tr>
              <th scope="row">Annual compliance</th>
              <td colSpan={presets.length}>Recurring every year and only included where the table above says so.</td>
            </tr>
            <tr>
              <th scope="row">Refunds & cancellation</th>
              <td colSpan={presets.length}>
                As per our <a className="rl-link" href="/refund-policy">Refund &amp; Cancellation policy</a>. Government fees already paid generally cannot be recovered.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="rl-fine" style={{ marginTop: 14 }}>
        These are starting selections for the builder, priced item by item from our live catalogue — not bundles with a discount. Not every business needs every
        registration; conditional items apply only in the situations described.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Journey
   ───────────────────────────────────────────────────────────────────────── */

const JOURNEY_LIT: number[][] = [[], [], [0], [0], [0], [0], [0, 4], [0, 1, 2, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4]];
// Short enough to fit beside the stack at every width the visual is shown.
const JOURNEY_LABELS = ["ENTITY", "TAX · GST", "LICENCES", "BRAND · DIGITAL", "COMPLIANCE"];
const JOURNEY_TONES = ["blue", "cyan", "orange", "violet", "cyan"] as const;

export function JourneyStory() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(Number((visible.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    refs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const lit = JOURNEY_LIT[active] ?? [];
  const layers: BlueprintLayer[] = JOURNEY_LABELS.map((label, index) => ({ key: label, label, tone: JOURNEY_TONES[index], lit: lit.includes(index) }));
  const stage = JOURNEY[active];

  return (
    <div className="rl-journey">
      <div className="rl-journey__visual" aria-hidden="true">
        <div style={{ position: "absolute", top: 24, left: 28, right: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="rl-phase" data-phase={stage.phase}>
            {JOURNEY_PHASES[stage.phase]}
          </span>
          <span className="rl-mono" style={{ fontSize: 12, color: "var(--rl-sky)" }}>
            {String(active + 1).padStart(2, "0")} / {JOURNEY.length}
          </span>
        </div>
        <div style={{ position: "absolute", inset: "60px 10px 70px" }}>
          <BlueprintStack layers={layers} idea={active < 2} />
        </div>
        <div style={{ position: "absolute", left: 28, right: 28, bottom: 24 }}>
          <div style={{ height: 3, borderRadius: 2, background: "rgba(138,184,255,0.15)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${((active + 1) / JOURNEY.length) * 100}%`, background: "var(--rl-cyan)", transition: "width .6s var(--rl-ease)" }} />
          </div>
        </div>
      </div>

      <ol className="rl-journey__steps">
        {JOURNEY.map((item, index) => (
          <li
            key={item.title}
            ref={(node) => {
              refs.current[index] = node;
            }}
            data-index={index}
            data-active={index === active ? "true" : "false"}
            className="rl-jstep"
          >
            <span className="rl-jstep__dot" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <span className="rl-phase" data-phase={item.phase}>
                {JOURNEY_PHASES[item.phase]}
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Add-ons
   ───────────────────────────────────────────────────────────────────────── */

function AddButton({ id, label }: { id: ModuleId; label: string }) {
  const state = useLaunchState();
  const mod = moduleById(id)!;
  const added = state.modules.includes(id);
  const applicable = moduleApplicability(mod, state.structure);
  if (!applicable.ok) {
    return <span className="rl-tag rl-tag--na" title={applicable.reason}>Not for {structureById(state.structure)?.short}</span>;
  }
  return (
    <button
      type="button"
      className={`rl-btn rl-btn--sm ${added ? "rl-btn--ghost" : "rl-btn--blue"}`}
      aria-pressed={added}
      onClick={() => (added ? launchStore.toggle(id) : launchStore.add(id))}
    >
      {added ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
      {added ? "In your setup" : "Add to setup"}
      <span className="rl-sr"> — {label}</span>
    </button>
  );
}

export function AddonsCatalog({ resolved }: { resolved: Resolved }) {
  const [group, setGroup] = useState<ModuleGroup | "all">("all");
  const state = useLaunchState();
  const groups = (Object.keys(MODULE_GROUPS) as ModuleGroup[]).filter((key) => key !== "foundation");
  const modules = LAUNCH_MODULES.filter((mod) => mod.nature !== "foundation" && (group === "all" || mod.group === group));
  const count = state.modules.filter((id) => moduleById(id)?.nature !== "foundation").length;

  return (
    <div>
      <div className="rl-addon-filter" role="group" aria-label="Filter services">
        <button type="button" className="rl-pill" aria-pressed={group === "all"} onClick={() => setGroup("all")}>
          All
        </button>
        {groups.map((key) => (
          <button key={key} type="button" className="rl-pill" aria-pressed={group === key} onClick={() => setGroup(key)}>
            {MODULE_GROUPS[key].label}
          </button>
        ))}
        <a href="#builder" className="rl-link" style={{ marginLeft: "auto", alignSelf: "center" }}>
          {count ? `${count} in your setup — review` : "Open the builder"}
        </a>
      </div>
      <ul className="rl-addons">
        {modules.map((mod) => {
          const Icon = moduleIcon(mod.id);
          const entry = resolved[mod.id];
          const price = priceText(entry);
          return (
            <li key={mod.id}>
              <article className="rl-addon">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
                  <span className="rl-addon__icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
                    <span className={`rl-tag rl-tag--${mod.nature}`}>{NATURE_LABEL[mod.nature]}</span>
                    <span className={`rl-tag rl-tag--${entry.availability === "checkout" ? "checkout" : "enquiry"}`}>{AVAILABILITY_LABEL[entry.availability]}</span>
                  </span>
                </div>
                <h3>{mod.label}</h3>
                <p>{mod.summary}</p>
                {mod.condition ? <p className="rl-addon__cond">{mod.condition}</p> : null}
                <p className="rl-addon__cond">
                  <strong style={{ color: "var(--rl-body)" }}>Government fee: </strong>
                  {mod.governmentFee}
                </p>
                <div className="rl-addon__foot">
                  {price ? <span className="rl-price">{price}</span> : <span className="rl-fine">Quoted on request</span>}
                  {entry.timeline ? <span className="rl-fine">· {entry.timeline}</span> : null}
                  <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                    {entry.href ? (
                      <a className="rl-link" href={entry.href} aria-label={`${mod.label} details`}>
                        Details
                      </a>
                    ) : null}
                    <AddButton id={mod.id} label={mod.label} />
                  </span>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Documents
   ───────────────────────────────────────────────────────────────────────── */

export function DocumentCenter() {
  const state = useLaunchState();
  const [structure, setStructure] = useState<StructureId>("pvt");
  const [have, setHave] = useState<Record<string, boolean>>({});
  const id = useId();
  useEffect(() => {
    if (state.structure) setStructure(state.structure);
  }, [state.structure]);

  const docs = DOCUMENTS[structure];
  const required = docs.filter((doc) => doc.kind === "required");
  const ready = required.filter((doc) => have[`${structure}:${doc.id}`]).length;
  const missing = required.filter((doc) => !have[`${structure}:${doc.id}`]);
  const pct = required.length ? ready / required.length : 0;
  const circumference = 2 * Math.PI * 60;

  const kinds: { kind: (typeof docs)[number]["kind"]; title: string }[] = [
    { kind: "required", title: "Required" },
    { kind: "conditional", title: "Only if it applies to you" },
    { kind: "prepared", title: "Prepared during the process" },
  ];

  return (
    <div className="rl-docs">
      <div>
        <StructurePicker value={structure} onChange={setStructure} label="Checklist for" />
        <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: 8 }}>
          <div className="rl-progress" role="img" aria-label={`${ready} of ${required.length} required documents ready`}>
            <svg viewBox="0 0 140 140" aria-hidden="true">
              <circle cx="70" cy="70" r="60" fill="none" stroke="var(--rl-line)" strokeWidth="10" />
              <circle
                cx="70"
                cy="70"
                r="60"
                fill="none"
                stroke={pct === 1 ? "var(--rl-ok)" : "var(--rl-blue)"}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - pct)}
              />
            </svg>
            <div className="rl-progress__label" aria-hidden="true">
              <div>
                <strong>
                  {ready}/{required.length}
                </strong>
                <span>required ready</span>
              </div>
            </div>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 650 }}>{pct === 1 ? "You have every required document." : `${missing.length} still to collect`}</p>
            <p className="rl-fine" style={{ margin: "6px 0 0" }}>
              Upload format: {ACCEPTED_UPLOAD_FORMATS}. Nothing is uploaded from this page — documents are added securely inside your application.
            </p>
          </div>
        </div>
        {missing.length ? (
          <div style={{ marginTop: 18 }}>
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 650 }}>Missing</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7, color: "var(--rl-body)" }} aria-live="polite">
              {missing.map((doc) => (
                <li key={doc.id}>{doc.label}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <button
          type="button"
          className="rl-btn rl-btn--blue"
          style={{ marginTop: 22 }}
          onClick={() => {
            launchStore.setStructure(structure);
            if (!state.business) launchStore.setStep(0);
            else launchStore.setStep(2);
            goTo("builder");
          }}
        >
          Continue with a {structureById(structure)?.short}
          <ArrowRight className="rl-arrow" aria-hidden="true" />
        </button>
      </div>

      <div>
        {kinds.map(({ kind, title }) => {
          const items = docs.filter((doc) => doc.kind === kind);
          if (!items.length) return null;
          return (
            <section key={kind} style={{ marginBottom: 22 }} aria-label={title}>
              <h3 style={{ margin: "0 0 10px", fontSize: 15, display: "flex", gap: 10, alignItems: "center" }}>
                <span className={`rl-tag rl-tag--${kind === "required" ? "foundation" : kind === "conditional" ? "conditional" : "optional"}`}>{title}</span>
              </h3>
              <ul className="rl-doclist">
                {items.map((doc) => {
                  const key = `${structure}:${doc.id}`;
                  const inputId = `${id}-${doc.id}`;
                  return (
                    <li key={doc.id} className="rl-doc" data-have={have[key] ? "true" : undefined}>
                      {kind === "prepared" ? (
                        <FileText size={20} aria-hidden="true" style={{ color: "var(--rl-muted)", marginTop: 2 }} />
                      ) : (
                        <input id={inputId} type="checkbox" checked={Boolean(have[key])} onChange={(event) => setHave((current) => ({ ...current, [key]: event.target.checked }))} />
                      )}
                      <label htmlFor={kind === "prepared" ? undefined : inputId}>
                        <strong>{doc.label}</strong>
                        <span>
                          {doc.detail}
                          {doc.condition ? ` ${doc.condition}` : ""}
                        </span>
                      </label>
                      <span className="rl-fine">{kind === "prepared" ? "We draft" : have[key] ? "Ready" : ""}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <p className="rl-fine">
          A general checklist. The exact documents depend on the people involved and the state, and are confirmed during your application.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Cost ledger
   ───────────────────────────────────────────────────────────────────────── */

export function CostLedger({ resolved }: { resolved: Resolved }) {
  const state = useLaunchState();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const summary = summariseSelection(hydrated ? state.modules : [], resolved);
  const recurring = summary.lines.filter((line) => line.mod.nature === "recurring");
  const optionalQuoted = summary.quoted.filter((line) => line.mod.nature !== "recurring");

  const segments = [
    { key: "service", label: "Service fees", color: "#2f80ed", show: summary.online.length > 0, value: summary.online.length ? formatINR(summary.onlineTotal) : "" },
    { key: "gov", label: "Government fees", color: "repeating-linear-gradient(135deg,#ff8a3d 0 6px,#d95a0b 6px 12px)", show: true, value: "Varies" },
    { key: "quoted", label: "Quoted items", color: "#8b6cf0", show: optionalQuoted.length > 0, value: `${optionalQuoted.length}` },
    { key: "recurring", label: "Recurring", color: "#46c4f0", show: recurring.length > 0, value: `${recurring.length}/yr` },
  ].filter((segment) => segment.show);

  return (
    <div className="rl-ledger" data-reveal>
      <div>
        <span className="rl-eyebrow">Your setup, by cost type</span>
        <h3 style={{ margin: "12px 0 0", fontSize: 26, letterSpacing: "-0.02em" }}>
          {summary.lines.length ? `${summary.lines.length} item${summary.lines.length > 1 ? "s" : ""} in your setup` : "Nothing selected yet"}
        </h3>
        <p className="rl-fine" style={{ marginTop: 8 }}>
          {summary.lines.length
            ? "This reads the setup you are building above. The bar shows which kinds of cost apply — it is not drawn to scale, because government fees depend on your details."
            : "Add services in the builder and this shows which kinds of cost your setup involves."}
        </p>
        <a href="#builder" className="rl-btn rl-btn--ghost rl-btn--sm" style={{ marginTop: 16 }}>
          {summary.lines.length ? "Adjust setup" : "Open the builder"}
        </a>
      </div>
      <div>
        <div className="rl-stackbar" role="img" aria-label={`Cost types in your setup: ${segments.map((segment) => segment.label).join(", ")}`}>
          {segments.map((segment) => (
            <div key={segment.key} style={{ flexGrow: 1, background: segment.color, color: "#fff" }} aria-hidden="true">
              {segment.value}
            </div>
          ))}
        </div>
        <ul className="rl-legend">
          <li>
            <i style={{ background: "#2f80ed" }} />
            <span>
              <b>Service fees {summary.online.length ? formatINR(summary.onlineTotal) : "—"}</b> — charged at checkout for{" "}
              {summary.online.length ? summary.online.map((line) => line.mod.label).join(", ") : "services you can buy online"}.
            </span>
          </li>
          <li>
            <i style={{ background: "#ff8a3d" }} />
            <span>
              <b>Government fees and stamp duty</b> — paid to the authority, and for incorporation set by authorised capital and state.
            </span>
          </li>
          <li>
            <i style={{ background: "#8b6cf0" }} />
            <span>
              <b>Quoted items {optionalQuoted.length ? `(${optionalQuoted.length})` : ""}</b> — priced by our team before any work starts.
            </span>
          </li>
          <li>
            <i style={{ background: "#46c4f0" }} />
            <span>
              <b>Recurring {recurring.length ? `(${recurring.length})` : ""}</b> — returns and annual filings repeat every year; they are not covered by incorporation.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Structure comparison
   ───────────────────────────────────────────────────────────────────────── */

const DIMENSIONS = [
  { key: "ownership", label: "Ownership", lens: "people" },
  { key: "liability", label: "Liability", lens: "people" },
  { key: "legalEntity", label: "Separate legal entity", lens: "people" },
  { key: "governance", label: "Governance", lens: "running" },
  { key: "fundraising", label: "Fundraising", lens: "money" },
  { key: "compliance", label: "Compliance burden", lens: "running" },
  { key: "tax", label: "Tax treatment", lens: "money" },
  { key: "continuity", label: "Continuity", lens: "running" },
  { key: "registration", label: "How it is registered", lens: "running" },
  { key: "limitations", label: "Important limitations", lens: "money" },
] as const;

const LENSES = [
  { key: "all", label: "Everything" },
  { key: "people", label: "Ownership & liability" },
  { key: "money", label: "Money & tax" },
  { key: "running", label: "Running it" },
] as const;

export function StructureComparison() {
  const [lens, setLens] = useState<(typeof LENSES)[number]["key"]>("all");
  const rows = DIMENSIONS.filter((dimension) => lens === "all" || dimension.lens === lens);
  return (
    <div>
      <div className="rl-compare-filters" role="group" aria-label="Show dimensions">
        {LENSES.map((entry) => (
          <button key={entry.key} type="button" className="rl-pill" aria-pressed={lens === entry.key} onClick={() => setLens(entry.key)}>
            {entry.label}
          </button>
        ))}
      </div>
      <div className="rl-table-wrap" style={{ marginTop: 0 }} tabIndex={0} role="region" aria-label="Business structure comparison, scrolls sideways">
        <table className="rl-table rl-table--compare">
          <caption>Business structures in India compared</caption>
          <thead>
            <tr>
              <th scope="col">Dimension</th>
              {STRUCTURES.map((structure) => (
                <th key={structure.id} scope="col">
                  <span style={{ display: "inline-grid", placeItems: "center", width: 44, height: 44, borderRadius: 10, background: "var(--rl-night-2)", marginBottom: 8 }} aria-hidden="true">
                    <StructureGlyph id={structure.id} size={34} />
                  </span>
                  <br />
                  {structure.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((dimension) => (
              <tr key={dimension.key}>
                <th scope="row">{dimension.label}</th>
                {STRUCTURES.map((structure) => (
                  <td key={structure.id}>
                    {dimension.key === "compliance" ? (
                      <span className="rl-meter" aria-hidden="true" style={{ display: "flex", marginBottom: 6 }}>
                        {[1, 2, 3].map((level) => (
                          <i key={level} className={level <= structure.complianceLevel ? "on" : undefined} />
                        ))}
                      </span>
                    ) : null}
                    {structure[dimension.key]}
                  </td>
                ))}
              </tr>
            ))}
            {lens === "all" || lens === "people" ? (
              <tr>
                <th scope="row">Typical use cases</th>
                {STRUCTURES.map((structure) => (
                  <td key={structure.id}>{structure.suits.join("; ")}.</td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="rl-fine" style={{ marginTop: 14, maxWidth: "85ch" }}>
        General information, qualified on purpose: thresholds, tax rates and exemptions change through budgets and notifications, and individual circumstances
        matter. Confirm current requirements with a chartered accountant or company secretary before choosing.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Scenarios
   ───────────────────────────────────────────────────────────────────────── */

export function UseCases({ resolved }: { resolved: Resolved }) {
  return (
    <ul className="rl-scenarios">
      {SCENARIOS.map((scenario, index) => {
        const structure = structureById(scenario.structure)!;
        const modules = [structure.foundationModule, ...scenario.modules];
        const summary = summariseSelection(modules, resolved);
        return (
          <li key={scenario.id} data-reveal style={{ "--rl-delay": `${index * 60}ms` } as CSSProperties}>
            <article className="rl-scenario">
              <div className="rl-scenario__art" style={{ background: "var(--rl-night-2)", display: "grid", gridTemplateColumns: "96px 1fr", alignItems: "center" }} aria-hidden="true">
                <div style={{ display: "grid", placeItems: "center" }}>
                  <StructureGlyph id={scenario.structure} size={64} />
                </div>
                <BlueprintStack layers={stackFor(modules)} width={240} height={120} cx={120} base={98} w={40} t={7} gap={14} labels={false} idea={false} />
              </div>
              <div className="rl-scenario__body">
                <span className="rl-tag">Illustrative scenario</span>
                <h3>{scenario.title}</h3>
                <p>{scenario.situation}</p>
                <p style={{ color: "var(--rl-ink)" }}>
                  <strong>Structure considered:</strong> {structure.name}. {scenario.why}
                </p>
                <ul aria-label="Services in this setup">
                  {scenario.modules.map((id) => (
                    <li key={id} className="rl-tag">
                      {moduleById(id)?.label}
                    </li>
                  ))}
                </ul>
                <p className="rl-fine">
                  {summary.online.length ? `${formatINR(summary.onlineTotal)} online service fees` : "Quoted on request"}
                  {summary.quoted.length && summary.online.length ? ` + ${summary.quoted.length} quoted` : ""}
                </p>
                <button
                  type="button"
                  className="rl-btn rl-btn--ghost rl-btn--sm"
                  onClick={() => {
                    launchStore.apply({ structure: scenario.structure, business: scenario.business, modules, step: 3 });
                    goTo("builder");
                  }}
                >
                  Start from this setup
                  <ArrowRight className="rl-arrow" aria-hidden="true" />
                </button>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   FAQ
   ───────────────────────────────────────────────────────────────────────── */

export function LaunchFaq() {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(LAUNCH_FAQS[0].question);
  const id = useId();
  const q = query.trim().toLowerCase();
  const items = useMemo(
    () =>
      LAUNCH_FAQS.filter(
        (item) =>
          (category === "all" || item.category === category) && (!q || `${item.question} ${item.answer}`.toLowerCase().includes(q)),
      ),
    [category, q],
  );
  const counts = useMemo(() => Object.fromEntries(FAQ_CATEGORIES.map((cat) => [cat, LAUNCH_FAQS.filter((item) => item.category === cat).length])), []);

  return (
    <div className="rl-faq">
      <div>
        <div className="rl-field" style={{ marginBottom: 14 }}>
          <label htmlFor={`${id}-q`} className="rl-sr">
            Search questions
          </label>
          <div style={{ position: "relative" }}>
            <Search size={18} aria-hidden="true" style={{ position: "absolute", left: 12, top: 14, color: "var(--rl-muted)" }} />
            <input id={`${id}-q`} type="search" placeholder="Search questions" value={query} onChange={(event) => setQuery(event.target.value)} style={{ paddingLeft: 38 }} />
          </div>
        </div>
        <div className="rl-faq__cats" role="group" aria-label="Question categories">
          <button type="button" className="rl-pill" aria-pressed={category === "all"} onClick={() => setCategory("all")}>
            All <span className="rl-fine">{LAUNCH_FAQS.length}</span>
          </button>
          {FAQ_CATEGORIES.filter((cat) => counts[cat]).map((cat) => (
            <button key={cat} type="button" className="rl-pill" aria-pressed={category === cat} onClick={() => setCategory(cat)}>
              {cat} <span className="rl-fine">{counts[cat]}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="rl-sr" aria-live="polite">
          {items.length} question{items.length === 1 ? "" : "s"} shown
        </p>
        <div className="rl-acc">
          {items.map((item, index) => {
            const isOpen = open === item.question;
            const panelId = `${id}-p-${index}`;
            const buttonId = `${id}-b-${index}`;
            return (
              <div key={item.question} className="rl-acc__item">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    className="rl-acc__btn"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : item.question)}
                  >
                    {item.question}
                    <Plus aria-hidden="true" />
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} className="rl-acc__panel" data-open={isOpen ? "true" : "false"}>
                  <div>
                    <small>{item.category}</small>
                    <p>{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {!items.length ? (
            <p className="rl-fine" style={{ padding: "20px 4px" }}>
              No question matches “{query}”. <a className="rl-link" href="#builder">Ask us directly</a> from the builder.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Mobile dock
   ───────────────────────────────────────────────────────────────────────── */

export function MobileDock({ resolved }: { resolved: Resolved }) {
  const state = useLaunchState();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const builder = document.getElementById("builder");
    const hero = document.querySelector("[data-hero]");
    const finale = document.getElementById("start");
    const visible = new Map<Element, boolean>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visible.set(entry.target, entry.isIntersecting));
      setShow(![hero, builder, finale].some((el) => el && visible.get(el)));
    });
    [hero, builder, finale].forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);
  const summary = summariseSelection(state.modules, resolved);
  return (
    <div className="rl-dock" data-show={show ? "true" : "false"} aria-hidden={!show}>
      <span>
        {summary.lines.length ? (
          <>
            <strong>{summary.lines.length} in setup</strong>
            {summary.online.length ? ` · ${formatINR(summary.onlineTotal)}` : ""}
          </>
        ) : (
          "Start your company with RNOS"
        )}
      </span>
      <a href="#builder" className="rl-btn rl-btn--launch rl-btn--sm" tabIndex={show ? 0 : -1}>
        {summary.lines.length ? "Review" : "Build"}
      </a>
    </div>
  );
}
