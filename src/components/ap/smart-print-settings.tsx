"use client";

import { useState } from "react";
import { Loader2, Settings2, ShieldCheck } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { PHOTO_SIZES } from "@/lib/print/sheet-layout";
import {
  FINISH_LABELS,
  QUALITY_LABELS,
  QUANTITY_CHOICES,
  SMART_PRINT_SERVICES,
  settingsFor,
  type SmartPrintSettings as Settings,
} from "@/lib/print/smart-print";
import { cn } from "@/lib/utils";

/**
 * What this shop sells, before a customer touches anything.
 *
 * A counter that always sells eight passport photos on matte paper should say
 * that once, here — not have every customer arrive at twelve on glossy and
 * change it, and not have the person behind the desk explain it. These
 * defaults are what the customer's screen opens with; they can still change
 * them, which is the point of a default rather than a rule.
 *
 * Only the three services with real choices are here. Adding the other seven
 * would make this the settings dialog the customer's page was designed not to
 * be.
 */

const EDITABLE = ["passport_photo", "id_copy", "document"] as const;

export function SmartPrintSettingsCard({
  initialDefaults,
  initialRequireApproval,
}: {
  initialDefaults: Record<string, Partial<Settings>>;
  initialRequireApproval: boolean;
}) {
  const { success, error } = useToast();
  const [defaults, setDefaults] = useState(initialDefaults);
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

  const set = (serviceId: string, patch: Partial<Settings>) => {
    const next = { ...defaults, [serviceId]: { ...(defaults[serviceId] ?? {}), ...patch } };
    setDefaults(next);
    void save({ smartPrintDefaults: { [serviceId]: next[serviceId] } });
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
            Customer ka screen inhi se khulta hai. Wo badal sakta hai — ye sirf shuruaat hai.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {EDITABLE.map((serviceId) => {
          const service = SMART_PRINT_SERVICES.find((item) => item.id === serviceId);
          if (!service) return null;
          const current = settingsFor(service, defaults);

          return (
            <section key={serviceId} className="rounded-2xl border border-[rgba(15,32,73,.1)] p-3.5">
              <p className="text-[12.5px] font-extrabold text-[var(--dc-ink)]">{service.label}</p>

              <div className="mt-2.5 space-y-2.5">
                {serviceId === "passport_photo" ? (
                  <>
                    <Row label="Photo size">
                      {Object.values(PHOTO_SIZES).map((size) => (
                        <Pill
                          key={size.id}
                          active={current.photoSize === size.id}
                          onClick={() => set(serviceId, { photoSize: size.id })}
                        >
                          {size.id.replace("x", " × ")}
                        </Pill>
                      ))}
                    </Row>
                    <Row label="Kitni photo">
                      {QUANTITY_CHOICES.photoCount.map((count) => (
                        <Pill
                          key={count}
                          active={current.photoCount === count}
                          onClick={() => set(serviceId, { photoCount: count })}
                        >
                          {count}
                        </Pill>
                      ))}
                    </Row>
                    <Row label="Paper">
                      {Object.entries(FINISH_LABELS).map(([value, label]) => (
                        <Pill
                          key={value}
                          active={current.finish === value}
                          onClick={() => set(serviceId, { finish: value as Settings["finish"] })}
                        >
                          {label}
                        </Pill>
                      ))}
                    </Row>
                    <Row label="Quality">
                      {Object.entries(QUALITY_LABELS).map(([value, label]) => (
                        <Pill
                          key={value}
                          active={current.quality === value}
                          onClick={() => set(serviceId, { quality: value as Settings["quality"] })}
                        >
                          {label}
                        </Pill>
                      ))}
                    </Row>
                  </>
                ) : null}

                {serviceId === "id_copy" ? (
                  <>
                    <Row label="Front aur back">
                      {[
                        { value: "stacked", label: "Ek ke neeche ek" },
                        { value: "side-by-side", label: "Aas-paas" },
                        { value: "actual-size", label: "Card size" },
                      ].map((option) => (
                        <Pill
                          key={option.value}
                          active={current.arrangement === option.value}
                          onClick={() => set(serviceId, { arrangement: option.value as Settings["arrangement"] })}
                        >
                          {option.label}
                        </Pill>
                      ))}
                    </Row>
                    <Row label="Rang">
                      <Pill active={current.color === "mono"} onClick={() => set(serviceId, { color: "mono" })}>
                        Black & white
                      </Pill>
                      <Pill active={current.color === "color"} onClick={() => set(serviceId, { color: "color" })}>
                        Colour
                      </Pill>
                    </Row>
                  </>
                ) : null}

                {serviceId === "document" ? (
                  <>
                    <Row label="Rang">
                      <Pill active={current.color === "mono"} onClick={() => set(serviceId, { color: "mono" })}>
                        Black & white
                      </Pill>
                      <Pill active={current.color === "color"} onClick={() => set(serviceId, { color: "color" })}>
                        Colour
                      </Pill>
                    </Row>
                    <Row label="Sides">
                      <Pill active={!current.duplex} onClick={() => set(serviceId, { duplex: false })}>
                        Single side
                      </Pill>
                      <Pill active={Boolean(current.duplex)} onClick={() => set(serviceId, { duplex: true })}>
                        Both sides
                      </Pill>
                    </Row>
                  </>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      {/*
        The shop's own brake.

        A counter that wants to look at every job before paper moves — a
        photo studio, or a shop whose printer jams on heavy paper — turns this
        on. Off is how it has always worked: paid, then printed.
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
