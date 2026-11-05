"use client";

import { cloneElement, createContext, useContext, useId, useMemo, useState, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

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
  type ActualFigures,
  type Constitution,
  type ProjectionAssumptions,
} from "@/lib/balance-sheets/engine";
import { STATUS_TONE_CLASS, STATUS_TONE_TEXT } from "@/lib/admin/status-tone";
import { checkBalanceSheet, FIELD_LABELS, FIELD_ORDER, type CheckResult, type DetailKey, type FieldKey } from "@/lib/balance-sheets/checks";
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
      NULLABLE_PROJECTION.has(key as keyof ProjectionAssumptions) ? toNullable(value) : toNumber(value),
    ]),
  ) as ProjectionAssumptions;
  return {
    baseYear: Number(draft.baseYear) || lastCompletedFy(),
    hasActual: draft.hasActual,
    constitution: draft.constitution,
    actual,
    projection,
  };
}

/** The live check results, so each field can find its own mistake. */
const ChecksContext = createContext<{ result: CheckResult; touch: (key: DetailKey) => void } | null>(null);

const DETAIL_KEYS = new Set<FieldKey>(["businessName", "ownerName", "pan", "gstin", "mobile", "pincode", "email", "loanAmount"]);

/** A stable DOM id per field, so the summary can jump straight to the box. */
export const fieldDomId = (key: FieldKey) => `bs-${key.replace(".", "-")}`;

type ControlProps = { id?: string; "aria-describedby"?: string; invalid?: boolean; className?: string; onBlur?: (event: never) => void };

/**
 * AdminField with its label tied to the control, and the field's mistake shown
 * right under it: an error turns the box red, a warning puts an amber note.
 */
function Field({
  children,
  help,
  field,
  ...props
}: Omit<ComponentProps<typeof AdminField>, "htmlFor" | "children" | "error"> & { field?: FieldKey; children: ReactElement<ControlProps> }) {
  const generated = useId();
  const checks = useContext(ChecksContext);
  const id = field ? fieldDomId(field) : generated;
  const issue = field ? checks?.result.issues[field] : undefined;
  const isError = issue?.level === "error";
  const isWarning = issue?.level === "warning";
  const describedBy = isError ? `${id}-error` : isWarning ? `${id}-warning` : help ? `${id}-help` : undefined;

  const control = cloneElement(children, {
    id,
    "aria-describedby": describedBy,
    invalid: isError || undefined,
    className: cn(children.props.className, isWarning && "ring-2 ring-ds-warning"),
    onBlur: (event: never) => {
      children.props.onBlur?.(event);
      if (field && DETAIL_KEYS.has(field)) checks?.touch(field as DetailKey);
    },
  });

  return (
    <div>
      <AdminField {...props} help={isWarning ? undefined : help} error={isError ? issue.message : undefined} htmlFor={id}>
        {control}
      </AdminField>
      {isWarning ? (
        <p id={`${id}-warning`} className={cn("mt-1.5 flex gap-1 text-xs font-semibold", STATUS_TONE_TEXT.warning)}>
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {issue.message}
        </p>
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

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export function BalanceSheetForm({ id, initial = {} }: { id?: string; initial?: BalanceSheetFormInitial }) {
  const router = useRouter();
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
  const checksContext = useMemo(
    () => ({ result: checks, touch: (key: DetailKey) => setTouched((current) => (current.has(key) ? current : new Set([...current, key]))) }),
    [checks],
  );
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
          ? `Fix the mistake in "${FIELD_LABELS[blocking[0]]}" first.`
          : `Fix the ${blocking.length} mistakes marked in red first, starting with "${FIELD_LABELS[blocking[0]]}".`,
      );
      jumpTo(blocking[0]);
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
        setError(result.message ?? "The balance sheet could not be saved.");
        return;
      }
      router.push(`/admin/balance-sheets/${result.id}`);
      router.refresh();
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <ChecksContext.Provider value={checksContext}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <AdminCard>
            <AdminSection title="1. Customer and business" description="As it should appear on the statements submitted to the bank.">
              <Grid>
                <Field field="businessName" label="Business / firm name" required>
                  <AdminInput value={draft.businessName} onChange={(event) => set("businessName", event.target.value)} placeholder="Shree Ganesh Traders" />
                </Field>
                <Field field="ownerName" label={draft.constitution === "proprietorship" ? "Proprietor's name" : "Partners / directors"} required>
                  <AdminInput value={draft.ownerName} onChange={(event) => set("ownerName", event.target.value)} />
                </Field>
                <Field label="Constitution">
                  <AdminSelect value={draft.constitution} onChange={(event) => set("constitution", event.target.value as Constitution)}>
                    {CONSTITUTIONS.map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
                <Field label="Nature of business">
                  <AdminInput value={draft.natureOfBusiness} onChange={(event) => set("natureOfBusiness", event.target.value)} placeholder="Wholesale trading of grocery" />
                </Field>
                <Field field="pan" label="PAN">
                  <AdminInput value={draft.pan} maxLength={10} onChange={(event) => set("pan", event.target.value.toUpperCase())} placeholder="ABCDE1234F" />
                </Field>
                <Field field="gstin" label="GSTIN">
                  <AdminInput value={draft.gstin} maxLength={15} onChange={(event) => set("gstin", event.target.value.toUpperCase())} />
                </Field>
                <Field label="Udyam registration no.">
                  <AdminInput value={draft.udyamNumber} onChange={(event) => set("udyamNumber", event.target.value.toUpperCase())} />
                </Field>
                <Field field="mobile" label="Mobile">
                  <AdminInput value={draft.mobile} inputMode="numeric" maxLength={10} onChange={(event) => set("mobile", event.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field field="email" label="Email">
                  <AdminInput value={draft.email} type="email" onChange={(event) => set("email", event.target.value)} />
                </Field>
              </Grid>
              <Field label="Business address">
                <AdminTextarea value={draft.address} rows={2} onChange={(event) => set("address", event.target.value)} />
              </Field>
              <Grid>
                <Field label="City">
                  <AdminInput value={draft.city} onChange={(event) => set("city", event.target.value)} />
                </Field>
                <Field label="State">
                  <AdminInput value={draft.state} onChange={(event) => set("state", event.target.value)} />
                </Field>
                <Field field="pincode" label="Pincode">
                  <AdminInput value={draft.pincode} inputMode="numeric" maxLength={6} onChange={(event) => set("pincode", event.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field label="Bank and branch">
                  <AdminInput value={draft.bankName} onChange={(event) => set("bankName", event.target.value)} placeholder="State Bank of India, Orai" />
                </Field>
                <Field label="Purpose of loan">
                  <AdminInput value={draft.loanPurpose} onChange={(event) => set("loanPurpose", event.target.value)} placeholder="Working capital / machinery" />
                </Field>
                <MoneyInput field="loanAmount" label="Loan amount applied for" value={draft.loanAmount} onChange={(value) => set("loanAmount", value)} />
              </Grid>
            </AdminSection>
          </AdminCard>

          <AdminCard>
            <AdminSection title="2. Period">
              <Grid>
                <Field label="Last completed financial year" help={`Projections start from ${fyLabel(baseYear + 1)}.`}>
                  <AdminSelect value={draft.baseYear} onChange={(event) => set("baseYear", event.target.value)}>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {fyLabel(year)}
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
                <Field label="Years to project">
                  <AdminSelect value={draft.projection.years} onChange={(event) => setProjection("years")(event.target.value)}>
                    {[1, 2, 3, 4, 5].map((years) => (
                      <option key={years} value={years}>
                        {years} {years === 1 ? "year" : "years"}
                      </option>
                    ))}
                  </AdminSelect>
                </Field>
                <Field label="Figures for the last year">
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
              title={`${draft.hasActual ? "5" : "3"}. Projections`}
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
                <MoneyInput field="projection.capitalIntroducedYear1" label="Own capital introduced, first year" value={draft.projection.capitalIntroducedYear1} onChange={setProjection("capitalIntroducedYear1")} />
                <MoneyInput field="projection.newFixedAssets" label="New fixed assets / machinery" value={draft.projection.newFixedAssets} onChange={setProjection("newFixedAssets")} />
                <MoneyInput field="projection.newTermLoan" label="New term loan" value={draft.projection.newTermLoan} onChange={setProjection("newTermLoan")} />
                <MoneyInput field="projection.loanInterestPct" label="Loan interest rate" suffix="% p.a." value={draft.projection.loanInterestPct} onChange={setProjection("loanInterestPct")} />
                <MoneyInput field="projection.loanTenureYears" label="Loan tenure" suffix="years" value={draft.projection.loanTenureYears} onChange={setProjection("loanTenureYears")} />
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
              {statements.tallies ? "Balance sheet tallies" : `Does not tally by Rs. ${formatAmount(Math.abs(actualPeriod?.bs.difference ?? 0))}`}
            </p>
            {errorList.length || warningList.length ? (
              <div className="mt-3">
                <p className={cn("text-[13px] font-bold", errorList.length ? STATUS_TONE_TEXT.danger : STATUS_TONE_TEXT.warning)}>
                  {errorList.length
                    ? `${errorList.length} ${errorList.length === 1 ? "mistake" : "mistakes"} to fix`
                    : `${warningList.length} ${warningList.length === 1 ? "figure" : "figures"} to check`}
                  {errorList.length && warningList.length ? `, ${warningList.length} to check` : ""}
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
                          <span className="sr-only">{issue.level === "error" ? " (mistake)" : " (check)"}</span>
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
            {statements.warnings.some((warning) => !warning.startsWith("The actual year does not tally")) ? (
              <ul className="mt-3 space-y-1.5 text-[12.5px] leading-snug text-ds-text-secondary">
                {statements.warnings.filter((warning) => !warning.startsWith("The actual year does not tally")).map((warning) => (
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
              A draft prints with a DRAFT watermark. Final is available once the actual year tallies and no box is red.
            </p>
          </AdminCard>
        </aside>
      </div>
    </ChecksContext.Provider>
  );
}
