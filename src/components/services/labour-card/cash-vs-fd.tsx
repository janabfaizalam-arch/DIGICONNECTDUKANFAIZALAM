import { Banknote, Landmark, TriangleAlert } from "lucide-react";

import { formatInr } from "@/components/services/labour-card/benefit-line";
import type { BenefitLine, LabourScheme } from "@/lib/labour/types";

/**
 * The one confusion this whole page exists to prevent.
 *
 * A worker whose daughter is born is told about "twenty-five thousand", and
 * hears it twice — once for the birth grant that reaches the mother's bank
 * account, and once for the deposit opened in the girl's name that pays out
 * eighteen years later. Two identical numbers, two entirely different things,
 * and the failure mode is a family that budgets for fifty thousand rupees they
 * will not see.
 *
 * So the two are shown side by side, at the same size, with the difference
 * stated rather than implied — and with the addition explicitly refused
 * underneath.
 *
 * Nothing here is written into this file. The pair is found in the scheme
 * data: the cash line and the deposit line whose amounts happen to match are,
 * by definition, the two that get confused. If a notification changes one of
 * them and they stop matching, this section stops claiming they do.
 */

type Pair = { scheme: LabourScheme; cash: BenefitLine; fd: BenefitLine };

export function findConfusablePair(schemes: LabourScheme[]): Pair | null {
  for (const scheme of schemes) {
    const cashLines = scheme.benefits.filter((line) => line.kind === "cash" && line.amount !== null);
    const fdLines = scheme.benefits.filter((line) => line.kind === "fd" && line.amount !== null);
    for (const fd of fdLines) {
      const cash = cashLines.find((line) => line.amount === fd.amount);
      if (cash) return { scheme, cash, fd };
    }
  }
  return null;
}

export function CashVsFd({ schemes }: { schemes: LabourScheme[] }) {
  const pair = findConfusablePair(schemes);
  if (!pair) return null;

  const { scheme, cash, fd } = pair;

  return (
    <section id="cash-vs-fd" className="scroll-mt-24">
      <div
        className="overflow-hidden rounded-3xl bg-gradient-to-b from-white to-[#f8fafc] p-5 sm:p-7"
        style={{ boxShadow: "var(--lc-shadow-1)", border: "1px solid var(--lc-border)" }}
      >
        <p
          className="text-[11px] font-black uppercase tracking-[0.16em]"
          style={{ color: "var(--lc-saffron-deep)" }}
        >
          सबसे ज़रूरी अंतर
        </p>
        <h2
          className="lc-figure mt-2 text-[1.4rem] font-extrabold sm:text-[1.85rem]"
          style={{ color: "var(--lc-navy)" }}
        >
          {formatInr(cash.amount as number)} नकद और {formatInr(fd.amount as number)} की FD — दोनों एक
          चीज़ नहीं हैं
        </h2>
        <p className="mt-2 text-[13.5px] font-medium" style={{ color: "var(--lc-muted)" }}>
          {scheme.nameHi || scheme.name} के अंतर्गत दोनों का अंक एक जैसा है, इसलिए इन्हें अक्सर जोड़ लिया
          जाता है। नीचे देखिए कि दोनों अलग क्यों हैं।
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Side
            tone="cash"
            icon={Banknote}
            kicker="सीधे बैंक खाते में (DBT)"
            title={cash.labelHi || cash.label}
            amount={formatInr(cash.amount as number)}
            when="जन्म के बाद, नियमानुसार आवेदन पर"
            points={[
              "पैसा माता/पिता के बैंक खाते में आता है",
              "आते ही ख़र्च किया जा सकता है",
              ...(cash.conditions ?? []),
            ]}
          />
          <Side
            tone="fd"
            icon={Landmark}
            kicker="बेटी के नाम सावधि जमा"
            title={fd.labelHi || fd.label}
            amount={formatInr(fd.amount as number)}
            when="बेटी के 18 वर्ष पूरे होने पर, शर्त के साथ"
            points={[
              "यह पैसा अभी हाथ में नहीं आता",
              "बैंक में बेटी के नाम जमा रहता है",
              ...(fd.conditions ?? []),
            ]}
          />
        </div>

        {/*
          The addition, refused in words. `isSummable` refuses it in code — a
          cash line and a deposit line can never be totalled — and this is the
          same rule written where a reader will see it.
        */}
        <p
          className="mt-5 flex items-start gap-3 rounded-2xl border-l-4 p-4 text-[13px] font-bold"
          style={{
            borderLeftColor: "var(--lc-saffron)",
            background: "var(--lc-saffron-soft)",
            color: "#9a3412",
          }}
        >
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          इन दोनों को जोड़कर एक बड़ी नकद रकम मत समझिए। एक अभी खाते में आती है, दूसरी अठारह साल बाद
          शर्त पूरी होने पर मिलती है।
        </p>
      </div>
    </section>
  );
}

function Side({
  tone,
  icon: Icon,
  kicker,
  title,
  amount,
  when,
  points,
}: {
  tone: "cash" | "fd";
  icon: typeof Banknote;
  kicker: string;
  title: string;
  amount: string;
  when: string;
  points: string[];
}) {
  const ink = tone === "cash" ? "var(--lc-cash)" : "var(--lc-fd)";
  const soft = tone === "cash" ? "var(--lc-cash-soft)" : "var(--lc-fd-soft)";

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: ink + "33", background: soft }}>
      <span
        aria-hidden="true"
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: ink }}
      >
        <Icon className="h-5 w-5 text-white" strokeWidth={2.1} />
      </span>
      <p className="mt-3 text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: ink }}>
        {kicker}
      </p>
      <h3 className="mt-1 text-[15.5px] font-bold" style={{ color: "var(--lc-navy)" }}>
        {title}
      </h3>
      <p className="lc-figure mt-2 text-[2rem] font-extrabold leading-none" style={{ color: ink }}>
        {amount}
      </p>
      <p className="mt-2 text-[12.5px] font-bold" style={{ color: ink }}>
        {when}
      </p>
      <ul className="mt-3 space-y-1.5">
        {points.map((point) => (
          <li
            key={point}
            className="flex gap-2 text-[12.5px] font-semibold leading-snug"
            style={{ color: "var(--lc-muted)" }}
          >
            <span aria-hidden="true" style={{ color: ink }}>•</span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
