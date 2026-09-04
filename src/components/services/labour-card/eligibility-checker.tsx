"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2, HelpCircle, Info, RotateCcw } from "lucide-react";

import {
  CHECKER_DISCLAIMER,
  VERDICT_LABEL,
  cardIsUsable,
  runChecker,
  type CheckerAnswers,
  type Verdict,
} from "@/lib/labour/eligibility";
import { CATEGORY_LABEL, type LabourScheme } from "@/lib/labour/types";
import { cn } from "@/lib/utils";

/**
 * "Kya main eligible hoon?"
 *
 * Nine questions, all optional, and an answer that separates three different
 * things: what the answers support, what they rule out, and what was never
 * asked. That third column is the honest part — most checkers quietly treat
 * "not asked" as "fine" and hand back a confident yes somebody then travels to
 * a counter on.
 *
 * It is a guide, and the wording says so at the top and at the bottom. The
 * department decides.
 */

type Field =
  | { key: keyof CheckerAnswers; kind: "yesno"; label: string }
  | { key: keyof CheckerAnswers; kind: "number"; label: string; hint?: string; max?: number };

const FIELDS: Field[] = [
  { key: "hasCard", kind: "yesno", label: "Labour Card hai?" },
  { key: "cardActive", kind: "yesno", label: "Card active / renewed hai?" },
  { key: "membershipYears", kind: "number", label: "Registration ko kitne saal hue?", max: 60 },
  {
    key: "workedDaysLast12Months",
    kind: "number",
    label: "Pichhle 12 mahine mein kitne din nirman kaam kiya?",
    hint: "Kai yojanaon mein 90 din zaroori hai",
    max: 365,
  },
  { key: "age", kind: "number", label: "Aapki umar?", max: 100 },
  { key: "childCount", kind: "number", label: "Kitne bachche hain?", max: 12 },
  { key: "childAge", kind: "number", label: "Jis bachche ke liye poochh rahe hain, uski umar?", max: 30 },
  {
    key: "disabilityPercent",
    kind: "number",
    label: "Divyangta kitne percent hai? (agar lagu ho)",
    max: 100,
  },
  {
    key: "daysSinceEvent",
    kind: "number",
    label: "Shaadi / janm / durghatna ko kitne din hue?",
    hint: "Kai yojanaon mein 1 saal ke andar apply karna hota hai",
    max: 4000,
  },
];

const VERDICT_TONE: Record<Verdict, { chip: string; icon: typeof CheckCircle2 }> = {
  likely: { chip: "bg-[#0f9d58]/12 text-[#0b7742]", icon: CheckCircle2 },
  needs_info: { chip: "bg-[#0f5db8]/12 text-[#0f5db8]", icon: HelpCircle },
  condition_missing: { chip: "bg-[#f25a00]/12 text-[#c9430a]", icon: AlertTriangle },
  not_applicable: { chip: "bg-slate-500/12 text-slate-600", icon: Info },
};

export function EligibilityChecker({ schemes }: { schemes: LabourScheme[] }) {
  const [answers, setAnswers] = useState<CheckerAnswers>({});
  const [submitted, setSubmitted] = useState(false);
  const still = useReducedMotion();

  const results = useMemo(() => (submitted ? runChecker(schemes, answers) : []), [submitted, schemes, answers]);
  const cardOk = cardIsUsable(answers);
  const likely = results.filter((result) => result.verdict === "likely");
  const maybe = results.filter((result) => result.verdict === "needs_info");
  const missing = results.filter((result) => result.verdict === "condition_missing");

  const set = (key: keyof CheckerAnswers, value: boolean | number | undefined) =>
    setAnswers((current) => ({ ...current, [key]: value }));

  return (
    <section id="eligibility" className="scroll-mt-24">
      <div className="lg-card p-4 sm:p-6">
        <h2 className="text-[1.35rem] font-extrabold tracking-tight text-[var(--dc-ink)] sm:text-[1.6rem]">
          Kya main eligible hoon?
        </h2>
        <p className="mt-1 text-[13px] font-medium leading-snug text-[var(--dc-body)]">
          Jitna aapko pata ho utna bhariye — jo chhod denge, uske baare mein hum kuch maan kar nahi chalenge.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className="rounded-xl border border-[var(--dc-ink)]/10 bg-white p-3">
              <p className="text-[12.5px] font-bold leading-snug text-[var(--dc-ink)]">{field.label}</p>
              {field.kind === "yesno" ? (
                <div className="mt-2 flex gap-1.5">
                  {[
                    { label: "Haan", value: true },
                    { label: "Nahi", value: false },
                  ].map((option) => {
                    const on = answers[field.key] === option.value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set(field.key, on ? undefined : option.value)}
                        className={cn(
                          "h-10 flex-1 rounded-lg text-[13px] font-bold transition",
                          on
                            ? "text-white"
                            : "border border-[var(--dc-ink)]/12 bg-white text-[var(--dc-body)]",
                        )}
                        style={on ? { background: "var(--dc-grad-blue)" } : undefined}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={field.max}
                    value={(answers[field.key] as number | undefined) ?? ""}
                    onChange={(event) =>
                      set(field.key, event.target.value === "" ? undefined : Number(event.target.value))
                    }
                    aria-label={field.label}
                    className="mt-2 h-11 w-full rounded-lg border border-[var(--dc-ink)]/12 bg-white px-3 text-[15px] font-bold text-[var(--dc-ink)] outline-none focus:border-[var(--dc-blue-deep)]"
                  />
                  {field.hint ? (
                    <p className="mt-1 text-[11px] font-semibold text-[var(--dc-body)]">{field.hint}</p>
                  ) : null}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl px-5 text-[14px] font-extrabold text-white shadow-[0_12px_26px_-14px_rgba(0,29,95,0.9)] transition hover:-translate-y-px sm:flex-none"
            style={{ background: "var(--dc-grad-blue)" }}
          >
            Result dekhein
          </button>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setSubmitted(false);
            }}
            className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-[var(--dc-ink)]/12 bg-white px-4 text-[13.5px] font-bold text-[var(--dc-body)]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
        </div>

        <AnimatePresence initial={false}>
          {submitted ? (
            <motion.div
              initial={still ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
              aria-live="polite"
            >
              {/*
                The card comes first, because without it nothing else on this
                page applies. Listing twelve schemes above this line would be
                twelve wrong answers.
              */}
              {answers.hasCard === false ? (
                <p className="rounded-xl border-l-4 border-l-[var(--dc-flame)] bg-orange-50 px-4 py-3 text-[13.5px] font-bold text-[#c9430a]">
                  Labour Card ke bina in yojanaon ka labh nahi milta. Pehle registration karwaiye — hum ismein
                  assistance de sakte hain.
                </p>
              ) : !cardOk && answers.cardActive === false ? (
                <p className="rounded-xl border-l-4 border-l-[var(--dc-flame)] bg-orange-50 px-4 py-3 text-[13.5px] font-bold text-[#c9430a]">
                  Card active nahi hai. Renewal ke baad hi zyadatar yojanayein lagu hoti hain.
                </p>
              ) : null}

              <div className="mt-3 grid grid-cols-3 gap-2">
                <Tally label="Sambhavit patra" value={likely.length} tone="good" />
                <Tally label="Jankari chahiye" value={maybe.length} tone="info" />
                <Tally label="Shart puri nahi" value={missing.length} tone="warn" />
              </div>

              <ul className="mt-3 space-y-2">
                {results
                  .filter((result) => result.verdict !== "not_applicable")
                  .map((result) => {
                    const tone = VERDICT_TONE[result.verdict];
                    const Icon = tone.icon;
                    return (
                      <li
                        key={result.scheme.id}
                        className="rounded-xl border border-[var(--dc-ink)]/10 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-extrabold leading-snug text-[var(--dc-ink)]">
                              {result.scheme.name}
                            </p>
                            <p className="text-[11px] font-bold text-[var(--dc-body)]">
                              {CATEGORY_LABEL[result.scheme.category]}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase",
                              tone.chip,
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            {VERDICT_LABEL[result.verdict]}
                          </span>
                        </div>

                        {result.missing.length ? (
                          <Reasons title="Ye shart puri nahi lag rahi" items={result.missing} tone="warn" />
                        ) : null}
                        {result.untested.length ? (
                          <Reasons title="Ye humne poocha hi nahi" items={result.untested} tone="info" />
                        ) : null}
                        <a
                          href={`#scheme-${result.scheme.slug}`}
                          className="mt-2 inline-block text-[12px] font-bold text-[var(--dc-blue-mid)] hover:underline"
                        >
                          Poori jankari dekhein →
                        </a>
                      </li>
                    );
                  })}
              </ul>

              <p className="mt-3 rounded-xl bg-[var(--dc-sky-soft)] px-3.5 py-3 text-[12px] font-bold leading-snug text-[var(--dc-ink)]">
                {CHECKER_DISCLAIMER}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Tally({ label, value, tone }: { label: string; value: number; tone: "good" | "info" | "warn" }) {
  const colour =
    tone === "good" ? "text-[#0b7742]" : tone === "info" ? "text-[var(--dc-blue-deep)]" : "text-[#c9430a]";
  return (
    <div className="rounded-xl bg-[var(--dc-sky-soft)] p-3 text-center">
      <p className={cn("text-[1.5rem] font-extrabold leading-none tabular-nums", colour)}>{value}</p>
      <p className="mt-1 text-[11px] font-bold leading-snug text-[var(--dc-body)]">{label}</p>
    </div>
  );
}

function Reasons({ title, items, tone }: { title: string; items: string[]; tone: "warn" | "info" }) {
  return (
    <div className="mt-2">
      <p
        className={cn(
          "text-[11px] font-black uppercase tracking-wide",
          tone === "warn" ? "text-[#c9430a]" : "text-[var(--dc-blue-deep)]",
        )}
      >
        {title}
      </p>
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li key={item} className="flex gap-1.5 text-[12px] font-semibold leading-snug text-[var(--dc-body)]">
            <span aria-hidden="true">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
