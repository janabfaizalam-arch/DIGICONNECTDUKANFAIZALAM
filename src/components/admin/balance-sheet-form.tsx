"use client";

import { cloneElement, createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, Info, Sparkles } from "lucide-react";

import { BalanceSheetAutofill, type AutofillItem } from "@/components/admin/balance-sheet-autofill";
import { BalanceSheetQuick, type QuickDetails, type QuickSeed } from "@/components/admin/balance-sheet-quick";
import type { QuickResult } from "@/lib/balance-sheets/quick";
import { AdminButton, AdminField, AdminInput, AdminSelect, AdminTextarea } from "@/components/admin/primitives/controls-ui";
import { AdminCard, AdminSection } from "@/components/admin/primitives/layout";
import {
  CONSTITUTIONS,
  buildStatements,
  defaultProjection,
  effectiveAssumptions,
  emptyActual,
  formatAmount,
  fyLabel,
  NOT_TALLY_WARNING_PREFIX,
  type ActualFigures,
  type Constitution,
  type ProjectFinance,
  type ProjectionAssumptions,
} from "@/lib/balance-sheets/engine";
import { STATUS_TONE_CLASS, STATUS_TONE_TEXT } from "@/lib/admin/status-tone";
import {
  AREA_OPTIONS,
  CATEGORY_OPTIONS,
  SCHEME_OPTIONS,
  SECTOR_OPTIONS,
  mudraCategory,
  schemeSuggestion,
  termsFor,
} from "@/lib/balance-sheets/schemes";
import { FIELD_GUIDE, GUIDE_HEADINGS, IMPORTANCE_LABEL, type GuideKey, type Importance } from "@/lib/balance-sheets/field-guide";
import { CHOICE_PROJECTION_KEYS, checkBalanceSheet, FIELD_LABELS, FIELD_ORDER, type CheckResult, type DetailKey, type FieldKey } from "@/lib/balance-sheets/checks";
import { cn } from "@/lib/utils";

/**
 * The admin's form for a customer's balance sheet.
 *
 * Everything is typed in as text and turned into numbers only when the
 * statements are worked out, so a half-typed figure never jumps around under
 * the cursor. The statements on the right are the same engine the PDF uses,
 * recalculated on every keystroke.
 */

type Draft = {
  businessName: string;
  ownerName: string;
  constitution: Constitution;
  natureOfBusiness: string;
  pan: string;
  gstin: string;
  udyamNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  mobile: string;
  email: string;
  bankName: string;
  loanPurpose: string;
  loanAmount: string;
  baseYear: string;
  hasActual: boolean;
  actual: Record<keyof ActualFigures, string>;
  projection: Record<keyof ProjectionAssumptions, string>;
};

export type BalanceSheetFormInitial = Partial<{
  businessName: string;
  ownerName: string;
  constitution: Constitution;
  natureOfBusiness: string | null;
  pan: string | null;
  gstin: string | null;
  udyamNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  mobile: string | null;
  email: string | null;
  bankName: string | null;
  loanPurpose: string | null;
  loanAmount: number | null;
  baseYear: number;
  hasActual: boolean;
  actual: ActualFigures;
  projection: ProjectionAssumptions;
}>;

const toText = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));
const toNumber = (value: string) => {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};
const toNullable = (value: string) => (value.replace(/,/g, "").trim() === "" ? null : toNumber(value));

/** The financial year that ended most recently on 31st March. */
function lastCompletedFy() {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
}

function initialDraft(initial: BalanceSheetFormInitial): Draft {
  const actual = { ...emptyActual(), ...(initial.actual ?? {}) };
  const projection = { ...defaultProjection(), ...(initial.projection ?? {}) };
  return {
    businessName: initial.businessName ?? "",
    ownerName: initial.ownerName ?? "",
    constitution: initial.constitution ?? "proprietorship",
    natureOfBusiness: initial.natureOfBusiness ?? "",
    pan: initial.pan ?? "",
    gstin: initial.gstin ?? "",
    udyamNumber: initial.udyamNumber ?? "",
    address: initial.address ?? "",
    city: initial.city ?? "",
    state: initial.state ?? "",
    pincode: initial.pincode ?? "",
    mobile: initial.mobile ?? "",
    email: initial.email ?? "",
    bankName: initial.bankName ?? "",
    loanPurpose: initial.loanPurpose ?? "",
    loanAmount: toText(initial.loanAmount),
    baseYear: String(initial.baseYear ?? lastCompletedFy()),
    hasActual: initial.hasActual ?? true,
    actual: Object.fromEntries(Object.entries(actual).map(([key, value]) => [key, value ? String(value) : ""])) as Draft["actual"],
    projection: Object.fromEntries(Object.entries(projection).map(([key, value]) => [key, toText(value as number | null)])) as Draft["projection"],
  };
}

const NULLABLE_PROJECTION = new Set<keyof ProjectionAssumptions>([
  "year1Sales",
  "materialCostPct",
  "indirectExpensesYear1",
  "otherIncomePerYear",
  "debtorDays",
  "creditorDays",
  "stockDays",
]);

function figuresFrom(draft: Draft) {
  const actual = Object.fromEntries(Object.entries(draft.actual).map(([key, value]) => [key, toNumber(value)])) as ActualFigures;
  const projection = Object.fromEntries(
    Object.entries(draft.projection).map(([key, value]) => [
      key,
      CHOICE_PROJECTION_KEYS.has(key as keyof ProjectionAssumptions)
        ? value
        : NULLABLE_PROJECTION.has(key as keyof ProjectionAssumptions)
          ? toNullable(value)
          : toNumber(value),
    ]),
  ) as unknown as ProjectionAssumptions;
  return {
    baseYear: Number(draft.baseYear) || lastCompletedFy(),
    hasActual: draft.hasActual,
    constitution: draft.constitution,
    actual,
    projection,
  };
}

/** The live check results, so each field can find its own mistake. */
const ChecksContext = createContext<{
  result: CheckResult;
  touch: (key: DetailKey) => void;
  /** Boxes filled from a document, with where from; cleared when the admin edits the box. */
  autofilled: ReadonlyMap<string, string>;
  clearAutofill: (key: string) => void;
} | null>(null);

const DETAIL_KEYS = new Set<FieldKey>(["businessName", "ownerName", "pan", "gstin", "mobile", "pincode", "email", "loanAmount"]);

/** A stable DOM id per field, so the summary can jump straight to the box. */
export const fieldDomId = (key: FieldKey | GuideKey) => `bs-${key.replace(".", "-")}`;

type ControlProps = {
  onInput?: (event: never) => void;
  id?: string;
  "aria-describedby"?: string;
  invalid?: boolean;
  className?: string;
  onBlur?: (event: never) => void;
  onFocus?: (event: never) => void;
  onKeyDown?: (event: never) => void;
};

const IMPORTANCE_TONE: Record<Importance, "danger" | "warning" | "neutral"> = {
  required: "danger",
  important: "warning",
  optional: "neutral",
};

/** How long the pointer has to rest on a box before its guide opens. */
const HOVER_DELAY_MS = 450;

/**
 * AdminField with its label tied to the control, the field's mistake shown
 * right under it (an error turns the box red, a warning puts an amber note),
 * and a guide card saying what to enter, where to find it, why it matters and
 * whether it can be left blank.
 *
 * The card opens when the pointer rests on the field or the box gets focus
 * (so a tap on a phone opens it too), and closes on typing, Escape, blur or
 * the pointer leaving. Its text is always in the DOM and tied to the input
 * with aria-describedby, so a screen reader hears it without hovering.
 */
function Field({
  children,
  help,
  field,
  guide: guideKey,
  ...props
}: Omit<ComponentProps<typeof AdminField>, "htmlFor" | "children" | "error"> & {
  field?: FieldKey;
  guide?: GuideKey;
  children: ReactElement<ControlProps>;
}) {
  const generated = useId();
  const checks = useContext(ChecksContext);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const domKey = field ?? guideKey;
  const id = domKey ? fieldDomId(domKey) : generated;
  const issue = field ? checks?.result.issues[field] : undefined;
  const isError = issue?.level === "error";
  const isWarning = issue?.level === "warning";
  const guide = FIELD_GUIDE[(guideKey ?? field) as GuideKey] as (typeof FIELD_GUIDE)[GuideKey] | undefined;
  const guideId = `${id}-guide`;
  const describedBy =
    [isError ? `${id}-error` : isWarning ? `${id}-warning` : help ? `${id}-help` : null, guide ? guideId : null].filter(Boolean).join(" ") || undefined;

  const cancelTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const close = () => {
    cancelTimer();
    setOpen(false);
  };

  const filledFrom = domKey ? checks?.autofilled.get(domKey) : undefined;
  const control = cloneElement(children, {
    id,
    "aria-describedby": [describedBy, filledFrom ? `${id}-filled` : null].filter(Boolean).join(" ") || undefined,
    onInput: (event: never) => {
      children.props.onInput?.(event);
      if (filledFrom && domKey) checks?.clearAutofill(domKey);
    },
    invalid: isError || undefined,
    className: cn(children.props.className, isWarning && "ring-2 ring-ds-warning"),
    onFocus: (event: never) => {
      children.props.onFocus?.(event);
      if (guide) setOpen(true);
    },
    onBlur: (event: never) => {
      children.props.onBlur?.(event);
      close();
      if (field && DETAIL_KEYS.has(field)) checks?.touch(field as DetailKey);
    },
    onKeyDown: (event: never) => {
      children.props.onKeyDown?.(event);
      const key = (event as unknown as KeyboardEvent).key;
      // Typing means the admin knows what to enter; get out of the way.
      if (key === "Escape" || key.length === 1 || key === "Backspace" || key === "Delete") close();
    },
  });

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (!guide) return;
        cancelTimer();
        timer.current = setTimeout(() => setOpen(true), HOVER_DELAY_MS);
      }}
      onMouseLeave={close}
    >
      <AdminField {...props} help={isWarning ? undefined : help} error={isError ? issue.message : undefined} htmlFor={id}>
        {control}
      </AdminField>
      {filledFrom ? (
        <p id={`${id}-filled`} className={cn("mt-1 flex gap-1 text-xs font-semibold", STATUS_TONE_TEXT.info)}>
          <Sparkles className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Document se bhara: {filledFrom}. Ek baar check karein.
        </p>
      ) : null}
      {isWarning ? (
        <p id={`${id}-warning`} className={cn("mt-1.5 flex gap-1 text-xs font-semibold", STATUS_TONE_TEXT.warning)}>
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {issue.message}
        </p>
      ) : null}
      {guide ? (
        <div
          id={guideId}
          role="tooltip"
          hidden={!open}
          className="absolute left-0 top-full z-30 mt-1.5 w-full min-w-[16rem] max-w-[min(22rem,calc(100vw-2rem))] rounded-ds-md border border-ds-border bg-ds-surface p-3 text-xs leading-snug text-ds-text-secondary shadow-ds-lg"
        >
          <span className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 font-bold text-ds-text-primary">
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {props.label.replace(/ \((?:Rs\.|[^)]*)\)$/, "")}
            </span>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", STATUS_TONE_CLASS[IMPORTANCE_TONE[guide.importance]])}>
              {IMPORTANCE_LABEL[guide.importance]}
            </span>
          </span>
          <span className="mt-2 block">
            <span className="font-semibold text-ds-text-primary">{GUIDE_HEADINGS.what}: </span>
            {guide.what}
          </span>
          <span className="mt-1.5 block">
            <span className="font-semibold text-ds-text-primary">{GUIDE_HEADINGS.where}: </span>
            {guide.where}
          </span>
          <span className="mt-1.5 block">
            <span className="font-semibold text-ds-text-primary">{GUIDE_HEADINGS.why}: </span>
            {guide.why}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function MoneyInput({
  field,
  label,
  value,
  onChange,
  help,
  placeholder,
  suffix,
}: {
  field?: FieldKey;
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <Field field={field} label={suffix ? `${label} (${suffix})` : `${label} (Rs.)`} help={help}>
      <AdminInput
        inputMode="decimal"
        value={value}
        placeholder={placeholder ?? "0"}
        onChange={(event) => onChange(event.target.value.replace(/[^0-9.,]/g, ""))}
        className="text-right tabular-nums"
      />
    </Field>
  );
}

/** Project cost and means of finance, live, the way a DPR lays it out. */
function MeansOfFinance({ finance, mudra }: { finance: ProjectFinance; mudra: boolean }) {
  const category = mudra ? mudraCategory(finance.termLoan + finance.ccLimit) : null;
  const rows: [string, number][] = [
    ["Fixed assets / machinery", finance.fixedAssets],
    ["Working capital", finance.workingCapital],
  ];
  const means: [string, number][] = [
    ["Own contribution", finance.ownContribution],
    ["Term loan", finance.termLoan],
    ["CC / working capital limit", finance.ccLimit],
  ];
  const balanced = Math.abs(finance.gap) <= 1;
  return (
    <div className="overflow-x-auto rounded-ds-md border border-ds-border" data-testid="means-of-finance">
      <table className="w-full min-w-[420px] border-collapse text-[13px]">
        <caption className="border-b border-ds-border px-3 py-2 text-left font-bold text-ds-text-primary">Project cost aur means of finance (Rs.)</caption>
        <tbody>
          <tr className="bg-ds-surface-sunken">
            <th scope="col" className="px-3 py-1.5 text-left font-bold">Project cost</th>
            <th scope="col" className="px-3 py-1.5 text-right font-bold">Amount</th>
            <th scope="col" className="px-3 py-1.5 text-left font-bold">Means of finance</th>
            <th scope="col" className="px-3 py-1.5 text-right font-bold">Amount</th>
          </tr>
          {[0, 1, 2].map((index) => (
            <tr key={index}>
              <td className="px-3 py-1">{rows[index]?.[0] ?? ""}</td>
              <td className="px-3 py-1 text-right tabular-nums">{rows[index] ? formatAmount(rows[index][1]) : ""}</td>
              <td className="px-3 py-1">{means[index][0]}</td>
              <td className="px-3 py-1 text-right tabular-nums">{formatAmount(means[index][1])}</td>
            </tr>
          ))}
          <tr className="border-t border-ds-border font-bold">
            <td className="px-3 py-1.5">Total</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(finance.totalCost)}</td>
            <td className="px-3 py-1.5">Total</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(finance.totalMeans)}</td>
          </tr>
        </tbody>
      </table>
      <p className={cn("border-t border-ds-border px-3 py-2 text-[12.5px] font-semibold", balanced ? STATUS_TONE_TEXT.success : STATUS_TONE_TEXT.danger)}>
        {balanced
          ? "Means of finance project cost ke barabar hai."
          : finance.gap < 0
            ? `Means of finance Rs. ${formatAmount(-finance.gap)} kam hai.`
            : `Means of finance Rs. ${formatAmount(finance.gap)} zyada hai.`}
        {finance.subsidy > 0 ? ` Back-ended subsidy Rs. ${formatAmount(finance.subsidy)} bank ke paas TDR mein rahegi.` : ""}
        {category ? ` Mudra category: ${category.name}.` : ""}
      </p>
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export function BalanceSheetForm({ id, initial = {} }: { id?: string; initial?: BalanceSheetFormInitial }) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(initial));
  const [saving, setSaving] = useState<"draft" | "final" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRequired, setShowRequired] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<DetailKey>>(() => new Set());

  const figures = useMemo(() => figuresFrom(draft), [draft]);
  const statements = useMemo(() => buildStatements(figures), [figures]);
  const checkInput = (forceRequired: boolean) => ({
    details: {
      businessName: draft.businessName,
      ownerName: draft.ownerName,
      pan: draft.pan,
      gstin: draft.gstin,
      mobile: draft.mobile,
      pincode: draft.pincode,
      email: draft.email,
      loanAmount: draft.loanAmount,
    },
    hasActual: draft.hasActual,
    actualText: draft.actual,
    projectionText: draft.projection,
    statements,
    showRequired: showRequired || forceRequired,
    touched,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- checkInput only reads the values listed
  const checks = useMemo(() => checkBalanceSheet(checkInput(false)), [draft, statements, showRequired, touched]);
  const [autofilled, setAutofilled] = useState<ReadonlyMap<string, string>>(() => new Map());
  const checksContext = useMemo(
    () => ({
      result: checks,
      touch: (key: DetailKey) => setTouched((current) => (current.has(key) ? current : new Set([...current, key]))),
      autofilled,
      clearAutofill: (key: string) =>
        setAutofilled((current) => {
          if (!current.has(key)) return current;
          const next = new Map(current);
          next.delete(key);
          return next;
        }),
    }),
    [checks, autofilled],
  );

  /** The text a box holds now, for the review table's "Abhi form mein" column. */
  const currentValue = (field: string) => {
    if (field.startsWith("actual.")) return draft.actual[field.slice(7) as keyof ActualFigures] ?? "";
    if (field.startsWith("projection.")) return draft.projection[field.slice(11) as keyof ProjectionAssumptions] ?? "";
    const value = (draft as unknown as Record<string, unknown>)[field];
    return typeof value === "string" ? value : "";
  };

  function applyAutofill(items: AutofillItem[]) {
    setDraft((current) => {
      const next: Draft = { ...current, actual: { ...current.actual }, projection: { ...current.projection } };
      for (const { field, value } of items) {
        if (field.startsWith("actual.")) {
          next.actual[field.slice(7) as keyof ActualFigures] = value;
          next.hasActual = true;
        } else if (field.startsWith("projection.")) {
          next.projection[field.slice(11) as keyof ProjectionAssumptions] = value;
        } else if (field === "baseYear") {
          // Only years the select offers; anything else would leave it blank.
          const year = Number(value);
          if (year <= lastCompletedFy() + 1 && year >= lastCompletedFy() - 6) next.baseYear = value;
        } else if (field in next && typeof (next as unknown as Record<string, unknown>)[field] === "string") {
          (next as unknown as Record<string, string>)[field] = value;
        }
      }
      return next;
    });
    setAutofilled((current) => {
      const next = new Map(current);
      for (const { field, value, source } of items) {
        if (field === "baseYear" && !(Number(value) <= lastCompletedFy() + 1 && Number(value) >= lastCompletedFy() - 6)) continue;
        next.set(field, source);
      }
      return next;
    });
  }
  const issueList = FIELD_ORDER.flatMap((key) => {
    const issue = checks.issues[key];
    return issue ? [{ key, ...issue }] : [];
  });
  const errorList = issueList.filter((issue) => issue.level === "error");
  const warningList = issueList.filter((issue) => issue.level === "warning");

  const jumpTo = (key: FieldKey) => {
    const element = document.getElementById(fieldDomId(key));
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus({ preventScroll: true });
  };
  const derived = useMemo(() => effectiveAssumptions({ ...figures, projection: { ...figures.projection, materialCostPct: null, debtorDays: null, creditorDays: null, stockDays: null, indirectExpensesYear1: null, otherIncomePerYear: null, year1Sales: null } }), [figures]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setActual = (key: keyof ActualFigures) => (value: string) =>
    setDraft((current) => ({ ...current, actual: { ...current.actual, [key]: value } }));
  const setProjection = (key: keyof ProjectionAssumptions) => (value: string) =>
    setDraft((current) => ({ ...current, projection: { ...current.projection, [key]: value } }));

  const terms = termsFor(figures.projection);
  const projectCost = toNumber(draft.projection.newFixedAssets) + toNumber(draft.projection.workingCapitalNeed);
  const [schemeApplied, setSchemeApplied] = useState(false);
  function applyScheme() {
    if (!terms) return;
    const plan = schemeSuggestion(terms, {
      fixedAssets: toNumber(draft.projection.newFixedAssets),
      workingCapital: toNumber(draft.projection.workingCapitalNeed),
    });
    setDraft((current) => ({
      ...current,
      projection: {
        ...current.projection,
        capitalIntroducedYear1: String(plan.ownContribution),
        subsidyAmount: String(plan.subsidy),
        newTermLoan: String(plan.termLoan),
        ccLimit: String(plan.ccLimit),
        loanTenureYears: String(terms.defaultTenureYears),
        interestSubventionPct: String(terms.interestSubventionPct),
        interestSubventionYears: String(terms.interestSubventionYears),
      },
      loanAmount: current.loanAmount.trim() ? current.loanAmount : String(plan.bankLoan),
    }));
    setSchemeApplied(true);
  }

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  // The quick card starts from what the sheet already holds, so editing works too.
  const [quickSeed] = useState<QuickSeed>(() => {
    const actual = statements.periods.find((period) => period.kind === "actual");
    const text = (v: string) => (toNumber(v) > 0 ? v : "");
    return {
      businessName: draft.businessName,
      ownerName: draft.ownerName,
      constitution: draft.constitution,
      natureOfBusiness: draft.natureOfBusiness,
      mobile: draft.mobile,
      city: draft.city,
      state: draft.state,
      baseYear: draft.baseYear,
      hasActual: draft.hasActual,
      kind: toNumber(draft.actual.sales) > 0 || toNumber(draft.projection.year1Sales) > 0 ? (draft.projection.schemeSector as QuickSeed["kind"]) : "trading",
      sales: draft.hasActual ? text(draft.actual.sales) : draft.projection.year1Sales,
      netProfit: actual && toNumber(draft.actual.sales) > 0 ? String(Math.round(actual.pl.profitBeforeTax)) : "",
      closingStock: text(draft.actual.closingStock),
      cashAndBank: text(draft.actual.cashAndBank),
      fixedAssets: text(draft.actual.fixedAssets),
      loanOutstanding: text(draft.actual.termLoan),
      scheme: (draft.projection.scheme as QuickSeed["scheme"]) || "none",
      schemeArea: (draft.projection.schemeArea as QuickSeed["schemeArea"]) || "urban",
      schemeCategory: (draft.projection.schemeCategory as QuickSeed["schemeCategory"]) || "general",
      machineryCost: text(draft.projection.newFixedAssets),
      workingCapital: text(draft.projection.workingCapitalNeed),
      ownPct: "",
      interestPct: draft.projection.loanInterestPct || "10",
      tenureYears: draft.projection.loanTenureYears || "5",
    };
  });
  function buildFromQuick(details: QuickDetails, result: QuickResult) {
    setDraft((current) => ({
      ...current,
      ...details,
      loanAmount: String(result.loanAmount),
      loanPurpose: current.loanPurpose.trim() || result.loanPurpose,
      actual: Object.fromEntries(Object.entries(result.actual).map(([key, value]) => [key, value ? String(value) : ""])) as Draft["actual"],
      projection: {
        ...current.projection,
        ...(Object.fromEntries(Object.entries(result.projection).map(([key, value]) => [key, toText(value as number | null)])) as Partial<Draft["projection"]>),
      },
    }));
    setPendingSave(true);
  }
  // Save once the built figures have rendered, so the checks see them.
  useEffect(() => {
    if (!pendingSave) return;
    setPendingSave(false);
    void save("draft");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per build
  }, [pendingSave]);

  const actualPeriod = statements.periods.find((period) => period.kind === "actual");
  const projected = statements.periods.filter((period) => period.kind === "projected");
  const baseYear = Number(draft.baseYear) || lastCompletedFy();
  const yearOptions = Array.from({ length: 8 }, (_, index) => lastCompletedFy() + 1 - index);

  async function save(status: "draft" | "final") {
    setError(null);
    setShowRequired(true);
    // Check again with "required" switched on, since the state update above
    // has not rendered yet. A final copy needs every error fixed; a draft only
    // needs what the server itself would refuse (names, PAN, mobile ...).
    const now = checkBalanceSheet(checkInput(true));
    const blocking = FIELD_ORDER.filter((key) => {
      const issue = now.issues[key];
      return issue?.level === "error" && (status === "final" || DETAIL_KEYS.has(key));
    });
    if (blocking.length) {
      setError(
        blocking.length === 1
          ? `Pehle "${FIELD_LABELS[blocking[0]]}" wali galti theek karein.`
          : `Pehle laal box wali ${blocking.length} galtiyan theek karein, "${FIELD_LABELS[blocking[0]]}" se shuru karke.`,
      );
      setDetailsOpen(true);
      requestAnimationFrame(() => jumpTo(blocking[0]));
      return;
    }
    setSaving(status);
    const body = {
      businessName: draft.businessName,
      ownerName: draft.ownerName,
      natureOfBusiness: draft.natureOfBusiness,
      pan: draft.pan,
      gstin: draft.gstin,
      udyamNumber: draft.udyamNumber,
      address: draft.address,
      city: draft.city,
      state: draft.state,
      pincode: draft.pincode,
      mobile: draft.mobile,
      email: draft.email,
      bankName: draft.bankName,
      loanPurpose: draft.loanPurpose,
      loanAmount: draft.loanAmount.trim() === "" ? null : toNumber(draft.loanAmount),
      ...figures,
      status,
    };
    try {
      const response = await fetch(id ? `/api/admin/balance-sheets/${id}` : "/api/admin/balance-sheets", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!response.ok || !result.id) {
        setError(result.message ?? "Balance sheet save nahi ho payi. Dobara koshish karein.");
        setSaving(null);
        return;
      }
      // A full page load, not router.push: the soft navigation to the
      // detail page was occasionally aborted mid-flight (about one save in
      // six in browser tests), leaving the admin on a saved form with no
      // sign it had saved. The detail page renders fresh on every request.
      // Buttons stay disabled while the next page loads, so a second click
      // cannot save the sheet twice.
      window.location.assign(`/admin/balance-sheets/${result.id}`);
    } catch {
      setError("Internet connection nahi hai. Dobara koshish karein.");
      setSaving(null);
    }
  }

  return (
    <ChecksContext.Provider value={checksContext}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <BalanceSheetQuick seed={quickSeed} yearOptions={yearOptions} busy={saving !== null} onBuild={buildFromQuick} />
          {error ? (
            <p role="alert" className="rounded-ds-md bg-ds-danger-soft px-3 py-2 text-[13px] font-semibold text-ds-danger">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-ds-xl border border-ds-border bg-ds-surface px-4 py-3 text-left text-sm font-bold text-ds-text-primary hover:bg-ds-surface-sunken"
          >
            <span>
              Poori details (optional)
              <span className="block text-xs font-normal text-ds-text-muted">
                PAN, GSTIN, pata, har kharcha aur balance sheet ka har aankda khud badalna ho to kholiye.
              </span>
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", detailsOpen && "rotate-180")} aria-hidden="true" />
          </button>

          <div hidden={!detailsOpen} className="flex flex-col gap-6">
          <BalanceSheetAutofill currentValue={currentValue} onApply={applyAutofill} />
          <AdminCard>
            <AdminSection title="1. Customer and business" description="As it should appear on the statements submitted to the bank. Kisi bhi box par cursor rokein ya tap karein, wahan kya bharna hai aur kahan milega, ye dikh jaayega.">
              <Grid>
                <Field field="businessName" label="Business / firm name" required>
                  <AdminInput value={draft.businessName} onChange={(event) => set("businessName", event.target.value)} placeholder="Shree Ganesh Traders" />
                </Field>
                <Field field="ownerName" label={draft.constitution === "proprietorship" ? "Proprietor's name" : "Partners / directors"} required>
                  <AdminInput value={draft.ownerName} onChange={(event) => set("ownerName", event.target.value)} />
                </Field>
                <Field guide="constitution" label="Constitution">
                  <AdminSelect value={draft.constitution} onChange={(event) => set("constitution", event.target.value as Constitution)}>
                    {CONSTITUTIONS.map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
                <Field guide="natureOfBusiness" label="Nature of business">
                  <AdminInput value={draft.natureOfBusiness} onChange={(event) => set("natureOfBusiness", event.target.value)} placeholder="Wholesale trading of grocery" />
                </Field>
                <Field field="pan" label="PAN">
                  <AdminInput value={draft.pan} maxLength={10} onChange={(event) => set("pan", event.target.value.toUpperCase())} placeholder="ABCDE1234F" />
                </Field>
                <Field field="gstin" label="GSTIN">
                  <AdminInput value={draft.gstin} maxLength={15} onChange={(event) => set("gstin", event.target.value.toUpperCase())} />
                </Field>
                <Field guide="udyamNumber" label="Udyam registration no.">
                  <AdminInput value={draft.udyamNumber} onChange={(event) => set("udyamNumber", event.target.value.toUpperCase())} />
                </Field>
                <Field field="mobile" label="Mobile">
                  <AdminInput value={draft.mobile} inputMode="numeric" maxLength={10} onChange={(event) => set("mobile", event.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field field="email" label="Email">
                  <AdminInput value={draft.email} type="email" onChange={(event) => set("email", event.target.value)} />
                </Field>
              </Grid>
              <Field guide="address" label="Business address">
                <AdminTextarea value={draft.address} rows={2} onChange={(event) => set("address", event.target.value)} />
              </Field>
              <Grid>
                <Field guide="city" label="City">
                  <AdminInput value={draft.city} onChange={(event) => set("city", event.target.value)} />
                </Field>
                <Field guide="state" label="State">
                  <AdminInput value={draft.state} onChange={(event) => set("state", event.target.value)} />
                </Field>
                <Field field="pincode" label="Pincode">
                  <AdminInput value={draft.pincode} inputMode="numeric" maxLength={6} onChange={(event) => set("pincode", event.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field guide="bankName" label="Bank and branch">
                  <AdminInput value={draft.bankName} onChange={(event) => set("bankName", event.target.value)} placeholder="State Bank of India, Orai" />
                </Field>
                <Field guide="loanPurpose" label="Purpose of loan">
                  <AdminInput value={draft.loanPurpose} onChange={(event) => set("loanPurpose", event.target.value)} placeholder="Working capital / machinery" />
                </Field>
                <MoneyInput field="loanAmount" label="Loan amount applied for" value={draft.loanAmount} onChange={(value) => set("loanAmount", value)} />
              </Grid>
            </AdminSection>
          </AdminCard>

          <AdminCard>
            <AdminSection title="2. Period">
              <Grid>
                <Field guide="baseYear" label="Last completed financial year" help={`Projections start from ${fyLabel(baseYear + 1)}.`}>
                  <AdminSelect value={draft.baseYear} onChange={(event) => set("baseYear", event.target.value)}>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {fyLabel(year)}
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
                <Field field="projection.years" label="Years to project">
                  <AdminSelect value={draft.projection.years} onChange={(event) => setProjection("years")(event.target.value)}>
                    {[1, 2, 3, 4, 5].map((years) => (
                      <option key={years} value={years}>
                        {years} {years === 1 ? "year" : "years"}
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
                <Field guide="hasActual" label="Figures for the last year">
                  <AdminSelect value={draft.hasActual ? "yes" : "no"} onChange={(event) => set("hasActual", event.target.value === "yes")}>
                    <option value="yes">Available — include the actual year</option>
                    <option value="no">New business — projections only</option>
                  </AdminSelect>
                </Field>
              </Grid>
            </AdminSection>
          </AdminCard>

          {draft.hasActual ? (
            <>
              <AdminCard>
                <AdminSection title={`3. Trading and P&L — ${fyLabel(baseYear)} (actual)`} description="From the customer's books, ITR or bank statement.">
                  <Grid>
                    <MoneyInput field="actual.sales" label="Sales / turnover" value={draft.actual.sales} onChange={setActual("sales")} />
                    <MoneyInput field="actual.otherIncome" label="Other income" value={draft.actual.otherIncome} onChange={setActual("otherIncome")} />
                    <MoneyInput field="actual.openingStock" label="Opening stock" value={draft.actual.openingStock} onChange={setActual("openingStock")} />
                    <MoneyInput field="actual.purchases" label="Purchases" value={draft.actual.purchases} onChange={setActual("purchases")} />
                    <MoneyInput field="actual.directExpenses" label="Direct expenses" value={draft.actual.directExpenses} onChange={setActual("directExpenses")} help="Wages, power, freight on purchases" />
                    <MoneyInput field="actual.closingStock" label="Closing stock" value={draft.actual.closingStock} onChange={setActual("closingStock")} />
                    <MoneyInput field="actual.salaries" label="Salaries and wages" value={draft.actual.salaries} onChange={setActual("salaries")} />
                    <MoneyInput field="actual.rent" label="Rent" value={draft.actual.rent} onChange={setActual("rent")} />
                    <MoneyInput field="actual.adminExpenses" label="Administrative expenses" value={draft.actual.adminExpenses} onChange={setActual("adminExpenses")} help="Electricity, phone, office" />
                    <MoneyInput field="actual.otherExpenses" label="Other expenses" value={draft.actual.otherExpenses} onChange={setActual("otherExpenses")} />
                    <MoneyInput field="actual.interest" label="Interest on loans" value={draft.actual.interest} onChange={setActual("interest")} />
                    <MoneyInput field="actual.depreciation" label="Depreciation" value={draft.actual.depreciation} onChange={setActual("depreciation")} />
                    <MoneyInput field="actual.tax" label="Income tax" value={draft.actual.tax} onChange={setActual("tax")} />
                  </Grid>
                </AdminSection>
              </AdminCard>

              <AdminCard>
                <AdminSection title={`4. Balance sheet — as at ${`31st March ${baseYear + 1}`}`} description="Closing stock is taken from the P&L above. Closing capital is worked out for you.">
                  <Grid>
                    <MoneyInput field="actual.openingCapital" label="Opening capital" value={draft.actual.openingCapital} onChange={setActual("openingCapital")} />
                    <MoneyInput field="actual.capitalIntroduced" label="Capital introduced" value={draft.actual.capitalIntroduced} onChange={setActual("capitalIntroduced")} />
                    <MoneyInput field="actual.drawings" label="Drawings" value={draft.actual.drawings} onChange={setActual("drawings")} />
                    <MoneyInput field="actual.termLoan" label="Term loan outstanding" value={draft.actual.termLoan} onChange={setActual("termLoan")} />
                    <MoneyInput field="actual.unsecuredLoans" label="Unsecured loans" value={draft.actual.unsecuredLoans} onChange={setActual("unsecuredLoans")} help="From friends, relatives" />
                    <MoneyInput field="actual.creditors" label="Sundry creditors" value={draft.actual.creditors} onChange={setActual("creditors")} />
                    <MoneyInput field="actual.otherCurrentLiabilities" label="Other current liabilities" value={draft.actual.otherCurrentLiabilities} onChange={setActual("otherCurrentLiabilities")} />
                    <MoneyInput field="actual.fixedAssets" label="Fixed assets (net block)" value={draft.actual.fixedAssets} onChange={setActual("fixedAssets")} />
                    <MoneyInput field="actual.investments" label="Investments" value={draft.actual.investments} onChange={setActual("investments")} />
                    <MoneyInput field="actual.debtors" label="Sundry debtors" value={draft.actual.debtors} onChange={setActual("debtors")} />
                    <MoneyInput field="actual.cashAndBank" label="Cash and bank balances" value={draft.actual.cashAndBank} onChange={setActual("cashAndBank")} />
                    <MoneyInput field="actual.otherCurrentAssets" label="Other current assets" value={draft.actual.otherCurrentAssets} onChange={setActual("otherCurrentAssets")} help="Advances, deposits" />
                  </Grid>
                </AdminSection>
              </AdminCard>
            </>
          ) : null}

          <AdminCard>
            <AdminSection
              title={`${draft.hasActual ? "5" : "3"}. Loan yojana aur project cost`}
              description="Yojana chunein, phir machine aur working capital bharein. 'Yojana ke hisaab se bharein' se own contribution, subsidy aur loan ka batwara khud bhar jaata hai."
            >
              <Grid>
                <Field field="projection.scheme" label="Loan yojana">
                  <AdminSelect value={draft.projection.scheme} onChange={(event) => setProjection("scheme")(event.target.value)}>
                    {SCHEME_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
                {terms?.asks.sector ? (
                  <Field field="projection.schemeSector" label="Sector">
                    <AdminSelect value={draft.projection.schemeSector} onChange={(event) => setProjection("schemeSector")(event.target.value)}>
                      {SECTOR_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </AdminSelect>
                  </Field>
                ) : null}
                {terms?.asks.area ? (
                  <Field field="projection.schemeArea" label="Area">
                    <AdminSelect value={draft.projection.schemeArea} onChange={(event) => setProjection("schemeArea")(event.target.value)}>
                      {AREA_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </AdminSelect>
                  </Field>
                ) : null}
                {terms?.asks.category ? (
                  <Field field="projection.schemeCategory" label="Category">
                    <AdminSelect value={draft.projection.schemeCategory} onChange={(event) => setProjection("schemeCategory")(event.target.value)}>
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </AdminSelect>
                  </Field>
                ) : null}
              </Grid>

              {terms && draft.projection.scheme !== "none" ? (
                <div className="rounded-ds-md bg-ds-surface-sunken p-3 text-[13px] leading-snug text-ds-text-secondary" data-testid="scheme-terms">
                  <p className="font-bold text-ds-text-primary">{terms.label}: {terms.summary}</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5">
                    {terms.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-[12px] text-ds-text-muted">Ye default figures hain; final shartein bank ya yojana ke portal se confirm karein.</p>
                </div>
              ) : null}

              <Grid>
                <MoneyInput field="projection.newFixedAssets" label="New fixed assets / machinery" value={draft.projection.newFixedAssets} onChange={setProjection("newFixedAssets")} />
                <MoneyInput field="projection.workingCapitalNeed" label="Working capital requirement" value={draft.projection.workingCapitalNeed} onChange={setProjection("workingCapitalNeed")} help="Ek cycle ka maal, stock aur udhaar" />
                <MoneyInput field="projection.capitalIntroducedYear1" label="Own contribution (own capital), first year" value={draft.projection.capitalIntroducedYear1} onChange={setProjection("capitalIntroducedYear1")} />
              </Grid>

              {terms ? (
                <div className="flex flex-wrap items-center gap-3">
                  <AdminButton variant="secondary" onClick={applyScheme} disabled={projectCost <= 0}>
                    Yojana ke hisaab se bharein
                  </AdminButton>
                  <p className="text-[12.5px] text-ds-text-muted" role="status">
                    {schemeApplied
                      ? "Own contribution, subsidy, term loan, CC aur byaaj ki chhoot yojana ke hisaab se bhar diye. Zaroorat ho to badlein."
                      : projectCost <= 0
                        ? "Pehle machine aur working capital bharein."
                        : `Project cost ${formatAmount(projectCost)} par own contribution, subsidy aur loan bharega.`}
                  </p>
                </div>
              ) : null}

              <Grid>
                <MoneyInput field="projection.newTermLoan" label="New term loan" value={draft.projection.newTermLoan} onChange={setProjection("newTermLoan")} />
                <MoneyInput field="projection.loanInterestPct" label="Term loan interest rate" suffix="% p.a." value={draft.projection.loanInterestPct} onChange={setProjection("loanInterestPct")} />
                <MoneyInput field="projection.loanTenureYears" label="Loan tenure" suffix="years" value={draft.projection.loanTenureYears} onChange={setProjection("loanTenureYears")} />
                <MoneyInput field="projection.ccLimit" label="CC / working capital limit" value={draft.projection.ccLimit} onChange={setProjection("ccLimit")} />
                <MoneyInput field="projection.ccInterestPct" label="CC interest rate" suffix="% p.a." value={draft.projection.ccInterestPct} onChange={setProjection("ccInterestPct")} />
                <MoneyInput field="projection.subsidyAmount" label="Margin money / capital subsidy" value={draft.projection.subsidyAmount} onChange={setProjection("subsidyAmount")} />
                <MoneyInput field="projection.interestSubventionPct" label="Interest subvention" suffix="% of interest" value={draft.projection.interestSubventionPct} onChange={setProjection("interestSubventionPct")} />
                <MoneyInput field="projection.interestSubventionYears" label="Interest subvention" suffix="years" value={draft.projection.interestSubventionYears} onChange={setProjection("interestSubventionYears")} />
              </Grid>

              {statements.projectFinance ? <MeansOfFinance finance={statements.projectFinance} mudra={draft.projection.scheme === "mudra"} /> : null}
            </AdminSection>
          </AdminCard>

          <AdminCard>
            <AdminSection
              title={`${draft.hasActual ? "6" : "4"}. Projections`}
              description={draft.hasActual ? "Leave a field blank to use the customer's own ratio from the actual year (shown in grey)." : "Estimates for the new business."}
            >
              <Grid>
                <MoneyInput
                  field="projection.year1Sales"
                  label="Sales in the first projected year"
                  value={draft.projection.year1Sales}
                  onChange={setProjection("year1Sales")}
                  placeholder={draft.hasActual ? formatAmount(derived.year1Sales) : "Required"}
                />
                <MoneyInput field="projection.salesGrowthPct" label="Sales growth per year" suffix="%" value={draft.projection.salesGrowthPct} onChange={setProjection("salesGrowthPct")} />
                <MoneyInput
                  field="projection.materialCostPct"
                  label="Cost of sales"
                  suffix="% of sales"
                  value={draft.projection.materialCostPct}
                  onChange={setProjection("materialCostPct")}
                  placeholder={draft.hasActual ? String(derived.materialCostPct) : "70"}
                />
                <MoneyInput
                  field="projection.indirectExpensesYear1"
                  label="Indirect expenses, first year"
                  value={draft.projection.indirectExpensesYear1}
                  onChange={setProjection("indirectExpensesYear1")}
                  placeholder={draft.hasActual ? formatAmount(derived.indirectExpensesYear1) : "0"}
                  help="Salaries, rent, office and other"
                />
                <MoneyInput field="projection.expenseGrowthPct" label="Expense growth per year" suffix="%" value={draft.projection.expenseGrowthPct} onChange={setProjection("expenseGrowthPct")} />
                <MoneyInput field="projection.depreciationPct" label="Depreciation rate" suffix="% WDV" value={draft.projection.depreciationPct} onChange={setProjection("depreciationPct")} />
                <MoneyInput field="projection.taxPct" label="Income tax" suffix="% of profit" value={draft.projection.taxPct} onChange={setProjection("taxPct")} />
                <MoneyInput field="projection.drawingsPerYear" label="Drawings per year" value={draft.projection.drawingsPerYear} onChange={setProjection("drawingsPerYear")} />
                {draft.hasActual ? (
                  <>
                    <MoneyInput field="projection.existingLoanRepaymentPerYear" label="Existing loan repaid per year" value={draft.projection.existingLoanRepaymentPerYear} onChange={setProjection("existingLoanRepaymentPerYear")} />
                    <MoneyInput field="projection.existingLoanInterestPct" label="Existing loan interest" suffix="% p.a." value={draft.projection.existingLoanInterestPct} onChange={setProjection("existingLoanInterestPct")} />
                  </>
                ) : null}
                <MoneyInput field="projection.debtorDays" label="Debtors" suffix="days of sales" value={draft.projection.debtorDays} onChange={setProjection("debtorDays")} placeholder={String(draft.hasActual ? derived.debtorDays : 30)} />
                <MoneyInput field="projection.stockDays" label="Stock" suffix="days" value={draft.projection.stockDays} onChange={setProjection("stockDays")} placeholder={String(draft.hasActual ? derived.stockDays : 30)} />
                <MoneyInput field="projection.creditorDays" label="Creditors" suffix="days" value={draft.projection.creditorDays} onChange={setProjection("creditorDays")} placeholder={String(draft.hasActual ? derived.creditorDays : 30)} />
              </Grid>
            </AdminSection>
          </AdminCard>
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20" aria-label="Summary">
          <AdminCard>
            <h2 className="text-[15px] font-bold text-ds-text-primary">Summary</h2>
            <p
              className={cn(
                "mt-3 flex items-start gap-2 rounded-ds-md px-3 py-2 text-[13px] font-semibold",
                STATUS_TONE_CLASS[statements.tallies ? "success" : "danger"],
              )}
              role="status"
            >
              {statements.tallies ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
              {statements.tallies ? "Balance sheet tally ho gayi" : `Tally nahi hui: Rs. ${formatAmount(Math.abs(actualPeriod?.bs.difference ?? 0))} ka farak hai`}
            </p>
            {errorList.length || warningList.length ? (
              <div className="mt-3">
                <p className={cn("text-[13px] font-bold", errorList.length ? STATUS_TONE_TEXT.danger : STATUS_TONE_TEXT.warning)}>
                  {errorList.length
                    ? `${errorList.length} ${errorList.length === 1 ? "galti" : "galtiyan"} theek karni hain`
                    : `${warningList.length} figure check karne hain`}
                  {errorList.length && warningList.length ? `, ${warningList.length} check karne hain` : ""}
                </p>
                <ul className="mt-1.5 max-h-64 space-y-1 overflow-y-auto pr-1">
                  {[...errorList, ...warningList].map((issue) => (
                    <li key={issue.key}>
                      <button
                        type="button"
                        onClick={() => jumpTo(issue.key)}
                        className="flex w-full items-start gap-1.5 rounded-ds-sm px-1 py-0.5 text-left text-[12.5px] leading-snug text-ds-text-secondary hover:bg-ds-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
                      >
                        {issue.level === "error" ? (
                          <AlertCircle className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", STATUS_TONE_TEXT.danger)} aria-hidden="true" />
                        ) : (
                          <AlertTriangle className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", STATUS_TONE_TEXT.warning)} aria-hidden="true" />
                        )}
                        <span>
                          <span className="font-semibold text-ds-text-primary">{FIELD_LABELS[issue.key]}</span>
                          <span className="sr-only">{issue.level === "error" ? " (galti)" : " (check karein)"}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
              {actualPeriod ? (
                <>
                  <dt className="text-ds-text-muted">Total liabilities</dt>
                  <dd className="text-right font-semibold tabular-nums">{formatAmount(actualPeriod.bs.totalLiabilities)}</dd>
                  <dt className="text-ds-text-muted">Total assets</dt>
                  <dd className="text-right font-semibold tabular-nums">{formatAmount(actualPeriod.bs.totalAssets)}</dd>
                  <dt className="text-ds-text-muted">Net profit {fyLabel(baseYear).replace("FY ", "")}</dt>
                  <dd className="text-right font-semibold tabular-nums">{formatAmount(actualPeriod.pl.netProfit)}</dd>
                </>
              ) : null}
              {projected[0] ? (
                <>
                  <dt className="text-ds-text-muted">Sales {fyLabel(projected[0].fyStart).replace("FY ", "")}</dt>
                  <dd className="text-right font-semibold tabular-nums">{formatAmount(projected[0].pl.sales)}</dd>
                  <dt className="text-ds-text-muted">Net profit {fyLabel(projected[0].fyStart).replace("FY ", "")}</dt>
                  <dd className="text-right font-semibold tabular-nums">{formatAmount(projected[0].pl.netProfit)}</dd>
                </>
              ) : null}
              <dt className="text-ds-text-muted">Average DSCR</dt>
              <dd className="text-right font-semibold tabular-nums">{statements.averageDscr?.toFixed(2) ?? "-"}</dd>
            </dl>
            {statements.warnings.some((warning) => !warning.startsWith(NOT_TALLY_WARNING_PREFIX)) ? (
              <ul className="mt-3 space-y-1.5 text-[12.5px] leading-snug text-ds-text-secondary">
                {statements.warnings.filter((warning) => !warning.startsWith(NOT_TALLY_WARNING_PREFIX)).map((warning) => (
                  <li key={warning} className="flex gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ds-warning" aria-hidden="true" />
                    {warning}
                  </li>
                ))}
              </ul>
            ) : null}
          </AdminCard>

          <AdminCard className="flex flex-col gap-2">
            {error ? (
              <p role="alert" className="text-[13px] font-semibold text-ds-danger">
                {error}
              </p>
            ) : null}
            <AdminButton variant="primary" size="lg" loading={saving === "final"} disabled={saving !== null || !statements.tallies || checks.errorCount > 0} onClick={() => save("final")}>
              Save as final
            </AdminButton>
            <AdminButton variant="secondary" size="lg" loading={saving === "draft"} disabled={saving !== null} onClick={() => save("draft")}>
              Save draft
            </AdminButton>
            <p className="text-[12px] leading-snug text-ds-text-muted">
              Draft par DRAFT watermark chhapta hai. Final tab hoga jab actual saal tally ho jaaye aur koi box laal na rahe.
            </p>
          </AdminCard>
        </aside>
      </div>
    </ChecksContext.Provider>
  );
}
