"use client";

import { useState } from "react";
import { Rocket, Sparkles } from "lucide-react";

import { AdminButton, AdminInput, AdminSelect } from "@/components/admin/primitives/controls-ui";
import { AdminCard } from "@/components/admin/primitives/layout";
import { STATUS_TONE_CLASS } from "@/lib/admin/status-tone";
import { CONSTITUTIONS, fyLabel, type Constitution, type SchemeId } from "@/lib/balance-sheets/engine";
import { BUSINESS_KINDS, quickBalanceSheet, type BusinessKind, type QuickResult } from "@/lib/balance-sheets/quick";
import { AREA_OPTIONS, CATEGORY_OPTIONS, SCHEME_OPTIONS, termsFor } from "@/lib/balance-sheets/schemes";
import { cn } from "@/lib/utils";

/**
 * Quick balance sheet: only what the customer knows. "Balance sheet
 * banaiye" works out the whole Trading and P&L, the balance sheet (which
 * tallies), the projections and the new loan, and saves it.
 */

export type QuickDetails = {
  businessName: string;
  ownerName: string;
  constitution: Constitution;
  natureOfBusiness: string;
  mobile: string;
  city: string;
  state: string;
  baseYear: string;
  hasActual: boolean;
};

export type QuickSeed = QuickDetails & {
  kind: BusinessKind;
  sales: string;
  netProfit: string;
  closingStock: string;
  cashAndBank: string;
  fixedAssets: string;
  loanOutstanding: string;
  scheme: SchemeId;
  schemeArea: "urban" | "rural";
  schemeCategory: "general" | "special";
  machineryCost: string;
  workingCapital: string;
  ownPct: string;
  interestPct: string;
  tenureYears: string;
};

const num = (v: string) => {
  const cleaned = v.replace(/,/g, "").trim();
  return cleaned === "" ? null : Number.isFinite(Number(cleaned)) ? Number(cleaned) : null;
};

function Box({ label, help, children, wide }: { label: string; help?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={cn("block space-y-1.5", wide && "sm:col-span-2")}>
      <span className="block text-xs font-bold text-ds-text-secondary">{label}</span>
      {children}
      {help ? <span className="block text-xs text-ds-text-muted">{help}</span> : null}
    </label>
  );
}

function Money({ label, value, onChange, help, placeholder }: { label: string; value: string; onChange: (v: string) => void; help?: string; placeholder?: string }) {
  return (
    <Box label={label} help={help}>
      <AdminInput aria-label={label} inputMode="decimal" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="tabular-nums" />
    </Box>
  );
}

export function BalanceSheetQuick({
  seed,
  yearOptions,
  busy,
  onBuild,
}: {
  seed: QuickSeed;
  yearOptions: number[];
  busy: boolean;
  onBuild: (details: QuickDetails, result: QuickResult) => void;
}) {
  const [q, setQ] = useState<QuickSeed>(seed);
  const [message, setMessage] = useState<string | null>(null);
  const set = <K extends keyof QuickSeed>(key: K, value: QuickSeed[K]) => setQ((current) => ({ ...current, [key]: value }));
  const terms = q.scheme === "none" ? null : termsFor({ scheme: q.scheme, schemeSector: q.kind, schemeArea: q.schemeArea, schemeCategory: q.schemeCategory });

  function build() {
    setMessage(null);
    if (q.businessName.trim().length < 2 && q.ownerName.trim().length < 2) return setMessage("Business ya owner ka naam bhariye.");
    if (q.ownerName.trim().length < 2) return setMessage("Owner / proprietor ka naam bhariye.");
    const result = quickBalanceSheet({
      kind: q.kind,
      constitution: q.constitution,
      hasActual: q.hasActual,
      sales: num(q.sales) ?? 0,
      netProfit: num(q.netProfit) ?? Number.NaN,
      closingStock: num(q.closingStock),
      cashAndBank: num(q.cashAndBank),
      fixedAssets: num(q.fixedAssets),
      loanOutstanding: num(q.loanOutstanding),
      scheme: q.scheme,
      schemeArea: q.schemeArea,
      schemeCategory: q.schemeCategory,
      machineryCost: num(q.machineryCost) ?? 0,
      workingCapital: num(q.workingCapital) ?? 0,
      ownPct: num(q.ownPct),
      interestPct: num(q.interestPct) ?? 10,
      tenureYears: Math.max(1, Math.round(num(q.tenureYears) ?? 5)),
      salesGrowthPct: 10,
    });
    if (typeof result === "string") return setMessage(result);
    onBuild(
      {
        businessName: q.businessName.trim() || q.ownerName.trim(),
        ownerName: q.ownerName.trim(),
        constitution: q.constitution,
        natureOfBusiness: q.natureOfBusiness,
        mobile: q.mobile,
        city: q.city,
        state: q.state,
        baseYear: q.baseYear,
        hasActual: q.hasActual,
      },
      result,
    );
  }

  return (
    <AdminCard>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ds-lg bg-ds-primary text-ds-text-inverted">
          <Rocket className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-ds-text-primary">Balance sheet: sirf basic details</h2>
          <p className="mt-0.5 text-[13px] text-ds-text-muted">
            ITR ka turnover aur net profit, aur jo customer ko pata ho (stock, cash, machinery, loan) bhariye. Purchases, kharche, debtors, creditors, capital account aur 5 saal ki
            projection apne aap banegi, aur balance sheet tally hogi.
          </p>
        </div>
      </div>

      <h3 className="mt-5 text-xs font-bold uppercase tracking-wide text-ds-text-muted">1. Customer</h3>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Box label="Owner / proprietor ka naam *">
          <AdminInput aria-label="Owner / proprietor ka naam *" value={q.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
        </Box>
        <Box label="Business / firm ka naam" help="Khaali = owner ka naam">
          <AdminInput aria-label="Business / firm ka naam" value={q.businessName} placeholder={q.ownerName} onChange={(e) => set("businessName", e.target.value)} />
        </Box>
        <Box label="Constitution">
          <AdminSelect aria-label="Constitution" value={q.constitution} onChange={(e) => set("constitution", e.target.value as Constitution)}>
            {CONSTITUTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </AdminSelect>
        </Box>
        <Box label="Kaam ka prakaar">
          <AdminSelect aria-label="Kaam ka prakaar" value={q.kind} onChange={(e) => set("kind", e.target.value as BusinessKind)}>
            {BUSINESS_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </AdminSelect>
        </Box>
        <Box label="Kaam kya hai">
          <AdminInput aria-label="Kaam kya hai" value={q.natureOfBusiness} placeholder="Jaise: kirana ki dukaan" onChange={(e) => set("natureOfBusiness", e.target.value)} />
        </Box>
        <Box label="Mobile">
          <AdminInput aria-label="Mobile" inputMode="numeric" maxLength={10} value={q.mobile} onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))} />
        </Box>
        <Box label="City">
          <AdminInput aria-label="City" value={q.city} onChange={(e) => set("city", e.target.value)} />
        </Box>
        <Box label="State">
          <AdminInput aria-label="State" value={q.state} onChange={(e) => set("state", e.target.value)} />
        </Box>
      </div>

      <h3 className="mt-6 text-xs font-bold uppercase tracking-wide text-ds-text-muted">2. Pichhla saal</h3>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Box label="Pichhle saal ka ITR hai?">
          <AdminSelect aria-label="Pichhle saal ka ITR hai?" value={q.hasActual ? "yes" : "no"} onChange={(e) => set("hasActual", e.target.value === "yes")}>
            <option value="yes">Haan, ITR / hisaab hai</option>
            <option value="no">Nahi, naya kaam hai</option>
          </AdminSelect>
        </Box>
        {q.hasActual ? (
          <Box label="Kis saal ka">
            <AdminSelect aria-label="Kis saal ka" value={q.baseYear} onChange={(e) => set("baseYear", e.target.value)}>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {fyLabel(year)}
                </option>
              ))}
            </AdminSelect>
          </Box>
        ) : null}
        {q.hasActual ? (
          <>
            <Money label="Turnover / sales (ITR wala) *" value={q.sales} onChange={(v) => set("sales", v)} placeholder="Jaise 2500000" />
            <Money label="Net profit (ITR wala) *" value={q.netProfit} onChange={(v) => set("netProfit", v)} placeholder="Jaise 210000" />
            <Money label="Saal ke ant mein stock" value={q.closingStock} onChange={(v) => set("closingStock", v)} help="Khaali = kaam ke hisaab se apne aap" />
            <Money label="Cash + bank balance" value={q.cashAndBank} onChange={(v) => set("cashAndBank", v)} help="Khaali = apne aap" />
            <Money label="Machinery / vehicle / furniture ki keemat" value={q.fixedAssets} onChange={(v) => set("fixedAssets", v)} help="Khaali = nahi hai" />
            <Money label="Purana loan baaki" value={q.loanOutstanding} onChange={(v) => set("loanOutstanding", v)} help="Khaali = koi loan nahi" />
          </>
        ) : (
          <Money label="Pehle saal ki andaazit sales *" value={q.sales} onChange={(v) => set("sales", v)} placeholder="Jaise 2500000" />
        )}
      </div>

      <h3 className="mt-6 text-xs font-bold uppercase tracking-wide text-ds-text-muted">3. Naya loan</h3>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Box label="Yojana">
          <AdminSelect aria-label="Yojana" value={q.scheme} onChange={(e) => set("scheme", e.target.value as SchemeId)}>
            {SCHEME_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </AdminSelect>
        </Box>
        {terms?.asks.area || terms?.asks.category ? (
          <div className="grid grid-cols-2 gap-3">
            {terms.asks.area ? (
              <Box label="Area">
                <AdminSelect aria-label="Area" value={q.schemeArea} onChange={(e) => set("schemeArea", e.target.value as "urban" | "rural")}>
                  {AREA_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </AdminSelect>
              </Box>
            ) : null}
            {terms.asks.category ? (
              <Box label="Category">
                <AdminSelect aria-label="Category" value={q.schemeCategory} onChange={(e) => set("schemeCategory", e.target.value as "general" | "special")}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </AdminSelect>
              </Box>
            ) : null}
          </div>
        ) : (
          <div />
        )}
        <Money label="Machinery / naya saaman (margin sahit)" value={q.machineryCost} onChange={(v) => set("machineryCost", v)} help="Isi se term loan banega" />
        <Money label="Working capital / CC (margin sahit)" value={q.workingCapital} onChange={(v) => set("workingCapital", v)} help="Isi se CC banega" />
        <Money label="Apna hissa / margin (%)" value={q.ownPct} onChange={(v) => set("ownPct", v)} help={`Khaali = ${terms ? `yojana ka ${terms.ownContributionPct}%` : "25%"}. Margin dono loan mein se nikalta hai.`} />
        <div className="grid grid-cols-2 gap-3">
          <Money label="Byaaj (%)" value={q.interestPct} onChange={(v) => set("interestPct", v)} />
          <Money label="Loan kitne saal" value={q.tenureYears} onChange={(v) => set("tenureYears", v)} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <AdminButton type="button" onClick={build} loading={busy} disabled={busy}>
          <Sparkles className="h-4 w-4" aria-hidden="true" /> Balance sheet banaiye
        </AdminButton>
        {message ? (
          <p role="alert" className={cn("rounded-ds-md px-3 py-1.5 text-sm font-semibold", STATUS_TONE_CLASS.danger)}>
            {message}
          </p>
        ) : null}
      </div>
    </AdminCard>
  );
}
