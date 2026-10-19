"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, X } from "lucide-react";

import { StructureGlyph } from "@/components/home-launch/art";
import { AVAILABILITY_LABEL, priceText } from "@/components/home-launch/format";
import { goTo, launchStore } from "@/components/home-launch/launch-store";
import { STRUCTURES, type ModuleId, type ResolvedModule, type StructureId } from "@/lib/homepage/launch-catalog";

const COMPARE_ROWS: { key: "ownership" | "liability" | "fundraising" | "compliance" | "tax"; label: string }[] = [
  { key: "ownership", label: "Ownership" },
  { key: "liability", label: "Liability" },
  { key: "fundraising", label: "Fundraising" },
  { key: "compliance", label: "Compliance" },
  { key: "tax", label: "Tax" },
];

export function StructureExplorer({ resolved }: { resolved: Record<ModuleId, ResolvedModule> }) {
  const [active, setActive] = useState<StructureId>("pvt");
  const [compare, setCompare] = useState<StructureId[]>([]);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const baseId = useId();

  // The navigation's structure links open the matching tab.
  useEffect(() => {
    const onSelect = (event: Event) => {
      const id = (event as CustomEvent<StructureId>).detail;
      if (STRUCTURES.some((structure) => structure.id === id)) setActive(id);
    };
    window.addEventListener("rl:structure", onSelect);
    return () => window.removeEventListener("rl:structure", onSelect);
  }, []);

  const structure = STRUCTURES.find((entry) => entry.id === active)!;
  const foundation = resolved[structure.foundationModule];
  const price = priceText(foundation);

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next: number | null = null;
    if (event.key in keys) next = (index + keys[event.key] + STRUCTURES.length) % STRUCTURES.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = STRUCTURES.length - 1;
    if (next === null) return;
    event.preventDefault();
    const id = STRUCTURES[next].id;
    setActive(id);
    tabRefs.current[id]?.focus();
  };

  const toggleCompare = (id: StructureId) =>
    setCompare((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : current.length >= 3 ? current : [...current, id]));

  const choose = () => {
    launchStore.setStructure(structure.id);
    launchStore.setStep(2);
    goTo("builder");
  };

  return (
    <div>
      <div className="rl-explorer">
        <div role="tablist" aria-label="Business structures" aria-orientation="vertical" className="rl-tabs">
          {STRUCTURES.map((entry, index) => (
            <button
              key={entry.id}
              ref={(node) => {
                tabRefs.current[entry.id] = node;
              }}
              role="tab"
              id={`${baseId}-tab-${entry.id}`}
              aria-selected={entry.id === active}
              aria-controls={`${baseId}-panel`}
              tabIndex={entry.id === active ? 0 : -1}
              className="rl-tab"
              onClick={() => setActive(entry.id)}
              onKeyDown={(event) => onTabKey(event, index)}
            >
              <span className="rl-tab__glyph">
                <StructureGlyph id={entry.id} size={40} />
              </span>
              <span>
                <strong>{entry.name}</strong>
                <span>{entry.tagline}</span>
              </span>
            </button>
          ))}
        </div>

        <div key={structure.id} id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${structure.id}`} className="rl-panel">
          <div className="rl-panel__top">
            <div>
              <span className="rl-eyebrow">{structure.short}</span>
              <h3>{structure.name}</h3>
              <p className="rl-lede" style={{ fontSize: 16 }}>
                {structure.summary}
              </p>
              <p style={{ margin: "16px 0 0", fontSize: 14, fontWeight: 600 }}>Often suits</p>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "var(--rl-body)", fontSize: 15, lineHeight: 1.7 }}>
                {structure.suits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rl-panel__diagram">
              <StructureGlyph id={structure.id} size={170} title={`Ownership diagram for a ${structure.name}`} />
            </div>
          </div>

          <dl className="rl-facts">
            <div>
              <dt>Ownership</dt>
              <dd>{structure.ownership}</dd>
            </div>
            <div>
              <dt>Liability</dt>
              <dd>{structure.liability}</dd>
            </div>
            <div>
              <dt>
                Compliance{" "}
                <span className="rl-meter" aria-hidden="true">
                  {[1, 2, 3].map((level) => (
                    <i key={level} className={level <= structure.complianceLevel ? "on" : undefined} />
                  ))}
                </span>
              </dt>
              <dd>{structure.compliance}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>{structure.tax}</dd>
            </div>
            <div>
              <dt>Registration</dt>
              <dd>{structure.registration}</dd>
            </div>
            <div>
              <dt>Setup with RNOS</dt>
              <dd>
                <span className={`rl-tag rl-tag--${foundation.availability === "checkout" ? "checkout" : foundation.availability === "listed" ? "optional" : "enquiry"}`}>
                  {AVAILABILITY_LABEL[foundation.availability]}
                </span>{" "}
                {price ? (
                  <>
                    <span className="rl-price">{price}</span> service fee{foundation.timeline ? ` · ${foundation.timeline}` : ""}
                  </>
                ) : (
                  "We confirm scope and cost when you ask."
                )}
              </dd>
            </div>
          </dl>

          <div className="rl-panel__foot">
            <button type="button" className="rl-btn rl-btn--blue" onClick={choose}>
              Build with a {structure.short}
              <ArrowRight className="rl-arrow" aria-hidden="true" />
            </button>
            {foundation.href ? (
              <a className="rl-link" href={foundation.href}>
                Service details
              </a>
            ) : null}
            <label className="rl-check" style={{ marginLeft: "auto" }}>
              <input
                type="checkbox"
                checked={compare.includes(structure.id)}
                disabled={!compare.includes(structure.id) && compare.length >= 3}
                onChange={() => toggleCompare(structure.id)}
              />
              Compare {compare.length ? `(${compare.length}/3)` : ""}
            </label>
          </div>
        </div>
      </div>

      {compare.length ? (
        <section className="rl-compare-tray" aria-label="Structures you are comparing">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
            <strong>
              Comparing {compare.length} structure{compare.length > 1 ? "s" : ""}
              {compare.length < 2 ? <span className="rl-fine"> · pick one more from the list above</span> : null}
            </strong>
            <button type="button" className="rl-btn rl-btn--ghost rl-btn--sm" onClick={() => setCompare([])}>
              Clear
            </button>
          </div>
          <div className="rl-compare-grid" style={{ "--cols": compare.length } as React.CSSProperties}>
            {compare.map((id) => {
              const entry = STRUCTURES.find((item) => item.id === id)!;
              return (
                <div key={id} className="rl-compare-col">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                    <h4>{entry.name}</h4>
                    <button
                      type="button"
                      className="rl-icon-btn"
                      style={{ width: 36, height: 36, borderColor: "var(--rl-night-line)", color: "#fff" }}
                      aria-label={`Remove ${entry.name} from comparison`}
                      onClick={() => toggleCompare(id)}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </div>
                  <dl>
                    {COMPARE_ROWS.map((row) => (
                      <div key={row.key}>
                        <dt>{row.label}</dt>
                        <dd>{entry[row.key]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <p className="rl-fine" style={{ marginTop: 20, maxWidth: "80ch" }}>
        A general overview under the Companies Act 2013, the LLP Act 2008 and the Indian Partnership Act 1932. The right structure
        depends on your circumstances, and rules change; this is not legal or tax advice. Consider speaking to a chartered accountant
        or company secretary before you decide.
      </p>
    </div>
  );
}
