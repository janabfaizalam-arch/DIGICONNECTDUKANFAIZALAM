"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Settings2, ShieldCheck } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { PAPER_SIZES, PHOTO_SIZES } from "@/lib/print/sheet-layout";
import {
  ASK_LABELS,
  FILTER_LABELS,
  FINISH_LABELS,
  QUALITY_LABELS,
  QUANTITY_CHOICES,
  SMART_PRINT_SERVICES,
  optionalAsks,
  settingsFor,
  type PartnerDefaults,
  type SmartPrintAsk,
  type SmartPrintService,
  type SmartPrintSettings as Settings,
} from "@/lib/print/smart-print";
import { cn } from "@/lib/utils";

/**
 * What this shop sells, before a customer touches anything.
 *
 * Two decisions live here, and the second is the important one.
 *
 * The first is the defaults: a counter that always sells eight passport photos
 * on matte paper should say so once, here, rather than have every customer
 * arrive at twelve on glossy and change it.
 *
 * The second is which questions a customer is asked at all. Most of them
 * should not be: somebody printing an Aadhaar copy has no opinion about paper
 * finish and no way to form one, and handing them the menu makes the order
 * slower and the wrong answer more likely. So every service asks its own short
 * list, and everything else stays switched off until this shop turns it on.
 */

export function SmartPrintSettingsCard({
  initialDefaults,
  initialRequireApproval,
}: {
  initialDefaults: PartnerDefaults;
  initialRequireApproval: boolean;
}) {
  const { success, error } = useToast();
  const [defaults, setDefaults] = useState<PartnerDefaults>(initialDefaults ?? {});
  const [requireApproval, setRequireApproval] = useState(initialRequireApproval);
  const [saving, setSaving] = useState(false);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const response = await fetch("/api/ap/print-station", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Could not save.");
      success("Saved.");
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const write = (serviceId: string, patch: Partial<Settings> & { allow?: SmartPrintAsk[] }) => {
    const merged = { ...(defaults[serviceId] ?? {}), ...patch };
    setDefaults({ ...defaults, [serviceId]: merged });
    void save({ smartPrintDefaults: { [serviceId]: merged } });
  };

  const toggleAsk = (service: SmartPrintService, ask: SmartPrintAsk) => {
    const current = new Set(defaults[service.id]?.allow ?? []);
    if (current.has(ask)) current.delete(ask);
    else current.add(ask);
    write(service.id, { allow: [...current] });
  };

  return (
    <div className="lg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Settings2 className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">Smart Print settings</h3>
          <p className="mt-0.5 text-[12px] font-medium leading-snug text-[var(--dc-body)]">
            Customer ka screen inhi se khulta hai. Jo option aap on nahi karenge, wo use dikhega hi nahi.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {SMART_PRINT_SERVICES.map((service) => {
          const current = settingsFor(service, defaults);
          const allowed = new Set(defaults[service.id]?.allow ?? []);
          const optional = optionalAsks(service);

          return (
            <section key={service.id} className="rounded-2xl border border-[rgba(15,32,73,.1)] p-3.5">
              <p className="text-[12.5px] font-extrabold text-[var(--dc-ink)]">{service.label}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-[var(--dc-body)]">Aapki dukaan ki default setting</p>

              <div className="mt-2.5 space-y-2.5">
                {service.asks.map((ask) => (
                  <Field key={ask} ask={ask} settings={current} onChange={(patch) => write(service.id, patch)} />
                ))}
              </div>

              {optional.length ? (
                <div className="mt-3.5 rounded-xl bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-[var(--dc-ink)]">
                    <Eye className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                    Customer ye khud badal sake
                  </p>
                  <p className="mt-0.5 text-[10.5px] font-semibold leading-snug text-[var(--dc-body)]">
                    Band rahe to upar wali setting hi chalegi aur customer ko option dikhega nahi.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {optional.map((ask) => {
                      const on = allowed.has(ask);
                      return (
                        <button
                          key={ask}
                          type="button"
                          onClick={() => toggleAsk(service, ask)}
                          aria-pressed={on}
                          className={cn(
                            "inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-2.5 text-[11.5px] font-bold transition active:scale-95",
                            on
                              ? "border-[var(--dc-blue-deep)] bg-[var(--dc-blue-deep)] text-white"
                              : "border-[rgba(15,32,73,.12)] bg-white text-[var(--dc-body)]",
                          )}
                        >
                          {on ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
                          {ASK_LABELS[ask]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {/*
        The shop's own brake.

        A counter that wants to look at every job before paper moves — a photo
        studio, or a shop whose printer jams on heavy paper — turns this on.
        Off is how it has always worked: paid, then printed.
      */}
      <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[rgba(15,32,73,.1)] p-3.5">
        <input
          type="checkbox"
          checked={requireApproval}
          onChange={(event) => {
            setRequireApproval(event.target.checked);
            void save({ requireApproval: event.target.checked });
          }}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--dc-blue-deep)]"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-[var(--dc-ink)]">
            <ShieldCheck className="h-4 w-4 text-slate-400" aria-hidden />
            Print se pehle main dekhunga
          </span>
          <span className="mt-0.5 block text-[11.5px] font-medium leading-snug text-[var(--dc-body)]">
            Paid job printer par jane se pehle yahan rukega. Band rahe to seedha print hota hai.
          </span>
        </span>
      </label>

      {saving ? (
        <p className="mt-2.5 flex items-center gap-2 text-[11.5px] font-semibold text-[var(--dc-body)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Saving…
        </p>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   One row per question
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The same question, rendered once.
 *
 * The customer's screen and this one used to spell out each choice separately,
 * which is how they drifted: the shop set "matte" from a list of three and the
 * counter offered four. Both now read their options from the same catalogue.
 */
function Field({
  ask,
  settings,
  onChange,
}: {
  ask: SmartPrintAsk;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const label = ASK_LABELS[ask];

  switch (ask) {
    case "photoSize":
      return (
        <Row label={label}>
          {Object.values(PHOTO_SIZES).map((size) => (
            <Pill
              key={size.id}
              active={settings.photoSize === size.id}
              onClick={() => onChange({ photoSize: size.id })}
            >
              {size.label}
            </Pill>
          ))}
        </Row>
      );

    case "photoCount":
      return (
        <Row label={label}>
          {QUANTITY_CHOICES.photoCount.map((count) => (
            <Pill key={count} active={settings.photoCount === count} onClick={() => onChange({ photoCount: count })}>
              {count}
            </Pill>
          ))}
        </Row>
      );

    case "copies":
      return (
        <Row label={label}>
          {QUANTITY_CHOICES.copies.map((count) => (
            <Pill key={count} active={settings.copies === count} onClick={() => onChange({ copies: count })}>
              {count}
            </Pill>
          ))}
        </Row>
      );

    case "paper":
      return (
        <Row label={label}>
          {Object.values(PAPER_SIZES)
            .filter((paper) => !paper.photo)
            .map((paper) => (
              <Pill key={paper.id} active={settings.paper === paper.id} onClick={() => onChange({ paper: paper.id })}>
                {paper.label}
              </Pill>
            ))}
        </Row>
      );

    case "color":
      return (
        <Row label={label}>
          <Pill active={settings.color === "mono"} onClick={() => onChange({ color: "mono" })}>
            Black & white
          </Pill>
          <Pill active={settings.color === "color"} onClick={() => onChange({ color: "color" })}>
            Colour
          </Pill>
        </Row>
      );

    case "finish":
      return (
        <Row label={label}>
          {Object.entries(FINISH_LABELS).map(([value, text]) => (
            <Pill
              key={value}
              active={settings.finish === value}
              onClick={() => onChange({ finish: value as Settings["finish"] })}
            >
              {text}
            </Pill>
          ))}
        </Row>
      );

    case "quality":
      return (
        <Row label={label}>
          {Object.entries(QUALITY_LABELS).map(([value, text]) => (
            <Pill
              key={value}
              active={settings.quality === value}
              onClick={() => onChange({ quality: value as Settings["quality"] })}
            >
              {text}
            </Pill>
          ))}
        </Row>
      );

    case "arrangement":
      return (
        <Row label={label}>
          {[
            { value: "stacked", text: "Ek ke neeche ek" },
            { value: "side-by-side", text: "Aas-paas" },
            { value: "actual-size", text: "Card size" },
          ].map((option) => (
            <Pill
              key={option.value}
              active={settings.arrangement === option.value}
              onClick={() => onChange({ arrangement: option.value as Settings["arrangement"] })}
            >
              {option.text}
            </Pill>
          ))}
        </Row>
      );

    case "backdrop":
      // The customer's own choice on their own photo. A shop default here
      // would mean deciding, in advance, to change every customer's picture.
      return null;

    case "filter":
      return (
        <Row label={label}>
          {Object.entries(FILTER_LABELS).map(([value, text]) => (
            <Pill
              key={value}
              active={(settings.filter ?? "none") === value}
              onClick={() => onChange({ filter: value as Settings["filter"] })}
            >
              {text}
            </Pill>
          ))}
        </Row>
      );

    case "cutBorder":
      return (
        <Row label={label}>
          <Pill active={Boolean(settings.cutBorder)} onClick={() => onChange({ cutBorder: true })}>
            Haan
          </Pill>
          <Pill active={!settings.cutBorder} onClick={() => onChange({ cutBorder: false })}>
            Nahi
          </Pill>
        </Row>
      );

    default:
      return null;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11.5px] font-bold text-[var(--dc-body)]">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-[38px] rounded-xl border px-3 text-[12px] font-bold transition active:scale-95",
        active
          ? "border-[var(--dc-blue-deep)] bg-[var(--dc-blue-deep)] text-white"
          : "border-[rgba(15,32,73,.12)] bg-white text-[var(--dc-ink)] hover:border-slate-300",
      )}
    >
      {children}
    </button>
  );
}
