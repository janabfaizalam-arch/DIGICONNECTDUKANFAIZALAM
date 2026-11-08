"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

import {
  AdminButton,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/primitives/controls-ui";
import { AdminCard } from "@/components/admin/primitives/layout";
import { STATUS_TONE_CLASS } from "@/lib/admin/status-tone";
import { CONSTITUTIONS, formatAmount } from "@/lib/balance-sheets/engine";
import {
  AREA_OPTIONS,
  CATEGORY_OPTIONS,
  SCHEME_OPTIONS,
  SECTOR_OPTIONS,
} from "@/lib/balance-sheets/schemes";
import {
  draftNarrative,
  emptyPromoter,
  NARRATIVE_TITLES,
} from "@/lib/project-reports/defaults";
import {
  ASSET_KINDS,
  NARRATIVE_KEYS,
  buildDpr,
  defaultDepreciationRate,
  fyLabel,
  itemAmount,
  schemeFor,
  type AssetKind,
  type DprInput,
  type Promoter,
} from "@/lib/project-reports/engine";
import { sampleDpr } from "@/lib/project-reports/sample";
import { applyTemplate, TEMPLATES } from "@/lib/project-reports/templates";
import { cn } from "@/lib/utils";

/**
 * The admin's DPR form. The figures on the right are the same engine the
 * PDF uses, recalculated on every change, so what the admin sees is what
 * the bank will get.
 */

const rs = (value: number) => `Rs. ${formatAmount(value)}`;

/** A number box that keeps what is being typed and reports a number. */
function NumberBox({
  value,
  onChange,
  label,
  nullable = false,
  placeholder,
  className,
  suffix,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  nullable?: boolean;
  placeholder?: string;
  className?: string;
  suffix?: string;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => {
    const parsed =
      text.replace(/,/g, "").trim() === ""
        ? null
        : Number(text.replace(/,/g, ""));
    if (parsed !== value && !(parsed === null && value === 0 && !nullable))
      setText(value === null ? "" : String(value));
    // Only follow outside changes, never re-format while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={cn("relative", className)}>
      <AdminInput
        aria-label={label}
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const cleaned = next.replace(/,/g, "").trim();
          if (cleaned === "") onChange(nullable ? null : 0);
          else if (Number.isFinite(Number(cleaned))) onChange(Number(cleaned));
        }}
        className={cn("tabular-nums", suffix && "pr-10")}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ds-text-muted">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function Field({
  label,
  help,
  children,
  className,
}: {
  label: string;
  help?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block text-xs font-bold text-ds-text-secondary">
        {label}
      </span>
      {children}
      {help ? (
        <span className="block text-xs text-ds-text-muted">{help}</span>
      ) : null}
    </label>
  );
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <AdminCard>
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ds-primary text-xs font-bold text-ds-text-inverted">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-ds-text-primary">
            {title}
          </h2>
          {hint ? (
            <p className="mt-0.5 text-[13px] text-ds-text-muted">{hint}</p>
          ) : null}
          <div className="mt-4 space-y-4">{children}</div>
        </div>
      </div>
    </AdminCard>
  );
}

function RowButtons({
  onRemove,
  label,
}: {
  onRemove: () => void;
  label: string;
}) {
  return (
    <AdminButton
      type="button"
      variant="ghost"
      size="sm"
      iconOnly
      onClick={onRemove}
      aria-label={`${label} hatayein`}
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </AdminButton>
  );
}

function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <AdminButton type="button" variant="secondary" size="sm" onClick={onClick}>
      <Plus className="h-4 w-4" aria-hidden="true" /> {children}
    </AdminButton>
  );
}

export function ProjectReportForm({
  id,
  initial,
  initialStatus = "draft",
}: {
  id?: string;
  initial: DprInput;
  initialStatus?: "draft" | "final";
}) {
  const router = useRouter();
  const [input, setInput] = useState<DprInput>(initial);
  const [saving, setSaving] = useState<"draft" | "final" | null>(null);
  const [message, setMessage] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);

  const [quickTemplate, setQuickTemplate] = useState(
    initial.templateId ?? TEMPLATES[0].id,
  );
  const [quickCostLakh, setQuickCostLakh] = useState<number | null>(
    initial.templateId ? null : 10,
  );
  const [detailsOpen, setDetailsOpen] = useState(Boolean(id));

  const report = useMemo(() => buildDpr(input), [input]);
  const scheme = useMemo(
    () => (input.scheme === "none" ? null : schemeFor(input)),
    [input],
  );
  const drafts = useMemo(() => draftNarrative(input, report), [input, report]);

  const set = <K extends keyof DprInput>(key: K, value: DprInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));
  function updateAt<
    K extends
      | "promoters"
      | "capitalItems"
      | "products"
      | "rawMaterials"
      | "staff"
      | "overheads",
  >(key: K, index: number, patch: Partial<DprInput[K][number]>) {
    setInput((current) => ({
      ...current,
      [key]: (current[key] as DprInput[K][number][]).map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    }));
  }
  function removeAt<
    K extends
      | "promoters"
      | "capitalItems"
      | "products"
      | "rawMaterials"
      | "staff"
      | "overheads",
  >(key: K, index: number) {
    setInput((current) => ({
      ...current,
      [key]: (current[key] as unknown[]).filter((_, i) => i !== index),
    }));
  }

  async function save(status: "draft" | "final") {
    setSaving(status);
    setMessage(null);
    const response = await fetch(
      id ? `/api/admin/project-reports/${id}` : "/api/admin/project-reports",
      {
        method: id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, input }),
      },
    ).catch(() => null);
    const body = (await response?.json().catch(() => ({}))) as
      | { id?: string; message?: string }
      | undefined;
    setSaving(null);
    if (!response?.ok || !body?.id) {
      setMessage({
        tone: "danger",
        text: body?.message ?? "DPR save nahi ho payi. Dobara koshish karein.",
      });
      return;
    }
    setMessage({
      tone: "success",
      text:
        status === "final"
          ? "DPR final ho gayi. PDF download kar sakte hain."
          : "Draft save ho gaya.",
    });
    // A full load: a soft navigation after saving was occasionally aborted (see the balance sheet form).
    if (!id) window.location.assign(`/admin/project-reports/${body.id}`);
    else router.refresh();
  }

  const years = report.years.length;

  function buildQuick() {
    const lakh = quickCostLakh ?? report.cost.total / 100000;
    if (!(lakh > 0)) {
      setMessage({ tone: "danger", text: "Project cost (lakh mein) bhariye." });
      return;
    }
    setInput((current) =>
      applyTemplate(
        current,
        quickTemplate,
        lakh * 100000,
        (i) => buildDpr(i).cost.total,
      ),
    );
    setMessage({
      tone: "success",
      text: "DPR taiyaar: machinery, products, raw material, staff, kharche aur poora text bhar diya gaya. Neeche badal sakte hain.",
    });
  }
  const lead = input.promoters[0] ?? (emptyPromoter() as Promoter);
  const setLead = (patch: Partial<Promoter>) =>
    setInput((current) => ({
      ...current,
      promoters: current.promoters.length
        ? current.promoters.map((p, i) => (i === 0 ? { ...p, ...patch } : p))
        : [{ ...(emptyPromoter() as Promoter), ...patch }],
    }));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-5">
        {!id ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-ds-xl border border-dashed border-ds-border bg-ds-surface-sunken px-4 py-3 text-sm text-ds-text-secondary">
            <span>
              Pehli baar bana rahe hain? Ek poori bhari hui example DPR (aata
              chakki, PMEGP) dekh lijiye, phir apni bhariye.
            </span>
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setInput(sampleDpr())}
            >
              <Wand2 className="h-4 w-4" aria-hidden="true" /> Example se
              bharein
            </AdminButton>
          </div>
        ) : null}

        <AdminCard>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ds-lg bg-ds-primary text-ds-text-inverted">
              <Rocket className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-ds-text-primary">
                Quick DPR: sirf basic details
              </h2>
              <p className="mt-0.5 text-[13px] text-ds-text-muted">
                Kaam chuniye aur project cost daaliye. Machinery, capacity, raw
                material, staff, kharche, market, process, licence, risk aur
                SWOT apne aap bhar jaayenge, aur 18–20 page ki bank-ready DPR
                banegi.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Kaam / business type *">
                  <AdminSelect
                    value={quickTemplate}
                    onChange={(e) => setQuickTemplate(e.target.value)}
                  >
                    {TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
                <Field
                  label="Project cost (Rs. lakh) *"
                  help="Machinery + working capital milakar, jaise 10"
                >
                  <NumberBox
                    label="Project cost (Rs. lakh) *"
                    nullable
                    value={quickCostLakh}
                    onChange={setQuickCostLakh}
                    suffix="lakh"
                  />
                </Field>
                <Field label="Business ka naam *">
                  <AdminInput
                    value={input.businessName}
                    onChange={(e) => set("businessName", e.target.value)}
                  />
                </Field>
                <Field label="District">
                  <AdminInput
                    value={input.district}
                    onChange={(e) => set("district", e.target.value)}
                  />
                </Field>
                <Field label="Promoter ka naam">
                  <AdminInput
                    value={lead.name}
                    onChange={(e) => setLead({ name: e.target.value })}
                  />
                </Field>
                <Field label="Pita / pati">
                  <AdminInput
                    value={lead.fatherName}
                    onChange={(e) => setLead({ fatherName: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Promoter ki umr">
                    <NumberBox
                      label="Promoter ki umr"
                      nullable
                      value={lead.age}
                      onChange={(v) =>
                        setLead({ age: v === null ? null : Math.round(v) })
                      }
                    />
                  </Field>
                  <Field label="Promoter category">
                    <AdminSelect
                      value={lead.socialCategory}
                      onChange={(e) =>
                        setLead({ socialCategory: e.target.value })
                      }
                    >
                      {[
                        "General",
                        "OBC",
                        "SC",
                        "ST",
                        "Minority",
                        "Women",
                        "Ex-serviceman",
                        "Divyang",
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </AdminSelect>
                  </Field>
                </div>
                <Field label="Yojana">
                  <AdminSelect
                    value={input.scheme}
                    onChange={(e) =>
                      set("scheme", e.target.value as DprInput["scheme"])
                    }
                  >
                    {SCHEME_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Area">
                    <AdminSelect
                      value={input.area}
                      onChange={(e) =>
                        set("area", e.target.value as DprInput["area"])
                      }
                    >
                      {AREA_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </AdminSelect>
                  </Field>
                  <Field label="Yojana category">
                    <AdminSelect
                      value={input.category}
                      onChange={(e) =>
                        set("category", e.target.value as DprInput["category"])
                      }
                    >
                      {CATEGORY_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.value === "general" ? "General" : "Special"}
                        </option>
                      ))}
                    </AdminSelect>
                  </Field>
                </div>
                <Field label="Bank aur branch">
                  <AdminInput
                    value={input.bankName}
                    placeholder="Jaise: Bank of Baroda"
                    onChange={(e) => set("bankName", e.target.value)}
                  />
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <AdminButton type="button" onClick={buildQuick}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> DPR
                  taiyaar karein
                </AdminButton>
                <span className="text-xs text-ds-text-muted">
                  Pehle se bhari details (naam, promoter, yojana) nahi badlengi.
                </span>
              </div>
            </div>
          </div>
        </AdminCard>

        <button
          type="button"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-ds-xl border border-ds-border bg-ds-surface px-4 py-3 text-left text-sm font-bold text-ds-text-primary hover:bg-ds-surface-sunken"
        >
          <span>
            Poori details (optional)
            <span className="block text-xs font-normal text-ds-text-muted">
              Machinery, products, staff, kharche, loan aur report ka text khud
              badalna ho to kholiye.
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              detailsOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        <div hidden={!detailsOpen} className="space-y-5">
          <Section
            step={1}
            title="Business aur promoter"
            hint="Ye report ke cover page aur 'Project at a glance' mein jaata hai."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Business / unit ka naam *">
                <AdminInput
                  value={input.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                />
              </Field>
              <Field label="Constitution">
                <AdminSelect
                  value={input.constitution}
                  onChange={(e) =>
                    set(
                      "constitution",
                      e.target.value as DprInput["constitution"],
                    )
                  }
                >
                  {CONSTITUTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </AdminSelect>
              </Field>
              <Field
                label="Kaam / activity"
                help="Jaise: manufacturing of wheat flour, computer training centre"
                className="md:col-span-2"
              >
                <AdminInput
                  value={input.activity}
                  onChange={(e) => set("activity", e.target.value)}
                />
              </Field>
              <Field label="Address" className="md:col-span-2">
                <AdminInput
                  value={input.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </Field>
              <Field label="District">
                <AdminInput
                  value={input.district}
                  onChange={(e) => set("district", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="State">
                  <AdminInput
                    value={input.state}
                    onChange={(e) => set("state", e.target.value)}
                  />
                </Field>
                <Field label="Pincode">
                  <AdminInput
                    value={input.pincode}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(e) =>
                      set("pincode", e.target.value.replace(/\D/g, ""))
                    }
                  />
                </Field>
              </div>
              <Field label="Premises">
                <AdminSelect
                  value={input.premises}
                  onChange={(e) =>
                    set("premises", e.target.value as DprInput["premises"])
                  }
                >
                  <option value="owned">Apna (owned)</option>
                  <option value="rented">Kiraye ka (rented)</option>
                  <option value="leased">Lease</option>
                </AdminSelect>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Udyam no.">
                  <AdminInput
                    value={input.udyamNumber}
                    onChange={(e) => set("udyamNumber", e.target.value)}
                  />
                </Field>
                <Field label="GSTIN">
                  <AdminInput
                    value={input.gstin}
                    onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                  />
                </Field>
                <Field label="PAN">
                  <AdminInput
                    value={input.pan}
                    maxLength={10}
                    onChange={(e) => set("pan", e.target.value.toUpperCase())}
                  />
                </Field>
              </div>
              <Field label="Bank ka naam">
                <AdminInput
                  value={input.bankName}
                  onChange={(e) => set("bankName", e.target.value)}
                />
              </Field>
              <Field label="Branch">
                <AdminInput
                  value={input.bankBranch}
                  onChange={(e) => set("bankBranch", e.target.value)}
                />
              </Field>
            </div>

            {input.promoters.map((p, index) => (
              <div
                key={index}
                className="rounded-ds-lg border border-ds-border p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-ds-text-primary">
                    Promoter {index + 1}
                  </p>
                  {input.promoters.length > 1 ? (
                    <RowButtons
                      label={`Promoter ${index + 1}`}
                      onRemove={() => removeAt("promoters", index)}
                    />
                  ) : null}
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Naam">
                    <AdminInput
                      value={p.name}
                      onChange={(e) =>
                        updateAt("promoters", index, { name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Pita / pati ka naam">
                    <AdminInput
                      value={p.fatherName}
                      onChange={(e) =>
                        updateAt("promoters", index, {
                          fatherName: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Umr">
                      <NumberBox
                        label="Umr"
                        nullable
                        value={p.age}
                        onChange={(v) =>
                          updateAt("promoters", index, {
                            age: v === null ? null : Math.round(v),
                          })
                        }
                      />
                    </Field>
                    <Field label="Category">
                      <AdminSelect
                        value={p.socialCategory}
                        onChange={(e) =>
                          updateAt("promoters", index, {
                            socialCategory: e.target.value,
                          })
                        }
                      >
                        {[
                          "General",
                          "OBC",
                          "SC",
                          "ST",
                          "Minority",
                          "Women",
                          "Ex-serviceman",
                          "Divyang",
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </AdminSelect>
                    </Field>
                  </div>
                  <Field label="Qualification">
                    <AdminInput
                      value={p.qualification}
                      onChange={(e) =>
                        updateAt("promoters", index, {
                          qualification: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Experience" className="md:col-span-2">
                    <AdminInput
                      value={p.experience}
                      placeholder="Jaise: 5 years of experience in a flour mill"
                      onChange={(e) =>
                        updateAt("promoters", index, {
                          experience: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Mobile">
                    <AdminInput
                      value={p.mobile}
                      inputMode="tel"
                      onChange={(e) =>
                        updateAt("promoters", index, { mobile: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Email">
                    <AdminInput
                      value={p.email}
                      type="email"
                      onChange={(e) =>
                        updateAt("promoters", index, { email: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Gender">
                    <AdminSelect
                      value={p.gender}
                      onChange={(e) =>
                        updateAt("promoters", index, { gender: e.target.value })
                      }
                    >
                      <option value="">-</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </AdminSelect>
                  </Field>
                </div>
              </div>
            ))}
            {input.promoters.length < 10 ? (
              <AddButton
                onClick={() =>
                  set("promoters", [
                    ...input.promoters,
                    emptyPromoter() as Promoter,
                  ])
                }
              >
                Promoter jodein
              </AddButton>
            ) : null}
          </Section>

          <Section
            step={2}
            title="Yojana aur loan"
            hint="Yojana chunte hi own contribution, subsidy aur byaaj chhoot ke default lag jaate hain. Bank ya portal se confirm karein."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Loan yojana">
                <AdminSelect
                  value={input.scheme}
                  onChange={(e) =>
                    set("scheme", e.target.value as DprInput["scheme"])
                  }
                >
                  {SCHEME_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </AdminSelect>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pehla saal (FY)">
                  <AdminSelect
                    value={input.startFy}
                    onChange={(e) => set("startFy", Number(e.target.value))}
                  >
                    {[0, 1, 2].map((offset) => {
                      const fy = new Date().getFullYear() - 1 + offset;
                      return (
                        <option key={fy} value={fy}>
                          {fyLabel(fy)}
                        </option>
                      );
                    })}
                  </AdminSelect>
                </Field>
                <Field label="Kitne saal ka projection">
                  <AdminSelect
                    value={input.years}
                    onChange={(e) => set("years", Number(e.target.value))}
                  >
                    {[3, 5, 7, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} saal
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
              </div>
              <Field label="Sector">
                <AdminSelect
                  value={input.sector}
                  onChange={(e) =>
                    set("sector", e.target.value as DprInput["sector"])
                  }
                >
                  {SECTOR_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </AdminSelect>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Area">
                  <AdminSelect
                    value={input.area}
                    onChange={(e) =>
                      set("area", e.target.value as DprInput["area"])
                    }
                  >
                    {AREA_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
                <Field label="Category (yojana ke liye)">
                  <AdminSelect
                    value={input.category}
                    onChange={(e) =>
                      set("category", e.target.value as DprInput["category"])
                    }
                  >
                    {CATEGORY_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.value === "general" ? "General" : "Special"}
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
              </div>
            </div>
            {scheme ? (
              <div className="rounded-ds-lg bg-ds-surface-sunken p-3 text-sm text-ds-text-secondary">
                <p className="font-semibold text-ds-text-primary">
                  {scheme.summary}
                </p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs">
                  {scheme.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-4">
              <Field
                label="Own contribution %"
                help={`Khaali = yojana ka (${report.means.ownContributionPct}%)`}
              >
                <NumberBox
                  label="Own contribution percent"
                  nullable
                  value={input.ownContributionPct}
                  onChange={(v) => set("ownContributionPct", v)}
                  suffix="%"
                />
              </Field>
              <Field label="Term loan byaaj">
                <NumberBox
                  label="Term loan byaaj"
                  value={input.termLoanInterestPct}
                  onChange={(v) => set("termLoanInterestPct", v ?? 0)}
                  suffix="%"
                />
              </Field>
              <Field label="CC byaaj">
                <NumberBox
                  label="CC byaaj"
                  value={input.ccInterestPct}
                  onChange={(v) => set("ccInterestPct", v ?? 0)}
                  suffix="%"
                />
              </Field>
              <Field label="Tax (net profit par)">
                <NumberBox
                  label="Tax percent"
                  value={input.taxPct}
                  onChange={(v) => set("taxPct", v ?? 0)}
                  suffix="%"
                />
              </Field>
              <Field label="Loan avadhi (saal)" help="Moratorium milakar">
                <NumberBox
                  label="Loan avadhi"
                  value={input.tenureYears}
                  onChange={(v) => set("tenureYears", v ?? 1)}
                  suffix="saal"
                />
              </Field>
              <Field label="Moratorium (mahine)" help="Sirf byaaj, kisht nahi">
                <NumberBox
                  label="Moratorium"
                  value={input.moratoriumMonths}
                  onChange={(v) => set("moratoriumMonths", Math.round(v ?? 0))}
                  suffix="mah."
                />
              </Field>
              <Field
                label="Term loan (khud likhein)"
                help={`Khaali = auto (${rs(report.means.termLoan)})`}
              >
                <NumberBox
                  label="Term loan"
                  nullable
                  value={input.termLoanOverride}
                  onChange={(v) => set("termLoanOverride", v)}
                />
              </Field>
              <Field
                label="CC limit (khud likhein)"
                help={`Khaali = auto (${rs(report.means.ccLimit)})`}
              >
                <NumberBox
                  label="CC limit"
                  nullable
                  value={input.ccLimitOverride}
                  onChange={(v) => set("ccLimitOverride", v)}
                />
              </Field>
              <Field
                label="Subsidy (khud likhein)"
                help={`Khaali = yojana se (${rs(report.means.subsidy)})`}
              >
                <NumberBox
                  label="Subsidy"
                  nullable
                  value={input.subsidyOverride}
                  onChange={(v) => set("subsidyOverride", v)}
                />
              </Field>
              <Field label="Byaaj chhoot %" help="Khaali = yojana se">
                <NumberBox
                  label="Byaaj chhoot"
                  nullable
                  value={input.interestSubventionPct}
                  onChange={(v) => set("interestSubventionPct", v)}
                  suffix="%"
                />
              </Field>
              <Field label="Chhoot kitne saal" help="Khaali = yojana se">
                <NumberBox
                  label="Chhoot saal"
                  nullable
                  value={input.interestSubventionYears}
                  onChange={(v) =>
                    set(
                      "interestSubventionYears",
                      v === null ? null : Math.round(v),
                    )
                  }
                />
              </Field>
              <Field
                label="Drawings / saal"
                help="Promoter ghar kharch ke liye nikalega"
              >
                <NumberBox
                  label="Drawings"
                  value={input.drawingsPerYear}
                  onChange={(v) => set("drawingsPerYear", v ?? 0)}
                />
              </Field>
            </div>
          </Section>

          <Section
            step={3}
            title="Project cost: machinery aur capital items"
            hint="Har machine / item alag line mein. Zameen PMEGP aur MYSY mein project cost mein nahi gini jaati."
          >
            <div className="space-y-2">
              {input.capitalItems.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-ds-lg border border-ds-border p-2 md:grid-cols-[12rem_1fr_6rem_8rem_8rem_auto] md:items-center"
                >
                  <AdminSelect
                    aria-label="Head"
                    value={item.kind}
                    onChange={(e) =>
                      updateAt("capitalItems", index, {
                        kind: e.target.value as AssetKind,
                      })
                    }
                  >
                    {ASSET_KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </AdminSelect>
                  <AdminInput
                    aria-label="Item ka naam"
                    placeholder="Item / machine ka naam"
                    value={item.description}
                    onChange={(e) =>
                      updateAt("capitalItems", index, {
                        description: e.target.value,
                      })
                    }
                  />
                  <NumberBox
                    label="Quantity"
                    value={item.quantity}
                    onChange={(v) =>
                      updateAt("capitalItems", index, { quantity: v ?? 0 })
                    }
                    placeholder="Qty"
                  />
                  <NumberBox
                    label="Rate"
                    value={item.rate}
                    onChange={(v) =>
                      updateAt("capitalItems", index, { rate: v ?? 0 })
                    }
                    placeholder="Rate"
                  />
                  <p className="text-right text-sm font-semibold tabular-nums text-ds-text-primary">
                    {formatAmount(itemAmount(item))}
                  </p>
                  <RowButtons
                    label={item.description || "Item"}
                    onRemove={() => removeAt("capitalItems", index)}
                  />
                </div>
              ))}
              <AddButton
                onClick={() =>
                  set("capitalItems", [
                    ...input.capitalItems,
                    {
                      kind: "machinery",
                      description: "",
                      quantity: 1,
                      rate: 0,
                    },
                  ])
                }
              >
                Item jodein
              </AddButton>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-ds-text-primary">
                <input
                  type="checkbox"
                  checked={input.includeLand}
                  onChange={(e) => set("includeLand", e.target.checked)}
                  className="h-4 w-4"
                />
                Zameen project cost mein shamil karein
              </label>
              <Field label="Preliminary kharch kitne saal mein write-off">
                <NumberBox
                  label="Write-off saal"
                  value={input.preliminaryWriteOffYears}
                  onChange={(v) =>
                    set(
                      "preliminaryWriteOffYears",
                      Math.max(1, Math.round(v ?? 5)),
                    )
                  }
                  suffix="saal"
                />
              </Field>
            </div>
            <details className="rounded-ds-lg border border-ds-border p-3 text-sm">
              <summary className="cursor-pointer font-semibold text-ds-text-primary">
                Depreciation rates (WDV) badlein
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {ASSET_KINDS.filter(
                  (k) => k.value !== "land" && k.value !== "preliminary",
                ).map((k) => (
                  <Field key={k.value} label={k.label}>
                    <NumberBox
                      label={`${k.label} depreciation`}
                      value={
                        input.depreciationRates[k.value] ??
                        defaultDepreciationRate(k.value)
                      }
                      onChange={(v) =>
                        set("depreciationRates", {
                          ...input.depreciationRates,
                          [k.value]: v ?? 0,
                        })
                      }
                      suffix="%"
                    />
                  </Field>
                ))}
              </div>
            </details>
          </Section>

          <Section
            step={4}
            title="Products / services aur capacity"
            hint="Capacity = 100% chalne par saal bhar mein kitna banega ya kitni service dega. Sales = capacity × utilisation × rate."
          >
            <div className="space-y-2">
              {input.products.map((p, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-ds-lg border border-ds-border p-2 md:grid-cols-[1fr_7rem_9rem_9rem_auto] md:items-center"
                >
                  <AdminInput
                    aria-label="Product ka naam"
                    placeholder="Product / service"
                    value={p.name}
                    onChange={(e) =>
                      updateAt("products", index, { name: e.target.value })
                    }
                  />
                  <AdminInput
                    aria-label="Unit"
                    placeholder="Unit (kg, piece)"
                    value={p.unit}
                    onChange={(e) =>
                      updateAt("products", index, { unit: e.target.value })
                    }
                  />
                  <NumberBox
                    label="Capacity per year"
                    value={p.capacity}
                    onChange={(v) =>
                      updateAt("products", index, { capacity: v ?? 0 })
                    }
                    placeholder="Capacity / saal"
                  />
                  <NumberBox
                    label="Selling rate"
                    value={p.price}
                    onChange={(v) =>
                      updateAt("products", index, { price: v ?? 0 })
                    }
                    placeholder="Rate"
                  />
                  <RowButtons
                    label={p.name || "Product"}
                    onRemove={() => removeAt("products", index)}
                  />
                </div>
              ))}
              <AddButton
                onClick={() =>
                  set("products", [
                    ...input.products,
                    { name: "", unit: "", capacity: 0, price: 0 },
                  ])
                }
              >
                Product jodein
              </AddButton>
            </div>
            <div>
              <p className="text-xs font-bold text-ds-text-secondary">
                Capacity utilisation har saal (%)
              </p>
              <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {Array.from({ length: years }, (_, index) => (
                  <Field key={index} label={fyLabel(input.startFy + index)}>
                    <NumberBox
                      label={`Utilisation ${fyLabel(input.startFy + index)}`}
                      value={
                        input.utilisationPct[index] ??
                        input.utilisationPct.at(-1) ??
                        100
                      }
                      onChange={(v) => {
                        const next = Array.from(
                          { length: years },
                          (_, i) =>
                            input.utilisationPct[i] ??
                            input.utilisationPct.at(-1) ??
                            100,
                        );
                        next[index] = Math.min(100, v ?? 0);
                        set("utilisationPct", next);
                      }}
                      suffix="%"
                    />
                  </Field>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Selling rate badhotri / saal"
                help="Raw material ka rate bhi isi hisaab se badhega"
              >
                <NumberBox
                  label="Price growth"
                  value={input.priceGrowthPct}
                  onChange={(v) => set("priceGrowthPct", v ?? 0)}
                  suffix="%"
                />
              </Field>
              <Field label="Salary aur kharche badhotri / saal">
                <NumberBox
                  label="Cost growth"
                  value={input.costGrowthPct}
                  onChange={(v) => set("costGrowthPct", v ?? 0)}
                  suffix="%"
                />
              </Field>
            </div>
          </Section>

          <Section
            step={5}
            title="Raw material (100% capacity par saal bhar ka)"
            hint="Service project mein raw material na ho to khaali chhod dein."
          >
            <div className="space-y-2">
              {input.rawMaterials.map((m, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-ds-lg border border-ds-border p-2 md:grid-cols-[1fr_7rem_9rem_9rem_auto] md:items-center"
                >
                  <AdminInput
                    aria-label="Material ka naam"
                    placeholder="Material"
                    value={m.name}
                    onChange={(e) =>
                      updateAt("rawMaterials", index, { name: e.target.value })
                    }
                  />
                  <AdminInput
                    aria-label="Unit"
                    placeholder="Unit"
                    value={m.unit}
                    onChange={(e) =>
                      updateAt("rawMaterials", index, { unit: e.target.value })
                    }
                  />
                  <NumberBox
                    label="Quantity per year"
                    value={m.quantity}
                    onChange={(v) =>
                      updateAt("rawMaterials", index, { quantity: v ?? 0 })
                    }
                    placeholder="Qty / saal"
                  />
                  <NumberBox
                    label="Rate"
                    value={m.rate}
                    onChange={(v) =>
                      updateAt("rawMaterials", index, { rate: v ?? 0 })
                    }
                    placeholder="Rate"
                  />
                  <RowButtons
                    label={m.name || "Material"}
                    onRemove={() => removeAt("rawMaterials", index)}
                  />
                </div>
              ))}
              <AddButton
                onClick={() =>
                  set("rawMaterials", [
                    ...input.rawMaterials,
                    { name: "", unit: "", quantity: 0, rate: 0 },
                  ])
                }
              >
                Material jodein
              </AddButton>
            </div>
          </Section>

          <Section
            step={6}
            title="Staff aur kharche"
            hint="Direct = utpadan / service mein seedha laga hua (operator, karigar). Indirect = office staff. 'Output ke saath badhe' wale kharche 100% capacity ke hisaab se bharein."
          >
            <div className="space-y-2">
              {input.staff.map((s, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-ds-lg border border-ds-border p-2 md:grid-cols-[1fr_6rem_9rem_8rem_auto] md:items-center"
                >
                  <AdminInput
                    aria-label="Post"
                    placeholder="Post"
                    value={s.role}
                    onChange={(e) =>
                      updateAt("staff", index, { role: e.target.value })
                    }
                  />
                  <NumberBox
                    label="Kitne log"
                    value={s.count}
                    onChange={(v) =>
                      updateAt("staff", index, { count: Math.round(v ?? 0) })
                    }
                    placeholder="Log"
                  />
                  <NumberBox
                    label="Salary per month"
                    value={s.monthlySalary}
                    onChange={(v) =>
                      updateAt("staff", index, { monthlySalary: v ?? 0 })
                    }
                    placeholder="Salary / mahina"
                  />
                  <AdminSelect
                    aria-label="Type"
                    value={s.direct ? "direct" : "indirect"}
                    onChange={(e) =>
                      updateAt("staff", index, {
                        direct: e.target.value === "direct",
                      })
                    }
                  >
                    <option value="direct">Direct</option>
                    <option value="indirect">Indirect</option>
                  </AdminSelect>
                  <RowButtons
                    label={s.role || "Staff"}
                    onRemove={() => removeAt("staff", index)}
                  />
                </div>
              ))}
              <AddButton
                onClick={() =>
                  set("staff", [
                    ...input.staff,
                    { role: "", count: 1, monthlySalary: 0, direct: true },
                  ])
                }
              >
                Staff jodein
              </AddButton>
            </div>
            <div className="space-y-2">
              {input.overheads.map((o, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-ds-lg border border-ds-border p-2 md:grid-cols-[1fr_9rem_9rem_9rem_auto] md:items-center"
                >
                  <AdminInput
                    aria-label="Kharcha"
                    placeholder="Kharcha"
                    value={o.name}
                    onChange={(e) =>
                      updateAt("overheads", index, { name: e.target.value })
                    }
                  />
                  <NumberBox
                    label="Per month"
                    value={o.monthly}
                    onChange={(v) =>
                      updateAt("overheads", index, { monthly: v ?? 0 })
                    }
                    placeholder="Per mahina"
                  />
                  <AdminSelect
                    aria-label="Direct ya indirect"
                    value={o.direct ? "direct" : "indirect"}
                    onChange={(e) =>
                      updateAt("overheads", index, {
                        direct: e.target.value === "direct",
                      })
                    }
                  >
                    <option value="direct">Direct</option>
                    <option value="indirect">Indirect</option>
                  </AdminSelect>
                  <AdminSelect
                    aria-label="Fixed ya variable"
                    value={o.variable ? "variable" : "fixed"}
                    onChange={(e) =>
                      updateAt("overheads", index, {
                        variable: e.target.value === "variable",
                      })
                    }
                  >
                    <option value="fixed">Fixed</option>
                    <option value="variable">Output ke saath</option>
                  </AdminSelect>
                  <RowButtons
                    label={o.name || "Kharcha"}
                    onRemove={() => removeAt("overheads", index)}
                  />
                </div>
              ))}
              <AddButton
                onClick={() =>
                  set("overheads", [
                    ...input.overheads,
                    { name: "", monthly: 0, variable: false, direct: false },
                  ])
                }
              >
                Kharcha jodein
              </AddButton>
            </div>
          </Section>

          <Section
            step={7}
            title="Working capital"
            hint="Kitne din ka maal stock mein rahega, grahak kitne din mein paisa denge, supplier kitne din ka udhaar denge."
          >
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Raw material stock">
                <NumberBox
                  label="Raw material days"
                  value={input.rawMaterialDays}
                  onChange={(v) => set("rawMaterialDays", v ?? 0)}
                  suffix="din"
                />
              </Field>
              <Field label="Taiyar maal stock">
                <NumberBox
                  label="Finished goods days"
                  value={input.finishedGoodsDays}
                  onChange={(v) => set("finishedGoodsDays", v ?? 0)}
                  suffix="din"
                />
              </Field>
              <Field label="Debtors (udhaar bikri)">
                <NumberBox
                  label="Debtor days"
                  value={input.debtorDays}
                  onChange={(v) => set("debtorDays", v ?? 0)}
                  suffix="din"
                />
              </Field>
              <Field label="Creditors (supplier udhaar)">
                <NumberBox
                  label="Creditor days"
                  value={input.creditorDays}
                  onChange={(v) => set("creditorDays", v ?? 0)}
                  suffix="din"
                />
              </Field>
            </div>
            <p className="text-sm text-ds-text-secondary">
              Working capital zaroorat:{" "}
              <strong className="tabular-nums text-ds-text-primary">
                {rs(report.workingCapital.requirement)}
              </strong>{" "}
              (project cost mein shamil)
            </p>
          </Section>

          <Section
            step={8}
            title="Report ka text"
            hint="Har section ka text figures se apne aap ban jaata hai. Badalna ho to yahan likhein; khaali chhodne par auto text chhapega."
          >
            {NARRATIVE_KEYS.map((key) => (
              <div key={key}>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ds-text-secondary">
                    {NARRATIVE_TITLES[key]}
                  </span>
                  {input.narrative[key]?.trim() ? (
                    <AdminButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        set("narrative", { ...input.narrative, [key]: "" })
                      }
                    >
                      Auto text par wapas
                    </AdminButton>
                  ) : (
                    <AdminButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        set("narrative", {
                          ...input.narrative,
                          [key]: drafts[key],
                        })
                      }
                    >
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                      Auto text edit karein
                    </AdminButton>
                  )}
                </div>
                <AdminTextarea
                  aria-label={NARRATIVE_TITLES[key]}
                  rows={key === "swot" || key === "implementation" ? 4 : 3}
                  value={input.narrative[key] ?? ""}
                  placeholder={drafts[key]}
                  onChange={(e) =>
                    set("narrative", {
                      ...input.narrative,
                      [key]: e.target.value,
                    })
                  }
                />
              </div>
            ))}
          </Section>
        </div>

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-ds-xl border border-ds-border bg-ds-surface/95 p-3 shadow-ds-md backdrop-blur">
          <AdminButton
            type="button"
            variant="secondary"
            loading={saving === "draft"}
            disabled={saving !== null}
            onClick={() => save("draft")}
          >
            Draft save karein
          </AdminButton>
          <AdminButton
            type="button"
            loading={saving === "final"}
            disabled={saving !== null}
            onClick={() => save("final")}
          >
            Final karein
          </AdminButton>
          {initialStatus === "final" ? (
            <span className="text-xs text-ds-text-muted">Abhi final hai</span>
          ) : null}
          {message ? (
            <p
              role={message.tone === "danger" ? "alert" : "status"}
              className={cn(
                "rounded-ds-md px-3 py-1.5 text-sm font-semibold",
                STATUS_TONE_CLASS[message.tone],
              )}
            >
              {message.text}
            </p>
          ) : null}
        </div>
      </div>

      <LiveSummary report={report} />
    </div>
  );
}

function LiveSummary({ report }: { report: ReturnType<typeof buildDpr> }) {
  const y1 = report.years[0];
  const rows: [string, string, boolean?][] = [
    ["Project cost", rs(report.cost.total), true],
    [
      `Own contribution (${report.means.ownContributionPct}%)`,
      rs(report.means.ownContribution),
    ],
    ["Term loan", rs(report.means.termLoan)],
    ["CC limit", rs(report.means.ccLimit)],
    ["Kul bank loan", rs(report.means.bankLoan), true],
    ["Subsidy", rs(report.means.subsidy)],
  ];
  const dscrTone =
    report.averageDscr === null
      ? "neutral"
      : report.averageDscr >= 1.5
        ? "success"
        : report.averageDscr >= 1.25
          ? "warning"
          : "danger";
  return (
    <aside
      className="xl:sticky xl:top-24 xl:self-start"
      aria-label="DPR summary"
    >
      <AdminCard className="space-y-4">
        <h2 className="text-[15px] font-bold text-ds-text-primary">
          Live summary
        </h2>
        <dl className="space-y-1.5 text-sm">
          {rows.map(([label, value, strong]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-ds-text-secondary">{label}</dt>
              <dd
                className={cn(
                  "tabular-nums",
                  strong
                    ? "font-bold text-ds-text-primary"
                    : "text-ds-text-primary",
                )}
              >
                {value}
              </dd>
            </div>
          ))}
          {report.mudraCategory ? (
            <div className="flex justify-between gap-3">
              <dt className="text-ds-text-secondary">Mudra category</dt>
              <dd className="font-semibold">{report.mudraCategory}</dd>
            </div>
          ) : null}
        </dl>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div
            className={cn(
              "rounded-ds-lg px-2 py-2",
              STATUS_TONE_CLASS[dscrTone],
            )}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide">
              Avg DSCR
            </p>
            <p className="text-xl font-bold tabular-nums">
              {report.averageDscr?.toFixed(2) ?? "-"}
            </p>
          </div>
          <div className="rounded-ds-lg bg-ds-surface-sunken px-2 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ds-text-muted">
              Break-even
            </p>
            <p className="text-xl font-bold tabular-nums text-ds-text-primary">
              {report.breakEven?.bepCapacityPct != null
                ? `${report.breakEven.bepCapacityPct.toFixed(1)}%`
                : "-"}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-ds-text-muted">
                <th className="py-1 text-left font-semibold">Saal</th>
                <th className="py-1 text-right font-semibold">Sales</th>
                <th className="py-1 text-right font-semibold">Net profit</th>
                <th className="py-1 text-right font-semibold">DSCR</th>
              </tr>
            </thead>
            <tbody>
              {report.years.map((y) => (
                <tr key={y.fyStart} className="border-t border-ds-border">
                  <td className="py-1">{y.label}</td>
                  <td className="py-1 text-right">
                    {Math.round(y.sales).toLocaleString("en-IN")}
                  </td>
                  <td
                    className={cn(
                      "py-1 text-right",
                      y.netProfit < 0 && "text-ds-danger",
                    )}
                  >
                    {Math.round(y.netProfit).toLocaleString("en-IN")}
                  </td>
                  <td className="py-1 text-right">
                    {y.dscr?.toFixed(2) ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {y1 ? (
          <p className="text-xs text-ds-text-muted">
            Pehle saal ki sales {rs(y1.sales)}, payback{" "}
            {report.paybackYears?.toFixed(1) ?? "-"} saal.
          </p>
        ) : null}
        {report.warnings.length ? (
          <ul className="space-y-1.5" aria-label="Dhyan dene wali baatein">
            {report.warnings.map((warning) => (
              <li
                key={warning}
                className={cn(
                  "flex gap-2 rounded-ds-md px-2.5 py-2 text-xs font-medium",
                  STATUS_TONE_CLASS.warning,
                )}
              >
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                {warning}
              </li>
            ))}
          </ul>
        ) : (
          <p
            className={cn(
              "flex items-center gap-2 rounded-ds-md px-2.5 py-2 text-xs font-semibold",
              STATUS_TONE_CLASS.success,
            )}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Sab theek
            hai. DPR final kar sakte hain.
          </p>
        )}
      </AdminCard>
    </aside>
  );
}
