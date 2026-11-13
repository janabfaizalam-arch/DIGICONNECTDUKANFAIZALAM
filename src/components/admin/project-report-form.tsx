"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  Rocket,
  Sparkles,
  Wand2,
} from "lucide-react";

import {
  AdminButton,
  AdminInput,
  AdminSelect,
} from "@/components/admin/primitives/controls-ui";
import { AdminCard } from "@/components/admin/primitives/layout";
import { STATUS_TONE_CLASS } from "@/lib/admin/status-tone";
import { CONSTITUTIONS, formatAmount } from "@/lib/balance-sheets/engine";
import { AREA_OPTIONS, SCHEME_OPTIONS } from "@/lib/balance-sheets/schemes";
import { emptyPromoter } from "@/lib/project-reports/defaults";
import {
  buildDpr,
  schemeFor,
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
import {
  applyTemplate,
  asBankFormat,
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

/** Rupees to lakh for a box, two decimals. */
const toLakh = (value: number) => Math.round((value / 100000) * 100) / 100;

/**
 * A lakh box that got rupees: "400000" typed for Rs. 4,00,000 reads as
 * 4 lakh lakh. A figure of 1,000 lakh (Rs. 10 crore) or more in these boxes
 * is taken as rupees.
 */
const RUPEES_IN_LAKH_BOX = 1000;
const lakhOf = (typed: number) =>
  typed >= RUPEES_IN_LAKH_BOX ? typed / 100000 : typed;

/**
 * Basic details only — the same points as the bank DPR's "Project at a
 * Glance". Everything else (machinery, capacity, raw material, staff,
 * running costs, working capital) comes from the chosen business type and
 * is sized to the project cost, then all ten statements are calculated.
 */
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
  // DPRs saved before the working capital box kept the CC part in the CC
  // override; it was the CC share of the project, margin included.
  const [input, setInput] = useState<DprInput>(() =>
    (initial.workingCapitalOverride ?? null) === null &&
    initial.ccLimitOverride !== null &&
    initial.termLoanOverride === null
      ? { ...initial, workingCapitalOverride: initial.ccLimitOverride }
      : initial,
  );
  // Bank loans typed directly ("TL 2,62,500, CC 1,75,000") are saved as both
  // overrides together with the working capital they come from.
  const loansTyped =
    initial.termLoanOverride !== null &&
    initial.ccLimitOverride !== null &&
    (initial.workingCapitalOverride ?? null) !== null;
  const stale =
    !loansTyped &&
    (initial.ccLimitOverride !== null || initial.termLoanOverride !== null);
  const [bankTl, setBankTl] = useState<number | null>(
    loansTyped ? toLakh(initial.termLoanOverride ?? 0) : null,
  );
  const [bankCc, setBankCc] = useState<number | null>(
    loansTyped ? toLakh(initial.ccLimitOverride ?? 0) : null,
  );
  const [saving, setSaving] = useState<"draft" | "final" | null>(null);
  const [message, setMessage] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const [template, setTemplate] = useState(
    initial.templateId ?? firstEligible(initial.scheme, "all"),
  );
  const [sector, setSector] = useState<"all" | DprInput["sector"]>("all");
  const initialCost = id ? toLakh(buildDpr(initial).cost.total) : null;
  const [costLakh, setCostLakh] = useState<number | null>(initialCost ?? 10);
  const [moreOpen, setMoreOpen] = useState(false);

  const report = useMemo(() => buildDpr(input), [input]);
  const scheme = useMemo(
    () => (input.scheme === "none" ? null : schemeFor(input)),
    [input],
  );
  const eligibility = useMemo(() => eligibilityIssues(input), [input]);

  const set = <K extends keyof DprInput>(key: K, value: DprInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));
  const lead = input.promoters[0] ?? (emptyPromoter() as Promoter);
  const setLead = (patch: Partial<Promoter>) =>
    setInput((current) => ({
      ...current,
      promoters: current.promoters.length
        ? current.promoters.map((p, i) => (i === 0 ? { ...p, ...patch } : p))
        : [{ ...(emptyPromoter() as Promoter), ...patch }],
    }));

  const rule = SCHEME_RULES[input.scheme];
  const allowedSectors = sectorsFor(input.scheme);
  const groups = useMemo(
    () => templatesFor(input.scheme, sector),
    [input.scheme, sector],
  );
  const limit =
    input.scheme !== "none"
      ? schemeFor({
          ...input,
          sector: templateById(template)?.sector ?? input.sector,
        })?.maxProjectCost
      : undefined;

  /** Keep the business picked only if the scheme / sector funds it. */
  function keepEligible(schemeId: DprInput["scheme"], next: typeof sector) {
    const current = templateById(template);
    if (
      current &&
      isEligible(current, schemeId) &&
      (next === "all" || current.sector === next)
    )
      return;
    setTemplate(firstEligible(schemeId, next));
  }
  function changeScheme(next: DprInput["scheme"]) {
    setInput((current) => ({
      ...current,
      scheme: next,
      ownContributionPct: null,
    }));
    const nextSector =
      sector !== "all" && !sectorsFor(next).includes(sector) ? "all" : sector;
    setSector(nextSector);
    keepEligible(next, nextSector);
    const max = schemeFor({ ...input, scheme: next })?.maxProjectCost;
    if (max && costLakh && costLakh * 100000 > max) setCostLakh(max / 100000);
  }
  function changeSocialCategory(next: string) {
    setInput((current) => ({
      ...current,
      category: next === "General" ? "general" : "special",
    }));
    setLead({ socialCategory: next });
  }

  const ownPct = input.ownContributionPct ?? scheme?.ownContributionPct ?? 25;
  const margin = ownPct / 100;
  const loanMode = bankTl !== null || bankCc !== null;
  /**
   * Loans typed as the bank sanctions them: the project is what they and the
   * margin make together, and the CC part of it is the CC grossed up by the
   * same margin. TL 2.625 + CC 1.75 at 12.5% -> project 5.00, CC part 2.00.
   */
  function fromLoans(tl: number | null, cc: number | null, pct: number) {
    if (tl === null && cc === null) return;
    const keep = 1 - pct / 100;
    if (!(keep > 0)) return;
    const t = tl === null ? 0 : lakhOf(tl);
    const c = cc === null ? 0 : lakhOf(cc);
    setCostLakh(Math.round(((t + c) / keep) * 100000) / 100000);
    set("workingCapitalOverride", Math.round((c / keep) * 100000));
  }
  const wc = input.workingCapitalOverride ?? null;
  const wcTyped = wc === null ? null : wc / 100000;
  const costShown = lakhOf(costLakh ?? 0);
  const wcShown =
    wcTyped === null ? null : wcTyped > costShown ? lakhOf(wcTyped) : wcTyped;
  const wcTooBig = wcShown !== null && wcShown >= costShown;
  // The bank's way: the margin is taken from both parts. Term loan =
  // machinery x (1 - margin), CC = working capital x (1 - margin).
  const wcForSplit =
    wcShown !== null
      ? wcShown
      : input.products.length > 0
        ? toLakh(report.cost.workingCapital)
        : null;
  const ccLakh = wcForSplit === null ? null : wcForSplit * (1 - margin);
  const tlLakh =
    wcForSplit === null ? null : (costShown - wcForSplit) * (1 - margin);

  /** Fills every detail from the business type, sized to the project cost. */
  function compose(): DprInput | string {
    if (!lead.name.trim()) return "Promoter ka naam bhariye.";
    if (!input.district.trim()) return "District bhariye.";
    if (!(costLakh && costLakh > 0)) return "Project cost (lakh mein) bhariye.";
    if (!template) return "Business type chuniye.";
    const costL = lakhOf(costLakh);
    if (limit && costL * 100000 > limit)
      return `Is yojana mein project cost Rs. ${limit / 100000} lakh se zyada nahi ho sakta.`;
    const wcL =
      wcTyped === null ? null : wcTyped > costL ? lakhOf(wcTyped) : wcTyped;
    if (wcL !== null && wcL >= costL)
      return `Working capital Rs. ${wcL.toFixed(2)} lakh, project cost Rs. ${costL.toFixed(2)} lakh se kam hona chahiye (baaki machinery hai). Box lakh mein hai: 4 lakh ke liye sirf 4 likhiye.`;
    if (costL !== costLakh) setCostLakh(costL);
    // Typed loans are kept to the rupee; the margin is then exactly the rest.
    const typedTl = loanMode ? Math.round(lakhOf(bankTl ?? 0) * 100000) : null;
    const typedCc = loanMode ? Math.round(lakhOf(bankCc ?? 0) * 100000) : null;
    const base: DprInput = {
      ...input,
      businessName: input.businessName.trim() || lead.name.trim(),
      // The bank DPR format: yearly equal instalments, no moratorium,
      // interest on the opening balance, subsidy kept in the TDR.
      bankFormat: true,
      moratoriumMonths: 0,
      repaymentFrequency: "yearly",
      repaymentMethod: "equal_principal",
      // Otherwise the loans follow the margin on both parts (engine default split).
      termLoanOverride: typedTl,
      ccLimitOverride: typedCc,
      workingCapitalOverride: wcL === null ? null : Math.round(wcL * 100000),
    };
    return asBankFormat(
      applyTemplate(
        base,
        template,
        costL * 100000,
        (i) => buildDpr(i).cost.total,
      ),
    );
  }

  async function save(status: "draft" | "final") {
    const built = compose();
    if (typeof built === "string") {
      setMessage({ tone: "danger", text: built });
      return;
    }
    setInput(built);
    setSaving(status);
    setMessage(null);
    const response = await fetch(
      id ? `/api/admin/project-reports/${id}` : "/api/admin/project-reports",
      {
        method: id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, input: built }),
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
          ? "DPR final ho gayi. Upar se PDF download karein."
          : 'DPR taiyaar. Upar "DPR PDF download" se PDF lijiye.',
    });
    // A full load: a soft navigation after saving was occasionally aborted.
    if (!id) window.location.assign(`/admin/project-reports/${body.id}`);
    else router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-5">
        <AdminCard>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ds-lg bg-ds-primary text-ds-text-inverted">
              <Rocket className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-ds-text-primary">
                DPR: sirf basic details
              </h2>
              <p className="mt-0.5 text-[13px] text-ds-text-muted">
                Sirf 5 cheezen: promoter ka naam, district, yojana, business aur
                project cost. &quot;DPR banaiye&quot; dabate hi machinery,
                staff, kachcha maal, kharche, sales, working capital aur loan
                apne aap bharenge, aur 10 page ki bank DPR poori calculation ke
                saath ban jaayegi.
              </p>
              <p className="mt-1 text-xs font-semibold text-ds-text-secondary">
                Baaki sab &quot;Aur details (optional)&quot; mein hai; khaali
                chhodenge to apne aap bhar jaayega.
              </p>
            </div>
          </div>

          {stale ? (
            <p
              role="note"
              className={cn(
                "mt-4 rounded-ds-md px-3 py-2 text-xs",
                STATUS_TONE_CLASS.warning,
              )}
            >
              Yeh DPR purane tareeke se bani thi (loan seedha likha gaya tha,
              margin sirf ek mein laga). Neeche project cost aur CC wala hissa
              check kariye aur &quot;DPR banaiye&quot; dabaiye: margin dono mein
              se nikalkar hisaab dobara banega.
            </p>
          ) : null}
          <h3 className="mt-5 text-xs font-bold uppercase tracking-wide text-ds-text-muted">
            Sirf yeh bhariye
          </h3>
          <div className="mt-2 grid gap-4 md:grid-cols-2">
            <Field guide="promoterName" label="Promoter ka naam *">
              <AdminInput
                value={lead.name}
                onChange={(e) => setLead({ name: e.target.value })}
              />
            </Field>
            <Field guide="district" label="District *">
              <AdminInput
                value={input.district}
                onChange={(e) => set("district", e.target.value)}
              />
            </Field>
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
            <Field
              guide="templateId"
              label="Kaam / business (product) *"
              className="md:col-span-2"
            >
              <AdminSelect
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                {groups.map((group) => (
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
              <p className="rounded-ds-lg border border-ds-border bg-ds-surface-sunken p-3 text-xs leading-relaxed text-ds-text-secondary md:col-span-2">
                <strong className="text-ds-text-primary">
                  {scheme?.label ?? "Yojana"}:
                </strong>{" "}
                umr {rule.age.min}
                {rule.age.max ? `–${rule.age.max}` : "+"} saal
                {rule.education ? `, padhai ${rule.education}` : ""}
                {limit ? `, project cost Rs. ${limit / 100000} lakh tak` : ""}
                {scheme?.summary ? `. ${scheme.summary}` : "."}
              </p>
            ) : null}
            <Field
              guide="projectCost"
              label="Total project cost, margin sahit (Rs. lakh) *"
              help={
                (costLakh ?? 0) >= RUPEES_IN_LAKH_BOX
                  ? `Rupees mein likha tha; Rs. ${costShown.toFixed(2)} lakh maana jaayega`
                  : limit
                    ? `Lakh mein likhiye (10 lakh = 10). Is yojana mein zyada se zyada Rs. ${limit / 100000} lakh`
                    : "Lakh mein likhiye: machinery + working capital milakar, jaise 10"
              }
            >
              <NumberBox
                label="Total project cost, margin sahit (Rs. lakh) *"
                nullable
                value={costLakh}
                onChange={(v) => {
                  setCostLakh(v);
                  setBankTl(null);
                  setBankCc(null);
                }}
                suffix="lakh"
              />
            </Field>
            <Field
              guide="workingCapitalOverride"
              label="Isme CC / working capital wala hissa, margin sahit (Rs. lakh)"
              help={
                wcTooBig
                  ? "Working capital project cost se kam hona chahiye. Box lakh mein hai: 4 lakh ke liye sirf 4 likhiye."
                  : wcShown !== null && wcShown !== wcTyped
                    ? `Rupees mein likha tha; Rs. ${wcShown.toFixed(2)} lakh maana jaayega`
                    : "Jaise 5 lakh project mein 1 lakh CC aur 4 lakh TL ho to yahan 1 likhiye. Khaali = business ke hisaab se apne aap"
              }
            >
              <NumberBox
                label="Isme CC / working capital wala hissa, margin sahit (Rs. lakh)"
                nullable
                value={wc === null ? null : toLakh(wc)}
                onChange={(v) => {
                  set(
                    "workingCapitalOverride",
                    v === null ? null : Math.round(v * 100000),
                  );
                  setBankTl(null);
                  setBankCc(null);
                }}
                suffix="lakh"
              />
            </Field>
            <div className="rounded-ds-lg bg-ds-surface-sunken p-3 text-sm">
              <p className="text-xs font-bold text-ds-text-secondary">
                Loan (margin dono mein se)
              </p>
              {wcTooBig ? (
                <p className="mt-1 text-xs font-semibold text-ds-danger">
                  Working capital galat hai. Pehle use theek kariye.
                </p>
              ) : ccLakh === null || tlLakh === null ? (
                <p className="mt-1 text-xs text-ds-text-muted">
                  Working capital bhariye, ya &quot;DPR banaiye&quot; dabaiye:
                  term loan aur CC apne aap banenge.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-ds-text-secondary">
                    Term loan wala hissa (machinery) Rs.{" "}
                    {(costShown - (wcForSplit ?? 0)).toFixed(2)} + CC wala hissa
                    Rs. {(wcForSplit ?? 0).toFixed(2)} = project Rs.{" "}
                    {costShown.toFixed(2)} lakh
                  </p>
                  <p className="mt-1 font-bold tabular-nums text-ds-text-primary">
                    Bank se: Term loan Rs. {tlLakh.toFixed(2)} · CC Rs.{" "}
                    {ccLakh.toFixed(2)} lakh
                  </p>
                  <p className="mt-0.5 text-xs text-ds-text-muted">
                    Dono mein se {ownPct}% margin nikala: apna hissa Rs.{" "}
                    {(costShown * margin).toFixed(2)} lakh
                  </p>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
            className="mt-6 flex w-full items-center justify-between rounded-ds-lg border border-ds-border px-3 py-2.5 text-left text-sm font-bold text-ds-text-primary hover:bg-ds-surface-sunken"
          >
            <span>
              Aur details (optional)
              <span className="block text-xs font-normal text-ds-text-muted">
                Pita ka naam, pata, mobile, unit ka naam, margin, byaaj, seedha
                bank loan. Khaali chhodenge to bhi DPR banegi.
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                moreOpen && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
          <div hidden={!moreOpen}>
            <h3 className="mt-6 text-xs font-bold uppercase tracking-wide text-ds-text-muted">
              Promoter
            </h3>
            <div className="mt-2 grid gap-4 md:grid-cols-2">
              <Field guide="fatherName" label="Pita / pati ka naam">
                <AdminInput
                  value={lead.fatherName}
                  onChange={(e) => setLead({ fatherName: e.target.value })}
                />
              </Field>
              <Field guide="mobile" label="Mobile">
                <AdminInput
                  value={lead.mobile}
                  inputMode="tel"
                  onChange={(e) => setLead({ mobile: e.target.value })}
                />
              </Field>
              <Field label="Promoter ka pata" className="md:col-span-2">
                <AdminInput
                  value={lead.address}
                  placeholder="Jaise: 22 Kabeer Nagar, Orai, Jalaun 285001"
                  onChange={(e) => setLead({ address: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field guide="age" label="Umr">
                  <NumberBox
                    label="Umr"
                    nullable
                    value={lead.age}
                    onChange={(v) =>
                      setLead({ age: v === null ? null : Math.round(v) })
                    }
                  />
                </Field>
                <Field guide="socialCategory" label="Category">
                  <AdminSelect
                    value={lead.socialCategory || "General"}
                    onChange={(e) => changeSocialCategory(e.target.value)}
                  >
                    {PROMOTER_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </AdminSelect>
                </Field>
              </div>
            </div>
            <h3 className="mt-6 text-xs font-bold uppercase tracking-wide text-ds-text-muted">
              Unit
            </h3>
            <div className="mt-2 grid gap-4 md:grid-cols-2">
              <Field
                guide="businessName"
                label="Unit / business ka naam"
                help="Khaali chhodenge to promoter ka naam lagega"
              >
                <AdminInput
                  value={input.businessName}
                  placeholder={lead.name || "Jaise: Mohd Asif Khan"}
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
                guide="address"
                label="Unit ka pata (location)"
                className="md:col-span-2"
              >
                <AdminInput
                  value={input.address}
                  placeholder="Jaise: Naya Patel Nagar, Orai"
                  onChange={(e) => set("address", e.target.value)}
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
              <Field guide="startFy" label="Shuru hone ka saal">
                <NumberBox
                  label="Shuru hone ka saal"
                  value={input.startFy}
                  onChange={(v) =>
                    set("startFy", Math.round(v ?? new Date().getFullYear()))
                  }
                />
              </Field>
            </div>
            <h3 className="mt-6 text-xs font-bold uppercase tracking-wide text-ds-text-muted">
              Loan
            </h3>
            <div className="mt-2 grid gap-4 md:grid-cols-2">
              <Field guide="sector" label="Kaam ka prakaar">
                <AdminSelect
                  value={sector}
                  onChange={(e) => {
                    const next = e.target.value as typeof sector;
                    setSector(next);
                    keepEligible(input.scheme, next);
                  }}
                >
                  <option value="all">Sab</option>
                  {allowedSectors.map((x) => (
                    <option key={x} value={x}>
                      {SECTOR_LABEL[x]}
                    </option>
                  ))}
                </AdminSelect>
              </Field>
              <Field
                guide="ownContributionPct"
                label="Apna hissa / margin (%)"
                help={`Khaali = yojana ka ${scheme?.ownContributionPct ?? 25}%`}
              >
                <NumberBox
                  label="Apna hissa / margin (%)"
                  nullable
                  value={input.ownContributionPct}
                  onChange={(v) => {
                    set("ownContributionPct", v);
                    if (loanMode)
                      fromLoans(
                        bankTl,
                        bankCc,
                        v ?? scheme?.ownContributionPct ?? 25,
                      );
                  }}
                  suffix="%"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field guide="termLoanInterestPct" label="Byaaj (% saalana)">
                  <NumberBox
                    label="Byaaj (% saalana)"
                    value={input.termLoanInterestPct}
                    onChange={(v) => {
                      set("termLoanInterestPct", v ?? 0);
                      set("ccInterestPct", v ?? 0);
                    }}
                    suffix="%"
                  />
                </Field>
                <Field guide="tenureYears" label="Loan kitne saal mein">
                  <NumberBox
                    label="Loan kitne saal mein"
                    value={input.tenureYears}
                    onChange={(v) => set("tenureYears", v ?? 5)}
                    suffix="saal"
                  />
                </Field>
              </div>
              <div className="rounded-ds-lg border border-dashed border-ds-border p-3 md:col-span-2">
                <p className="text-xs font-bold text-ds-text-secondary">
                  Seedha bank loan likhiye (agar pata hai)
                </p>
                <p className="mt-0.5 text-xs text-ds-text-muted">
                  Jaise TL 262500 aur CC 175000: margin % ke saath project cost
                  aur CC wala hissa neeche apne aap bhar jaayega. Rupees ya
                  lakh, dono chalega.
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Field guide="termLoanOverride" label="Term loan, bank se">
                    <NumberBox
                      label="Term loan, bank se"
                      nullable
                      value={bankTl}
                      onChange={(v) => {
                        setBankTl(v);
                        fromLoans(v, bankCc, ownPct);
                      }}
                    />
                  </Field>
                  <Field guide="ccLimitOverride" label="CC, bank se">
                    <NumberBox
                      label="CC, bank se"
                      nullable
                      value={bankCc}
                      onChange={(v) => {
                        setBankCc(v);
                        fromLoans(bankTl, v, ownPct);
                      }}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-ds-xl border border-ds-border bg-ds-surface/95 p-3 shadow-ds-md backdrop-blur">
          <AdminButton
            type="button"
            loading={saving === "draft"}
            disabled={saving !== null}
            onClick={() => save("draft")}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            DPR banaiye
          </AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
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

      {input.products.length > 0 ? (
        <LiveSummary report={report} extraWarnings={eligibility} />
      ) : (
        <aside
          className="xl:sticky xl:top-24 xl:self-start"
          aria-label="DPR summary"
        >
          <AdminCard>
            <h2 className="text-[15px] font-bold text-ds-text-primary">
              Hisaab
            </h2>
            <p className="mt-1 text-sm text-ds-text-muted">
              Basic details bharkar &quot;DPR banaiye&quot; dabaiye. Uske baad
              yahan project cost, loan, subsidy, DSCR aur saal-wise profit
              dikhega.
            </p>
          </AdminCard>
        </aside>
      )}
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
  // Only what the basic form can act on: the details it no longer asks
  // (qualification, experience, individual running costs) are filled by the
  // business type and are not the admin's to chase.
  const warnings = [...extraWarnings, ...report.warnings].filter(
    (w) => !/qualification|anubhav|Kharcha nahi bhara|quotation/i.test(w),
  );
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
