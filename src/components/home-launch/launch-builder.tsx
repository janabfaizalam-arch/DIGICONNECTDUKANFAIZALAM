"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Lock, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";

import { BlueprintStack, StructureGlyph, type BlueprintLayer, type Tone } from "@/components/home-launch/art";
import { EnquiryForm } from "@/components/home-launch/enquiry-form";
import { AVAILABILITY_LABEL, formatINR, priceText } from "@/components/home-launch/format";
import { launchStore, useLaunchState } from "@/components/home-launch/launch-store";
import {
  BUSINESS_TYPES,
  LAUNCH_MODULES,
  MODULE_GROUPS,
  STRUCTURES,
  businessTypeById,
  moduleApplicability,
  structureById,
  summariseSelection,
  type LaunchModule,
  type ModuleGroup,
  type ModuleId,
  type ModuleNature,
  type ResolvedModule,
} from "@/lib/homepage/launch-catalog";

const STEPS = ["Your business", "Structure", "Services", "Configure", "Review"];

export const NATURE_LABEL: Record<ModuleNature, string> = {
  foundation: "Core",
  conditional: "Conditional",
  optional: "Optional",
  recurring: "Recurring",
};

const STACK: { group: ModuleGroup[]; label: string; tone: Tone }[] = [
  { group: ["foundation"], label: "ENTITY", tone: "blue" },
  { group: ["tax"], label: "TAX · REGISTRATIONS", tone: "cyan" },
  { group: ["licence"], label: "LICENCES", tone: "orange" },
  { group: ["ip", "digital"], label: "BRAND · DIGITAL", tone: "violet" },
  { group: ["finance"], label: "BOOKS · COMPLIANCE", tone: "cyan" },
];

/** The setup as a blueprint: each group lights up once something in it is chosen. */
export function stackFor(modules: ModuleId[]): BlueprintLayer[] {
  const groups = new Set(modules.map((id) => LAUNCH_MODULES.find((mod) => mod.id === id)?.group));
  return STACK.map((layer) => ({ key: layer.label, label: layer.label, tone: layer.tone, lit: layer.group.some((group) => groups.has(group)) }));
}

/** The order the apply flow will see, as its own wizard draft. */
const DRAFT_KEY = "customer_wizard_draft";

export function LaunchBuilder({ resolved }: { resolved: Record<ModuleId, ResolvedModule> }) {
  const state = useLaunchState();
  const [hydrated, setHydrated] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => setHydrated(true), []);

  // Move focus to the step heading when the step changes, not on first paint.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [state.step]);

  const structure = structureById(state.structure);
  const business = businessTypeById(state.business);
  const summary = useMemo(() => summariseSelection(state.modules, resolved), [state.modules, resolved]);

  const canReach = (step: number) => step <= 0 || (step === 1 ? Boolean(state.business) : Boolean(state.business && state.structure));
  const step = canReach(state.step) ? state.step : 0;

  const goStep = (next: number) => {
    if (!canReach(next)) return;
    launchStore.setStep(next);
    document.getElementById("builder-top")?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const checkout = () => {
    const cart = summary.online.map((line) => ({ slug: line.resolved.slug!, quantity: 1 }));
    if (!cart.length) return;
    try {
      // The apply flow restores exactly this shape when opened with ?resume=true,
      // and /api/create-order prices it again on the server before payment.
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ cart, currentStep: 1 }));
    } catch {
      // Without storage the visitor still lands on the apply flow and picks again.
    }
    window.location.assign("/apply?resume=true");
  };

  const enquirySummary = [
    business ? `Business: ${business.label}` : null,
    structure ? `Structure: ${structure.name}` : null,
    summary.quoted.length ? `Quote for: ${summary.quoted.map((line) => line.mod.label).join(", ")}` : null,
    summary.online.length ? `Also selected (online): ${summary.online.map((line) => line.mod.label).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="rl-builder" id="builder-top" style={{ scrollMarginTop: 90 }}>
      <div>
        <ol className="rl-steps" aria-label="Builder steps">
          {STEPS.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                aria-current={index === step ? "step" : undefined}
                data-done={index < step ? "true" : undefined}
                disabled={!canReach(index)}
                onClick={() => goStep(index)}
              >
                <b>{index < step ? <Check size={14} aria-hidden="true" /> : index + 1}</b>
                {label}
              </button>
            </li>
          ))}
        </ol>

        <div className="rl-card-night">
          {step === 0 ? (
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend>
                <h3 ref={headingRef} tabIndex={-1} className="rl-step-title">
                  What kind of business are you starting?
                </h3>
              </legend>
              <p className="rl-fine" style={{ marginTop: 8 }}>
                This only shapes which registrations we point out. It never removes a choice.
              </p>
              <div className="rl-options">
                {BUSINESS_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className="rl-option"
                    aria-pressed={state.business === type.id}
                    onClick={() => {
                      launchStore.setBusiness(type.id);
                    }}
                  >
                    <span className="rl-tick" aria-hidden="true">
                      {state.business === type.id ? <Check size={14} /> : null}
                    </span>
                    <strong>{type.label}</strong>
                    <span>{type.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {step === 1 ? (
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend>
                <h3 ref={headingRef} tabIndex={-1} className="rl-step-title">
                  Choose a business structure
                </h3>
              </legend>
              <p className="rl-fine" style={{ marginTop: 8 }}>
                Not sure? <a className="rl-link" href="#compare">Compare all five</a> first — you can change this at any time.
              </p>
              <div className="rl-options">
                {STRUCTURES.map((entry) => {
                  const foundation = resolved[entry.foundationModule];
                  const price = priceText(foundation);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className="rl-option"
                      aria-pressed={state.structure === entry.id}
                      onClick={() => launchStore.setStructure(entry.id)}
                      style={{ minHeight: 140 }}
                    >
                      <span className="rl-tick" aria-hidden="true">
                        {state.structure === entry.id ? <Check size={14} /> : null}
                      </span>
                      <StructureGlyph id={entry.id} size={38} />
                      <strong>{entry.name}</strong>
                      <span>{entry.tagline}</span>
                      <span style={{ color: "#e3eafa", marginTop: "auto" }}>
                        {price ? `${price} service fee` : AVAILABILITY_LABEL[foundation.availability]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {step === 2 ? (
            <div>
              <h3 ref={headingRef} tabIndex={-1} className="rl-step-title">
                Add the services you need
              </h3>
              <p className="rl-fine" style={{ marginTop: 8 }}>
                Nothing here is required by default. <strong style={{ color: "#fff" }}>Conditional</strong> means the law requires it only in some
                situations — the note under each explains when.
              </p>
              {(Object.keys(MODULE_GROUPS) as ModuleGroup[]).map((group) => {
                const modules = LAUNCH_MODULES.filter(
                  (mod) => mod.group === group && (mod.nature !== "foundation" || mod.id === structure?.foundationModule),
                );
                if (!modules.length) return null;
                return (
                  <section key={group} className="rl-modgroup" aria-label={MODULE_GROUPS[group].label}>
                    <h4>
                      {MODULE_GROUPS[group].label} <span>{MODULE_GROUPS[group].blurb}</span>
                    </h4>
                    <ul className="rl-modlist">
                      {modules.map((mod) => (
                        <li key={mod.id}>
                          <ModuleToggle
                            mod={mod}
                            resolved={resolved[mod.id]}
                            checked={state.modules.includes(mod.id)}
                            locked={mod.nature === "foundation"}
                            applicability={moduleApplicability(mod, state.structure)}
                            hint={business?.relevant[mod.id]}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <h3 ref={headingRef} tabIndex={-1} className="rl-step-title">
                Configure your setup
              </h3>
              <p className="rl-fine" style={{ marginTop: 8 }}>
                Remove anything you don&apos;t need. Prices are the service fees our checkout charges; government fees are explained per item.
              </p>
              <ul className="rl-lines" style={{ borderColor: "var(--rl-night-line)" }}>
                {summary.lines.map(({ mod, resolved: entry }) => (
                  <li key={mod.id} style={{ borderColor: "var(--rl-night-line)", color: "#fff", alignItems: "center" }}>
                    <span>
                      <strong style={{ fontWeight: 650 }}>{mod.label}</strong>
                      <small style={{ color: "#a9b9da" }}>
                        {NATURE_LABEL[mod.nature]} · {mod.governmentFee}
                        {entry.timeline ? ` · Usually ${entry.timeline}` : ""}
                      </small>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
                      {priceText(entry) && entry.availability === "checkout" ? (
                        <span className="rl-price">{priceText(entry)}</span>
                      ) : (
                        <em style={{ color: "#a9b9da", fontStyle: "normal", fontSize: 12.5 }}>Quoted</em>
                      )}
                      {mod.nature === "foundation" ? (
                        <Lock size={16} aria-label="Part of your structure" />
                      ) : (
                        <button
                          type="button"
                          className="rl-icon-btn"
                          style={{ width: 40, height: 40, borderColor: "var(--rl-night-line)", color: "#fff" }}
                          aria-label={`Remove ${mod.label}`}
                          onClick={() => launchStore.toggle(mod.id)}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <NotIncluded selected={state.modules} relevant={business?.relevant ?? {}} structure={state.structure} />
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <h3 ref={headingRef} tabIndex={-1} className="rl-step-title">
                Review and continue
              </h3>
              <dl className="rl-facts" style={{ marginTop: 18, borderColor: "var(--rl-night-line)" }}>
                <ReviewRow label="Business">{business?.label ?? "—"}</ReviewRow>
                <ReviewRow label="Structure">{structure?.name ?? "—"}</ReviewRow>
                <ReviewRow label="Pay online now">
                  {summary.online.length
                    ? `${summary.online.length} service${summary.online.length > 1 ? "s" : ""} · ${formatINR(summary.onlineTotal)} in service fees`
                    : "None of your choices can be bought online yet"}
                </ReviewRow>
                <ReviewRow label="Quoted on request">
                  {summary.quoted.length ? summary.quoted.map((line) => line.mod.label).join(", ") : "Nothing"}
                </ReviewRow>
                <ReviewRow label="Government fees">
                  {summary.governmentExtra.length
                    ? `Payable separately for ${summary.governmentExtra.map((line) => line.mod.label).join(", ")}, as the authority sets them.`
                    : "Where they apply, paid to the authority and confirmed for your case. See each item's note."}
                </ReviewRow>
                <ReviewRow label="Taxes">Any tax on our fees is shown at checkout and on your invoice.</ReviewRow>
              </dl>

              <h4 style={{ margin: "24px 0 8px", fontSize: 15 }}>What happens next</h4>
              <ol style={{ margin: 0, paddingLeft: 20, color: "var(--rl-night-text)", fontSize: 14.5, lineHeight: 1.8 }}>
                {summary.online.length ? <li>Checkout opens with your online services in the basket. Sign in if asked, then add your details.</li> : null}
                {summary.online.length ? <li>Our server prices the order and you pay securely through Razorpay.</li> : null}
                <li>Upload documents in the application; the team reviews them before anything is filed.</li>
                {summary.quoted.length ? <li>For quoted items, we call you to confirm scope and cost before any work starts.</li> : null}
                <li>Approvals are decided by the relevant authority. Track progress from your dashboard.</li>
              </ol>

              <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
                {summary.online.length ? (
                  <div>
                    <button type="button" className="rl-btn rl-btn--launch" onClick={checkout}>
                      <ShieldCheck aria-hidden="true" />
                      Continue to secure checkout
                    </button>
                    <p className="rl-fine" style={{ marginTop: 8 }}>
                      Takes {summary.online.map((line) => line.mod.label).join(", ")} to checkout.
                    </p>
                  </div>
                ) : null}
                {summary.quoted.length || !summary.online.length ? (
                  <div style={{ padding: 18, borderRadius: 16, background: "var(--rl-paper)", color: "var(--rl-ink)" }}>
                    <strong style={{ display: "block", marginBottom: 10 }}>
                      {summary.online.length ? "Get a quote for the rest" : "Get a quote for your setup"}
                    </strong>
                    <EnquiryForm service={`Company launch${structure ? ` — ${structure.name}` : ""}`} summary={enquirySummary} />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="rl-step-nav">
            {step > 0 ? (
              <button type="button" className="rl-btn rl-btn--ghost rl-btn--sm" onClick={() => goStep(step - 1)}>
                <ArrowLeft aria-hidden="true" />
                Back
              </button>
            ) : (
              <span />
            )}
            {step < 4 ? (
              <button type="button" className="rl-btn rl-btn--blue" disabled={!canReach(step + 1)} onClick={() => goStep(step + 1)}>
                {step === 0 && !state.business ? "Choose one to continue" : step === 1 && !state.structure ? "Choose a structure" : "Continue"}
                <ArrowRight className="rl-arrow" aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className="rl-btn rl-btn--ghost rl-btn--sm" onClick={() => launchStore.reset()}>
                <RotateCcw aria-hidden="true" />
                Start over
              </button>
            )}
          </div>
        </div>
      </div>

      <aside className="rl-summary" aria-label="Your setup">
        <div className="rl-summary__visual">
          <BlueprintStack
            layers={stackFor(hydrated ? state.modules : [])}
            width={380}
            height={180}
            cx={190}
            base={150}
            w={56}
            t={9}
            gap={20}
            labels={false}
            idea={false}
          />
        </div>
        <div className="rl-summary__body">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <strong style={{ fontSize: 17 }}>Your setup</strong>
            <span className="rl-fine">{structure ? structure.short : "No structure yet"}</span>
          </div>
          {hydrated && summary.lines.length ? (
            <ul className="rl-lines" aria-live="polite">
              {summary.lines.map(({ mod, resolved: entry }) => (
                <li key={mod.id}>
                  <span>
                    {mod.label}
                    <small>
                      {NATURE_LABEL[mod.nature]}
                      {entry.timeline ? ` · ${entry.timeline}` : ""}
                    </small>
                  </span>
                  {entry.availability === "checkout" && entry.fee ? <span className="rl-price">{formatINR(entry.fee)}</span> : <em>Quoted</em>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rl-fine" style={{ marginTop: 12 }}>
              Choose a business and a structure, then add services. Each one appears here with its price as checkout charges it.
            </p>
          )}
          <div className="rl-total">
            <span>
              Online service fees
              <br />
              {summary.quoted.length ? `+ ${summary.quoted.length} quoted on request` : "Government fees extra where they apply"}
            </span>
            <strong className="rl-price" aria-live="polite">
              {formatINR(hydrated ? summary.onlineTotal : 0)}
            </strong>
          </div>
          <p className="rl-fine" style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <ShieldCheck size={16} style={{ flex: "none", marginTop: 2 }} aria-hidden="true" />
            Prices come from our live catalogue. The amount you pay is calculated again on our server at checkout.
          </p>
          {step < 4 && hydrated && state.structure ? (
            <button type="button" className="rl-btn rl-btn--ghost rl-btn--sm" style={{ marginTop: 12, width: "100%" }} onClick={() => goStep(4)}>
              Review setup
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderColor: "var(--rl-night-line)" }}>
      <dt style={{ color: "#8fa2c8" }}>{label}</dt>
      <dd style={{ color: "#e3eafa" }}>{children}</dd>
    </div>
  );
}

function ModuleToggle({
  mod,
  resolved,
  checked,
  locked,
  applicability,
  hint,
}: {
  mod: LaunchModule;
  resolved: ResolvedModule;
  checked: boolean;
  locked: boolean;
  applicability: { ok: true } | { ok: false; reason: string };
  hint?: string;
}) {
  const price = priceText(resolved);
  const disabled = locked || !applicability.ok;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked || locked}
      aria-disabled={disabled}
      disabled={!applicability.ok}
      className="rl-mod"
      onClick={() => {
        if (!disabled) launchStore.toggle(mod.id);
      }}
    >
      <span className="rl-tick" aria-hidden="true">
        {locked ? <Lock size={13} /> : checked ? <Check size={14} /> : null}
      </span>
      <span>
        <strong>{mod.label}</strong>
        <span className="rl-mod__desc">{applicability.ok ? mod.condition ?? mod.summary : applicability.reason}</span>
        {hint && applicability.ok ? (
          <span className="rl-hint">
            <AlertCircle size={14} style={{ flex: "none", marginTop: 1 }} aria-hidden="true" />
            {hint}
          </span>
        ) : null}
        <span className="rl-mod__meta">
          <span className={`rl-tag rl-tag--${mod.nature}`}>{NATURE_LABEL[mod.nature]}</span>
          <span className={`rl-tag rl-tag--${resolved.availability === "checkout" ? "checkout" : "enquiry"}`}>
            {AVAILABILITY_LABEL[resolved.availability]}
          </span>
          {price ? <span className="rl-mod__price rl-price">{price}</span> : null}
        </span>
      </span>
    </button>
  );
}

function NotIncluded({
  selected,
  relevant,
  structure,
}: {
  selected: ModuleId[];
  relevant: Partial<Record<ModuleId, string>>;
  structure: ReturnType<typeof useLaunchState>["structure"];
}) {
  const missing = LAUNCH_MODULES.filter(
    (mod) => mod.nature !== "foundation" && !selected.includes(mod.id) && moduleApplicability(mod, structure).ok,
  );
  const worthALook = missing.filter((mod) => relevant[mod.id] || mod.nature === "conditional" || mod.nature === "recurring");
  if (!worthALook.length) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <h4 style={{ margin: "0 0 4px", fontSize: 15 }}>Not in your setup</h4>
      <p className="rl-fine" style={{ margin: "0 0 10px" }}>
        Excluded unless you add them. Conditional and recurring items may still apply to you later.
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 8 }}>
        {worthALook.map((mod) => (
          <li key={mod.id}>
            <button type="button" className="rl-btn rl-btn--ghost rl-btn--sm" onClick={() => launchStore.add(mod.id)}>
              + {mod.label}
              <span className="rl-sr"> ({NATURE_LABEL[mod.nature]})</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
