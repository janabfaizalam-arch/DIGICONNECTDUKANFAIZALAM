"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
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
  missingCostHeads,
  schemeFor,
  type AssetKind,
  type DprInput,
  type Promoter,
} from "@/lib/project-reports/engine";
import {
  eligibilityIssues,
  isEligible,
  SCHEME_RULES,
  SECTOR_LABEL,
  sectorsFor,
  templatesFor,
} from "@/lib/project-reports/eligibility";
import {
  DPR_GUIDE,
  GUIDE_HEADINGS,
  IMPORTANCE_LABEL,
  type DprGuideKey,
  type Importance,
} from "@/lib/project-reports/field-guide";
import { complianceFor } from "@/lib/project-reports/compliance";
import { withEstimatedCosts } from "@/lib/project-reports/estimates";
import { sampleDpr } from "@/lib/project-reports/sample";
import {
  applyTemplate,
  templateById,
  TEMPLATES,
} from "@/lib/project-reports/templates";
import { cn } from "@/lib/utils";

/**
 * The admin's DPR form. The figures on the right are the same engine the
 * PDF uses, recalculated on every change, so what the admin sees is what
 * the bank will get.
 */

const rs = (value: number) => `Rs. ${formatAmount(value)}`;

const PROMOTER_CATEGORIES = [
  "General",
  "OBC",
  "SC",
  "ST",
  "Minority",
  "Women",
  "Ex-serviceman",
  "Divyang",
];

function firstEligible(
  schemeId: DprInput["scheme"],
  sector: "all" | DprInput["sector"],
) {
  return templatesFor(schemeId, sector)[0]?.templates[0]?.id ?? TEMPLATES[0].id;
}

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

const IMPORTANCE_TONE: Record<
  Importance,
  "danger" | "warning" | "neutral" | "info"
> = {
  required: "danger",
  important: "warning",
  optional: "neutral",
  auto: "info",
};

/** How long the pointer has to rest on a box before its guide opens. */
const HOVER_DELAY_MS = 450;

/**
 * Shows a box's guide — what to enter, where to get it, why the bank needs
 * it and whether it is required — as soon as focus moves into the box, or
 * the pointer rests on it. Closes on typing, Escape, leaving the box or the
 * pointer moving away.
 */
function useGuide() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => (timer.current ? clearTimeout(timer.current) : undefined),
    [],
  );
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    open,
    handlers: {
      onFocus: () => setOpen(true),
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          cancel();
          setOpen(false);
        }
      },
      onKeyDown: (event: React.KeyboardEvent) => {
        if (
          event.key === "Escape" ||
          event.key.length === 1 ||
          event.key === "Backspace"
        )
          setOpen(false);
      },
      onMouseEnter: () => {
        cancel();
        timer.current = setTimeout(() => setOpen(true), HOVER_DELAY_MS);
      },
      onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
        cancel();
        if (!event.currentTarget.contains(document.activeElement))
          setOpen(false);
      },
    },
  };
}

function GuideCard({
  guide,
  title,
  open,
  className,
}: {
  guide: DprGuideKey;
  title: string;
  open: boolean;
  className?: string;
}) {
  const entry = DPR_GUIDE[guide];
  return (
    <div
      role="tooltip"
      hidden={!open}
      data-guide={guide}
      className={cn(
        "pointer-events-none absolute z-30 w-full min-w-[16rem] max-w-[min(22rem,calc(100vw-2rem))] rounded-ds-md border border-ds-border bg-ds-surface p-3 text-xs leading-snug text-ds-text-secondary shadow-ds-lg",
        className,
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 font-bold text-ds-text-primary">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {title.replace(/ \*$/, "")}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
            STATUS_TONE_CLASS[IMPORTANCE_TONE[entry.importance]],
          )}
        >
          {IMPORTANCE_LABEL[entry.importance]}
        </span>
      </span>
      <span className="mt-2 block">
        <span className="font-semibold text-ds-text-primary">
          {GUIDE_HEADINGS.what}:{" "}
        </span>
        {entry.what}
      </span>
      <span className="mt-1.5 block">
        <span className="font-semibold text-ds-text-primary">
          {GUIDE_HEADINGS.where}:{" "}
        </span>
        {entry.where}
      </span>
      <span className="mt-1.5 block">
        <span className="font-semibold text-ds-text-primary">
          {GUIDE_HEADINGS.why}:{" "}
        </span>
        {entry.why}
      </span>
    </div>
  );
}

function Field({
  label,
  help,
  children,
  className,
  guide,
}: {
  label: string;
  help?: string;
  children: ReactNode;
  className?: string;
  guide?: DprGuideKey;
}) {
  const { open, handlers } = useGuide();
  return (
    <div className={cn("relative", className)} {...(guide ? handlers : {})}>
      <label className="block space-y-1.5">
        <span className="block text-xs font-bold text-ds-text-secondary">
          {label}
        </span>
        {children}
        {help ? (
          <span className="block text-xs text-ds-text-muted">{help}</span>
        ) : null}
      </label>
      {guide ? (
        <GuideCard
          guide={guide}
          title={label}
          open={open}
          className="left-0 top-full mt-1.5"
        />
      ) : null}
    </div>
  );
}

function Section({
  step,
  title,
  hint,
  children,
  guide,
}: {
  step: number;
  title: string;
  hint?: string;
  children: ReactNode;
  /** For sections of rows (machinery, products...), one guide for the whole list. */
  guide?: DprGuideKey;
}) {
  const { open, handlers } = useGuide();
  return (
    <div id={`step-${step}`} className="scroll-mt-24">
      <AdminCard>
        <div
          className="relative flex items-start gap-3"
          {...(guide ? handlers : {})}
        >
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
          {guide ? (
            <GuideCard
              guide={guide}
              title={title}
              open={open}
              className="right-0 top-0"
            />
          ) : null}
        </div>
      </AdminCard>
    </div>
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
    initial.templateId ?? firstEligible(initial.scheme, "all"),
  );
  const [quickSector, setQuickSector] = useState<"all" | DprInput["sector"]>(
    "all",
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

  const rule = SCHEME_RULES[input.scheme];
  const allowedSectors = sectorsFor(input.scheme);
  const eligibleGroups = useMemo(
    () => templatesFor(input.scheme, quickSector),
    [input.scheme, quickSector],
  );
  const eligibleCount = eligibleGroups.reduce(
    (sum, g) => sum + g.templates.length,
    0,
  );
  const quickScheme = schemeFor({
    ...input,
    sector: templateById(quickTemplate)?.sector ?? input.sector,
  });
  const costLimitLakh =
    input.scheme !== "none" && quickScheme?.maxProjectCost
      ? quickScheme.maxProjectCost / 100000
      : null;
  const eligibility = useMemo(() => eligibilityIssues(input), [input]);
  const missingCosts = useMemo(() => missingCostHeads(input), [input]);
  const leadPromoter = input.promoters[0];
  const pendingQuotes = input.capitalItems.filter(
    (i) =>
      !["land", "preliminary", "licences", "deposit"].includes(i.kind) &&
      itemAmount(i) > 0 &&
      !(i.supplier ?? "").trim(),
  ).length;
  const steps: { label: string; target: number; done: boolean }[] = [
    {
      label: "Promoter details",
      target: 1,
      done: Boolean(
        leadPromoter?.name.trim() &&
        leadPromoter.qualification.trim() &&
        leadPromoter.experience.trim(),
      ),
    },
    {
      label: "Business details",
      target: 1,
      done: Boolean(input.businessName.trim() && input.activity.trim()),
    },
    {
      label: "Project location",
      target: 1,
      done: Boolean(input.district.trim() && input.address.trim()),
    },
    { label: "Constitution", target: 1, done: Boolean(input.constitution) },
    {
      label: "Industry aur products",
      target: 4,
      done: input.products.length > 0,
    },
    {
      label: "Machinery aur equipment",
      target: 3,
      done: report.cost.fixedCapital > 0 && pendingQuotes === 0,
    },
    {
      label: "Raw material",
      target: 5,
      done: input.sector !== "manufacturing" || input.rawMaterials.length > 0,
    },
    {
      label: "Production capacity",
      target: 4,
      done: input.products.some((p) => p.capacity > 0),
    },
    {
      label: "Sales aur pricing",
      target: 4,
      done: (report.years[0]?.sales ?? 0) > 0,
    },
    { label: "Employees aur salary", target: 6, done: input.staff.length > 0 },
    { label: "Rent aur kharche", target: 6, done: missingCosts.length === 0 },
    {
      label: "Project cost",
      target: 3,
      done: report.cost.total > 0 && report.checks.costReconciles,
    },
    {
      label: "Means of finance",
      target: 2,
      done: report.checks.meansReconcile,
    },
    {
      label: "Loan details",
      target: 2,
      done: report.checks.loanReconciles && report.means.termLoan > 0,
    },
    { label: "Government scheme", target: 2, done: eligibility.length === 0 },
    { label: "Licences aur compliance", target: 9, done: true },
    {
      label: "Financial projections",
      target: 7,
      done:
        report.checks.balanceSheetBalances && report.checks.cashFlowReconciles,
    },
    {
      label: "Final review",
      target: 9,
      done: report.errors.length === 0 && eligibility.length === 0,
    },
  ];
  const goTo = (step: number) => {
    setDetailsOpen(true);
    requestAnimationFrame(() =>
      document
        .getElementById(`step-${step}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  const compliance = useMemo(
    () => complianceFor(input, report),
    [input, report],
  );

  /** Keep the business picked only if the new scheme / sector funds it; else take the first that it does. */
  function keepEligible(
    schemeId: DprInput["scheme"],
    sector: typeof quickSector,
  ) {
    const current = templateById(quickTemplate);
    if (
      current &&
      isEligible(current, schemeId) &&
      (sector === "all" || current.sector === sector)
    )
      return;
    setQuickTemplate(firstEligible(schemeId, sector));
  }
  function changeScheme(next: DprInput["scheme"]) {
    set("scheme", next);
    const sector =
      quickSector !== "all" && !sectorsFor(next).includes(quickSector)
        ? "all"
        : quickSector;
    setQuickSector(sector);
    keepEligible(next, sector);
    // Smaller schemes have a lower project cost limit; bring the default within it.
    const limit = schemeFor({ ...input, scheme: next })?.maxProjectCost;
    if (limit && quickCostLakh && quickCostLakh * 100000 > limit)
      setQuickCostLakh(limit / 100000);
  }
  function changeSector(next: typeof quickSector) {
    setQuickSector(next);
    keepEligible(input.scheme, next);
  }
  /** The scheme category follows the promoter's: anyone but General counts as special. */
  function changeSocialCategory(next: string) {
    setInput((current) => ({
      ...current,
      category: next === "General" ? "general" : "special",
      promoters: current.promoters.length
        ? current.promoters.map((p, i) =>
            i === 0 ? { ...p, socialCategory: next } : p,
          )
        : [{ ...(emptyPromoter() as Promoter), socialCategory: next }],
    }));
  }

  function buildQuick() {
    const lakh = quickCostLakh ?? report.cost.total / 100000;
    if (!(lakh > 0)) {
      setMessage({ tone: "danger", text: "Project cost (lakh mein) bhariye." });
      return;
    }
    if (!quickTemplate) {
      setMessage({ tone: "danger", text: "Kaam / business type chuniye." });
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
                Yojana chuniye, phir kaam. Sirf wahi business dikhenge jo us
                yojana mein loan ke layak hain. Machinery, capacity, raw
                material, staff, kharche, market, process, licence, risk aur
                SWOT apne aap bhar jaayenge, aur 18–20 page ki bank-ready DPR
                banegi. Kisi bhi box par jaate hi batayega ki kya bharna hai,
                kahan se milega aur kyon.
              </p>
              <p className="mt-1 text-xs font-semibold text-ds-text-secondary">
                * wale box zaroori hain. Baaki khaali chhod sakte hain.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field guide="scheme" label="Yojana *">
                  <AdminSelect
                    value={input.scheme}
                    onChange={(e) =>
                      changeScheme(e.target.value as DprInput["scheme"])
                    }
                  >
                    {SCHEME_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
                <Field guide="sector" label="Kaam ka prakaar *">
                  <AdminSelect
                    value={quickSector}
                    onChange={(e) =>
                      changeSector(e.target.value as typeof quickSector)
                    }
                  >
                    <option value="all">
                      Sab (
                      {allowedSectors
                        .map((x) => SECTOR_LABEL[x].split(" (")[0])
                        .join(", ")}
                      )
                    </option>
                    {allowedSectors.map((x) => (
                      <option key={x} value={x}>
                        {SECTOR_LABEL[x]}
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
                <Field
                  guide="templateId"
                  label="Kaam / business type *"
                  help={`${eligibleCount} business is yojana mein milte hain`}
                  className="md:col-span-2"
                >
                  <AdminSelect
                    value={quickTemplate}
                    onChange={(e) => setQuickTemplate(e.target.value)}
                  >
                    {eligibleGroups.map((group) => (
                      <optgroup key={group.group} label={group.label}>
                        {group.templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </AdminSelect>
                </Field>

                {rule && input.scheme !== "none" && input.scheme !== "other" ? (
                  <div className="rounded-ds-lg border border-ds-border bg-ds-surface-sunken p-3 text-xs leading-relaxed text-ds-text-secondary md:col-span-2">
                    <p className="font-bold text-ds-text-primary">
                      {scheme?.label ?? "Yojana"} ki shartein
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {scheme?.summary ? <li>{scheme.summary}</li> : null}
                      <li>
                        Umr: {rule.age.min}
                        {rule.age.max ? `–${rule.age.max}` : "+"} saal
                        {rule.education ? `. Padhai: ${rule.education}` : "."}
                      </li>
                      {rule.excludes ? <li>{rule.excludes}</li> : null}
                    </ul>
                  </div>
                ) : null}

                <Field
                  guide="projectCost"
                  label="Project cost (Rs. lakh) *"
                  help={
                    costLimitLakh
                      ? `Is yojana mein zyada se zyada Rs. ${costLimitLakh} lakh`
                      : "Machinery + working capital milakar, jaise 10"
                  }
                >
                  <NumberBox
                    label="Project cost (Rs. lakh) *"
                    nullable
                    value={quickCostLakh}
                    onChange={setQuickCostLakh}
                    suffix="lakh"
                  />
                </Field>
                {report.cost.total > 0 &&
                quickCostLakh !== null &&
                Math.abs(quickCostLakh * 100000 - report.cost.total) > 1000 ? (
                  <p
                    role="note"
                    className={cn(
                      "rounded-ds-md px-3 py-2 text-xs md:col-span-2",
                      STATUS_TONE_CLASS.info,
                    )}
                  >
                    Is DPR ka asli project cost{" "}
                    <strong>{rs(report.cost.total)}</strong> hai: machinery /
                    saaman{" "}
                    {rs(
                      report.cost.fixedCapital +
                        report.cost.preliminary +
                        report.cost.deposits,
                    )}{" "}
                    + working capital {rs(report.cost.workingCapital)}. Upar ka
                    &quot;{quickCostLakh} lakh&quot; sirf &quot;DPR taiyaar
                    karein&quot; dabane par lagta hai (tab machinery dobara
                    banti hai). Loan hamesha asli project cost ke hisaab se hota
                    hai.
                  </p>
                ) : null}
                <Field guide="businessName" label="Business ka naam *">
                  <AdminInput
                    value={input.businessName}
                    onChange={(e) => set("businessName", e.target.value)}
                  />
                </Field>
                <Field guide="promoterName" label="Promoter ka naam *">
                  <AdminInput
                    value={lead.name}
                    onChange={(e) => setLead({ name: e.target.value })}
                  />
                </Field>
                <Field guide="fatherName" label="Pita / pati">
                  <AdminInput
                    value={lead.fatherName}
                    onChange={(e) => setLead({ fatherName: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field guide="age" label="Promoter ki umr">
                    <NumberBox
                      label="Promoter ki umr"
                      nullable
                      value={lead.age}
                      onChange={(v) =>
                        setLead({ age: v === null ? null : Math.round(v) })
                      }
                    />
                  </Field>
                  <Field guide="socialCategory" label="Promoter category">
                    <AdminSelect
                      value={lead.socialCategory}
                      onChange={(e) => changeSocialCategory(e.target.value)}
                    >
                      {PROMOTER_CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </AdminSelect>
                  </Field>
                </div>
                <Field guide="district" label="District *">
                  <AdminInput
                    value={input.district}
                    onChange={(e) => set("district", e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field guide="area" label="Area">
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
                  <Field guide="category" label="Yojana category">
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
                <Field guide="bankName" label="Bank">
                  <AdminInput
                    value={input.bankName}
                    placeholder="Jaise: Bank of Baroda"
                    onChange={(e) => set("bankName", e.target.value)}
                  />
                </Field>
                <Field guide="bankBranch" label="Branch">
                  <AdminInput
                    value={input.bankBranch}
                    placeholder="Jaise: Orai"
                    onChange={(e) => set("bankBranch", e.target.value)}
                  />
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <AdminButton type="button" onClick={buildQuick}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> DPR
                  taiyaar karein
                </AdminButton>
                <span className="text-xs text-ds-text-muted">
                  Upar bhari details (naam, promoter, yojana) nahi badlengi;
                  baaki sab apne aap bharega.
                </span>
              </div>
            </div>
          </div>
        </AdminCard>

        <nav
          aria-label="DPR ke 18 kadam"
          className="rounded-ds-xl border border-ds-border bg-ds-surface p-3"
        >
          <p className="mb-2 text-xs font-bold text-ds-text-secondary">
            18 kadam: {steps.filter((x) => x.done).length} poore. Kisi par click
            karke wahan jaayein.
          </p>
          <ol className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.label}>
                <button
                  type="button"
                  onClick={() => goTo(step.target)}
                  className="flex w-full items-center gap-2 rounded-ds-md px-2 py-1.5 text-left text-xs hover:bg-ds-surface-sunken"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      step.done
                        ? STATUS_TONE_CLASS.success
                        : STATUS_TONE_CLASS.warning,
                    )}
                  >
                    {step.done ? "✓" : index + 1}
                  </span>
                  <span className="font-semibold text-ds-text-primary">
                    {step.label}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

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
              <Field guide="businessName" label="Business / unit ka naam *">
                <AdminInput
                  value={input.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                />
              </Field>
              <Field guide="constitution" label="Constitution">
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
                guide="activity"
                label="Kaam / activity"
                help="Jaise: manufacturing of wheat flour, computer training centre"
                className="md:col-span-2"
              >
                <AdminInput
                  value={input.activity}
                  onChange={(e) => set("activity", e.target.value)}
                />
              </Field>
              <Field guide="address" label="Address" className="md:col-span-2">
                <AdminInput
                  value={input.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </Field>
              <Field guide="district" label="District">
                <AdminInput
                  value={input.district}
                  onChange={(e) => set("district", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field guide="state" label="State">
                  <AdminInput
                    value={input.state}
                    onChange={(e) => set("state", e.target.value)}
                  />
                </Field>
                <Field guide="pincode" label="Pincode">
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
              <Field guide="premises" label="Premises">
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
                <Field guide="udyamNumber" label="Udyam no.">
                  <AdminInput
                    value={input.udyamNumber}
                    onChange={(e) => set("udyamNumber", e.target.value)}
                  />
                </Field>
                <Field guide="gstin" label="GSTIN">
                  <AdminInput
                    value={input.gstin}
                    onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                  />
                </Field>
                <Field guide="pan" label="PAN">
                  <AdminInput
                    value={input.pan}
                    maxLength={10}
                    onChange={(e) => set("pan", e.target.value.toUpperCase())}
                  />
                </Field>
              </div>
              <Field guide="bankName" label="Bank ka naam">
                <AdminInput
                  value={input.bankName}
                  onChange={(e) => set("bankName", e.target.value)}
                />
              </Field>
              <Field guide="bankBranch" label="Branch">
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
                  <Field guide="promoterName" label="Naam">
                    <AdminInput
                      value={p.name}
                      onChange={(e) =>
                        updateAt("promoters", index, { name: e.target.value })
                      }
                    />
                  </Field>
                  <Field guide="fatherName" label="Pita / pati ka naam">
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
                    <Field guide="age" label="Umr">
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
                    <Field guide="socialCategory" label="Category">
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
                  <Field guide="qualification" label="Qualification">
                    <AdminInput
                      value={p.qualification}
                      onChange={(e) =>
                        updateAt("promoters", index, {
                          qualification: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field
                    guide="experience"
                    label="Experience"
                    className="md:col-span-2"
                  >
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
                  <Field guide="mobile" label="Mobile">
                    <AdminInput
                      value={p.mobile}
                      inputMode="tel"
                      onChange={(e) =>
                        updateAt("promoters", index, { mobile: e.target.value })
                      }
                    />
                  </Field>
                  <Field guide="email" label="Email">
                    <AdminInput
                      value={p.email}
                      type="email"
                      onChange={(e) =>
                        updateAt("promoters", index, { email: e.target.value })
                      }
                    />
                  </Field>
                  <Field guide="gender" label="Gender">
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
              <Field guide="scheme" label="Loan yojana">
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
                <Field guide="startFy" label="Pehla saal (FY)">
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
                <Field guide="years" label="Kitne saal ka projection">
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
              <Field guide="sector" label="Sector">
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
                <Field guide="area" label="Area">
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
                <Field guide="category" label="Category (yojana ke liye)">
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
                guide="ownContributionPct"
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
              <Field guide="termLoanInterestPct" label="Term loan byaaj">
                <NumberBox
                  label="Term loan byaaj"
                  value={input.termLoanInterestPct}
                  onChange={(v) => set("termLoanInterestPct", v ?? 0)}
                  suffix="%"
                />
              </Field>
              <Field guide="ccInterestPct" label="CC byaaj">
                <NumberBox
                  label="CC byaaj"
                  value={input.ccInterestPct}
                  onChange={(v) => set("ccInterestPct", v ?? 0)}
                  suffix="%"
                />
              </Field>
              <Field
                guide="taxRegime"
                label="Income tax"
                help={
                  input.taxRegime === "manual"
                    ? undefined
                    : "Constitution aur slab se apne aap"
                }
              >
                <AdminSelect
                  value={input.taxRegime}
                  onChange={(e) =>
                    set("taxRegime", e.target.value as DprInput["taxRegime"])
                  }
                >
                  <option value="new">New regime (115BAC)</option>
                  <option value="old">Old regime</option>
                  <option value="manual">Khud % likhein</option>
                </AdminSelect>
              </Field>
              {input.taxRegime === "manual" ? (
                <Field guide="taxPct" label="Tax (net profit par)">
                  <NumberBox
                    label="Tax percent"
                    value={input.taxPct}
                    onChange={(v) => set("taxPct", v ?? 0)}
                    suffix="%"
                  />
                </Field>
              ) : null}
              <Field guide="repaymentMethod" label="Kisht ka tarika">
                <AdminSelect
                  value={input.repaymentMethod}
                  onChange={(e) =>
                    set(
                      "repaymentMethod",
                      e.target.value as DprInput["repaymentMethod"],
                    )
                  }
                >
                  <option value="equal_principal">
                    Barabar principal + byaaj
                  </option>
                  <option value="emi">EMI</option>
                </AdminSelect>
              </Field>
              <Field guide="repaymentFrequency" label="Kisht kab">
                <AdminSelect
                  value={input.repaymentFrequency}
                  onChange={(e) =>
                    set(
                      "repaymentFrequency",
                      e.target.value as DprInput["repaymentFrequency"],
                    )
                  }
                >
                  <option value="monthly">Har mahine</option>
                  <option value="quarterly">Har teen mahine</option>
                </AdminSelect>
              </Field>
              <Field
                guide="otherFunding"
                label="Dusra funding (unsecured)"
                help="Parivar / dost se loan, agar hai"
              >
                <NumberBox
                  label="Other funding"
                  value={input.otherFunding}
                  onChange={(v) => set("otherFunding", v ?? 0)}
                />
              </Field>
              <Field
                guide="tenureYears"
                label="Loan avadhi (saal)"
                help="Moratorium milakar"
              >
                <NumberBox
                  label="Loan avadhi"
                  value={input.tenureYears}
                  onChange={(v) => set("tenureYears", v ?? 1)}
                  suffix="saal"
                />
              </Field>
              <Field
                guide="moratoriumMonths"
                label="Moratorium (mahine)"
                help="Sirf byaaj, kisht nahi"
              >
                <NumberBox
                  label="Moratorium"
                  value={input.moratoriumMonths}
                  onChange={(v) => set("moratoriumMonths", Math.round(v ?? 0))}
                  suffix="mah."
                />
              </Field>
              <Field
                guide="termLoanOverride"
                label="Term loan (khud likhein)"
                help={`Khaali = auto (${rs(report.means.termLoan)}). Term loan aur CC dono likhne par apna hissa baaki raashi se nikalega.`}
              >
                <NumberBox
                  label="Term loan"
                  nullable
                  value={input.termLoanOverride}
                  onChange={(v) => set("termLoanOverride", v)}
                />
              </Field>
              <Field
                guide="ccLimitOverride"
                label="CC limit (khud likhein)"
                help={`Khaali = auto (${rs(report.means.ccLimit)}). Sirf ek likhein to dusra baaki raashi le lega.`}
              >
                <NumberBox
                  label="CC limit"
                  nullable
                  value={input.ccLimitOverride}
                  onChange={(v) => set("ccLimitOverride", v)}
                />
              </Field>
              <Field
                guide="subsidyOverride"
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
              <Field
                guide="interestSubventionPct"
                label="Byaaj chhoot %"
                help="Khaali = yojana se"
              >
                <NumberBox
                  label="Byaaj chhoot"
                  nullable
                  value={input.interestSubventionPct}
                  onChange={(v) => set("interestSubventionPct", v)}
                  suffix="%"
                />
              </Field>
              <Field
                guide="interestSubventionYears"
                label="Chhoot kitne saal"
                help="Khaali = yojana se"
              >
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
                guide="drawingsPerYear"
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
            guide="capitalItem"
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
                  {!["land", "preliminary", "licences", "deposit"].includes(
                    item.kind,
                  ) ? (
                    <div className="grid gap-2 sm:grid-cols-2 md:col-span-6">
                      <AdminInput
                        aria-label="Supplier"
                        placeholder="Supplier ka naam (quotation wala)"
                        value={item.supplier ?? ""}
                        onChange={(e) =>
                          updateAt("capitalItems", index, {
                            supplier: e.target.value,
                          })
                        }
                      />
                      <AdminInput
                        aria-label="Quotation no. / tareekh"
                        placeholder="Quotation no. / tareekh"
                        value={item.quotationRef ?? ""}
                        onChange={(e) =>
                          updateAt("capitalItems", index, {
                            quotationRef: e.target.value,
                          })
                        }
                      />
                    </div>
                  ) : null}
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
              <Field
                guide="contingencyPct"
                label="Contingency %"
                help="Machine / building par, aam taur par 0–5%"
              >
                <NumberBox
                  label="Contingency"
                  value={input.contingencyPct}
                  onChange={(v) => set("contingencyPct", v ?? 0)}
                  suffix="%"
                />
              </Field>
              <Field
                guide="depreciationMethod"
                label="Depreciation ka tarika"
                help={`Abhi: ${report.depreciationMethod}`}
              >
                <AdminSelect
                  value={input.depreciationMethod}
                  onChange={(e) =>
                    set(
                      "depreciationMethod",
                      e.target.value as DprInput["depreciationMethod"],
                    )
                  }
                >
                  <option value="auto">
                    Auto (proprietor / firm WDV, company SLM)
                  </option>
                  <option value="wdv">WDV (Income-tax rates)</option>
                  <option value="slm">SLM (Companies Act life)</option>
                </AdminSelect>
              </Field>
              <Field
                guide="preliminaryWriteOffYears"
                label="Preliminary kharch kitne saal mein write-off"
              >
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
                  (k) =>
                    !["land", "preliminary", "licences", "deposit"].includes(
                      k.value,
                    ),
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
            guide="product"
            hint="Capacity = 100% chalne par saal bhar mein kitna banega. Process loss = banate waqt barbaad; rejection = wapas / kharab. Sales = (capacity × utilisation − loss − rejection) × rate."
          >
            <div className="space-y-2">
              {input.products.map((p, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-ds-lg border border-ds-border p-2 md:grid-cols-[1fr_6rem_8rem_8rem_6rem_6rem_auto] md:items-center"
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
                  <NumberBox
                    label="Process loss %"
                    value={p.processLossPct ?? 0}
                    onChange={(v) =>
                      updateAt("products", index, { processLossPct: v ?? 0 })
                    }
                    placeholder="Loss"
                    suffix="%"
                  />
                  <NumberBox
                    label="Rejection %"
                    value={p.rejectionPct ?? 0}
                    onChange={(v) =>
                      updateAt("products", index, { rejectionPct: v ?? 0 })
                    }
                    placeholder="Reject"
                    suffix="%"
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
                  <Field
                    key={index}
                    guide="utilisation"
                    label={fyLabel(input.startFy + index)}
                  >
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
                guide="priceGrowthPct"
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
              <Field
                guide="costGrowthPct"
                label="Salary aur kharche badhotri / saal"
              >
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
            guide="rawMaterial"
            hint="Material ko product se jodein (per unit kitna lagta hai) taaki utpadan aur kachcha maal hamesha mel khaayein. Service project mein raw material na ho to khaali chhod dein."
          >
            <div className="space-y-2">
              {input.rawMaterials.map((m, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-ds-lg border border-ds-border p-2 md:grid-cols-[1fr_6rem_8rem_8rem_auto] md:items-center"
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
                  {m.productIndex !== null &&
                  m.productIndex !== undefined &&
                  input.products[m.productIndex] ? (
                    <p
                      className="text-right text-xs tabular-nums text-ds-text-muted"
                      aria-label="Quantity per year"
                    >
                      {formatAmount(
                        (input.products[m.productIndex].capacity || 0) *
                          (m.perUnit || 0) *
                          (1 + (m.lossPct || 0) / 100),
                      )}{" "}
                      / saal
                    </p>
                  ) : (
                    <NumberBox
                      label="Quantity per year"
                      value={m.quantity}
                      onChange={(v) =>
                        updateAt("rawMaterials", index, { quantity: v ?? 0 })
                      }
                      placeholder="Qty / saal"
                    />
                  )}
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
                  <div className="grid gap-2 sm:grid-cols-3 md:col-span-5">
                    <AdminSelect
                      aria-label="Kis product ke liye"
                      value={
                        m.productIndex === null || m.productIndex === undefined
                          ? ""
                          : String(m.productIndex)
                      }
                      onChange={(e) =>
                        updateAt("rawMaterials", index, {
                          productIndex:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                          perUnit:
                            m.perUnit ?? (e.target.value === "" ? null : 1),
                        })
                      }
                    >
                      <option value="">Saal bhar ka andaaza (link nahi)</option>
                      {input.products.map((p, i) => (
                        <option key={i} value={i}>
                          Har {p.unit || "unit"} {p.name || `product ${i + 1}`}{" "}
                          par
                        </option>
                      ))}
                    </AdminSelect>
                    {m.productIndex !== null && m.productIndex !== undefined ? (
                      <>
                        <NumberBox
                          label="Per unit consumption"
                          value={m.perUnit ?? null}
                          nullable
                          onChange={(v) =>
                            updateAt("rawMaterials", index, { perUnit: v })
                          }
                          placeholder="Per unit"
                        />
                        <NumberBox
                          label="Material loss %"
                          value={m.lossPct ?? 0}
                          onChange={(v) =>
                            updateAt("rawMaterials", index, { lossPct: v ?? 0 })
                          }
                          placeholder="Loss"
                          suffix="%"
                        />
                      </>
                    ) : null}
                  </div>
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
            guide="staff"
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
                  <div className="flex items-center gap-2">
                    <AdminInput
                      aria-label="Kharcha"
                      placeholder="Kharcha"
                      value={o.name}
                      onChange={(e) =>
                        updateAt("overheads", index, { name: e.target.value })
                      }
                    />
                    {o.estimated ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                          STATUS_TONE_CLASS.warning,
                        )}
                        title="Andaaza; asli figure bharein"
                      >
                        Estimate
                      </span>
                    ) : null}
                  </div>
                  <NumberBox
                    label="Per month"
                    value={o.monthly}
                    onChange={(v) =>
                      updateAt("overheads", index, {
                        monthly: v ?? 0,
                        estimated: false,
                      })
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
            {missingCosts.length ? (
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-ds-lg px-3 py-2 text-sm",
                  STATUS_TONE_CLASS.warning,
                )}
              >
                <span>
                  Ye kharche nahi bhare:{" "}
                  {missingCosts.map((c) => c.label).join(", ")}.
                </span>
                <AdminButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setInput((current) => withEstimatedCosts(current))
                  }
                >
                  Missing kharche estimate se bharein
                </AdminButton>
              </div>
            ) : null}
            <Field
              guide="employerContributionPct"
              label="Employer EPF / ESI %"
              help="Khaali = staff sankhya ke hisaab se apne aap (ESI 10+, EPF 20+)"
            >
              <NumberBox
                label="Employer contribution"
                nullable
                value={input.employerContributionPct}
                onChange={(v) => set("employerContributionPct", v)}
                suffix="%"
              />
            </Field>
          </Section>

          <Section
            step={7}
            title="Working capital"
            hint="Kitne din ka maal stock mein rahega, grahak kitne din mein paisa denge, supplier kitne din ka udhaar denge."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field guide="rawMaterialDays" label="Raw material stock">
                <NumberBox
                  label="Raw material days"
                  value={input.rawMaterialDays}
                  onChange={(v) => set("rawMaterialDays", v ?? 0)}
                  suffix="din"
                />
              </Field>
              <Field guide="workInProgressDays" label="Ban raha maal (WIP)">
                <NumberBox
                  label="WIP days"
                  value={input.workInProgressDays}
                  onChange={(v) => set("workInProgressDays", v ?? 0)}
                  suffix="din"
                />
              </Field>
              <Field guide="finishedGoodsDays" label="Taiyar maal stock">
                <NumberBox
                  label="Finished goods days"
                  value={input.finishedGoodsDays}
                  onChange={(v) => set("finishedGoodsDays", v ?? 0)}
                  suffix="din"
                />
              </Field>
              <Field guide="debtorDays" label="Debtors (udhaar bikri)">
                <NumberBox
                  label="Debtor days"
                  value={input.debtorDays}
                  onChange={(v) => set("debtorDays", v ?? 0)}
                  suffix="din"
                />
              </Field>
              <Field guide="creditorDays" label="Creditors (supplier udhaar)">
                <NumberBox
                  label="Creditor days"
                  value={input.creditorDays}
                  onChange={(v) => set("creditorDays", v ?? 0)}
                  suffix="din"
                />
              </Field>
              <Field guide="minimumCashDays" label="Kam se kam cash">
                <NumberBox
                  label="Minimum cash days"
                  value={input.minimumCashDays}
                  onChange={(v) => set("minimumCashDays", v ?? 0)}
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
            guide="narrative"
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
          <Section
            step={9}
            title="Licences, compliance aur final review"
            hint="Is project ke liye zaroori approvals, report ki jaanch aur kya abhi baaki hai."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-bold text-ds-text-secondary">
                  Zaroori approvals
                </p>
                <ul className="space-y-1 text-xs text-ds-text-secondary">
                  {compliance
                    .filter((c) => c.level === "mandatory")
                    .map((c) => (
                      <li key={c.name} className="flex gap-1.5">
                        <span aria-hidden="true">•</span>
                        <span>
                          <strong className="text-ds-text-primary">
                            {c.name}
                          </strong>{" "}
                          — {c.authority}
                          {c.status === "verification_required"
                            ? " (confirm karein)"
                            : ""}
                        </span>
                      </li>
                    ))}
                </ul>
                <p className="mb-1 mt-3 text-xs font-bold text-ds-text-secondary">
                  Shart ke saath (conditional)
                </p>
                <ul className="space-y-1 text-xs text-ds-text-secondary">
                  {compliance
                    .filter((c) => c.level === "conditional")
                    .map((c) => (
                      <li key={c.name} className="flex gap-1.5">
                        <span aria-hidden="true">•</span>
                        <span>
                          <strong className="text-ds-text-primary">
                            {c.name}
                          </strong>{" "}
                          — {c.basis}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold text-ds-text-secondary">
                  Report ki jaanch
                </p>
                <ul className="space-y-1 text-xs" aria-label="Report ki jaanch">
                  {(
                    [
                      [
                        "Project cost = sab heads ka jod",
                        report.checks.costReconciles,
                      ],
                      [
                        "Means of finance = project cost",
                        report.checks.meansReconcile,
                      ],
                      [
                        "Loan avadhi ke ant tak zero",
                        report.checks.loanReconciles,
                      ],
                      [
                        "Balance sheet tally",
                        report.checks.balanceSheetBalances,
                      ],
                      [
                        "Cash flow = balance sheet cash",
                        report.checks.cashFlowReconciles,
                      ],
                    ] as [string, boolean][]
                  ).map(([label, ok]) => (
                    <li
                      key={label}
                      className={cn(
                        "flex items-center gap-1.5 rounded-ds-md px-2 py-1 font-semibold",
                        ok
                          ? STATUS_TONE_CLASS.success
                          : STATUS_TONE_CLASS.danger,
                      )}
                    >
                      {ok ? (
                        <CheckCircle2
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <AlertTriangle
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      )}
                      {label}
                    </li>
                  ))}
                </ul>
                {report.dataGaps.length ? (
                  <>
                    <p className="mb-1 mt-3 text-xs font-bold text-ds-text-secondary">
                      Report mein &quot;confirm karna baaki&quot; ke roop mein
                      chhapega
                    </p>
                    <ul className="list-disc space-y-0.5 pl-4 text-xs text-ds-text-secondary">
                      {report.dataGaps.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </div>
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

      <LiveSummary
        report={report}
        extraWarnings={eligibility}
        fixes={[
          ...((input.termLoanOverride !== null ||
            input.ccLimitOverride !== null) &&
          (report.means.gap !== 0 ||
            report.warnings.some((w) => w.startsWith("Apna hissa")))
            ? [
                {
                  label: `Loan apne aap theek karein (${report.scheme?.ownContributionPct ?? 25}% apna + baaki loan = ${rs(report.cost.total)})`,
                  apply: () =>
                    setInput((current) => ({
                      ...current,
                      termLoanOverride: null,
                      ccLimitOverride: null,
                    })),
                },
              ]
            : []),
          ...(report.means.ccLimit > report.cost.workingCapital + 1 &&
          report.cost.workingCapital > 0
            ? [
                {
                  label: `CC = working capital zaroorat (${rs(report.cost.workingCapital)}), baaki term loan`,
                  apply: () =>
                    setInput((current) => ({
                      ...current,
                      ccLimitOverride: report.cost.workingCapital,
                      termLoanOverride: null,
                    })),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}

function LiveSummary({
  report,
  extraWarnings = [],
  fixes = [],
}: {
  report: ReturnType<typeof buildDpr>;
  extraWarnings?: string[];
  /** One-click corrections for the warnings shown. */
  fixes?: { label: string; apply: () => void }[];
}) {
  const y1 = report.years[0];
  const warnings = [...extraWarnings, ...report.warnings];
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
        {fixes.length ? (
          <div className="space-y-1.5" aria-label="Theek karein">
            {fixes.map((fix) => (
              <AdminButton
                key={fix.label}
                type="button"
                size="sm"
                className="h-auto w-full whitespace-normal py-2 text-left"
                onClick={fix.apply}
              >
                <Wand2 className="h-4 w-4 shrink-0" aria-hidden="true" />{" "}
                {fix.label}
              </AdminButton>
            ))}
          </div>
        ) : null}
        {warnings.length ? (
          <ul className="space-y-1.5" aria-label="Dhyan dene wali baatein">
            {warnings.map((warning) => (
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
