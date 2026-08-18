"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { COMMISSION_SCOPE_TYPES, COMMISSION_TYPES, SCOPE_LABELS } from "@/lib/commission-rules";
import type { CommissionRuleOptions } from "@/lib/admin/commission-rules-data";
import type { CommissionScopeType, CommissionType } from "@/lib/ap-types";

const FIELD =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(15,93,184,0.08)]";
const LABEL = "text-xs font-bold uppercase tracking-[0.1em] text-slate-500";

type Slab = { min: string; max: string; rate: string; fixed: string };

const EMPTY_SLAB: Slab = { min: "", max: "", rate: "", fixed: "" };

const TYPE_LABELS: Record<CommissionType, string> = {
  fixed: "Flat amount",
  percentage: "Percentage of sale",
  tiered: "Slabs by sale value",
};

export function CommissionRuleForm({ options }: { options: CommissionRuleOptions }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scopeType, setScopeType] = useState<CommissionScopeType>("global");
  const [scopeTarget, setScopeTarget] = useState("");
  const [campaignCode, setCampaignCode] = useState("");
  const [commissionType, setCommissionType] = useState<CommissionType>("percentage");
  const [fixedAmount, setFixedAmount] = useState("");
  const [percentageRate, setPercentageRate] = useState("");
  const [slabs, setSlabs] = useState<Slab[]>([{ ...EMPTY_SLAB }]);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [priority, setPriority] = useState("0");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const targetChoices =
    scopeType === "service" ? options.services : scopeType === "partner" ? options.partners : scopeType === "tier" ? options.tiers : [];

  function reset() {
    setName("");
    setDescription("");
    setScopeType("global");
    setScopeTarget("");
    setCampaignCode("");
    setCommissionType("percentage");
    setFixedAmount("");
    setPercentageRate("");
    setSlabs([{ ...EMPTY_SLAB }]);
    setMinAmount("");
    setMaxAmount("");
    setPriority("0");
    setValidFrom("");
    setValidUntil("");
  }

  function updateSlab(index: number, patch: Partial<Slab>) {
    setSlabs((current) => current.map((slab, i) => (i === index ? { ...slab, ...patch } : slab)));
  }

  function submit() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/commission-rules", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            scopeType,
            serviceId: scopeType === "service" ? scopeTarget : null,
            agencyPartnerId: scopeType === "partner" ? scopeTarget : null,
            tierId: scopeType === "tier" ? scopeTarget : null,
            campaignCode: scopeType === "campaign" ? campaignCode : null,
            commissionType,
            fixedAmount: Number(fixedAmount || 0),
            percentageRate: Number(percentageRate || 0),
            tieredConfig:
              commissionType === "tiered"
                ? slabs.map((slab) => ({
                    min: Number(slab.min || 0),
                    max: Number(slab.max || 0),
                    rate: Number(slab.rate || 0),
                    fixed: slab.fixed === "" ? undefined : Number(slab.fixed),
                  }))
                : [],
            minAmount: Number(minAmount || 0),
            maxAmount: maxAmount === "" ? null : Number(maxAmount),
            priority: Number(priority || 0),
            validFrom: validFrom || null,
            validUntil: validUntil || null,
            isActive: true,
          }),
        });

        const result = (await response.json().catch(() => ({}))) as { message?: string };
        if (!response.ok) throw new Error(result.message ?? "Could not create the rule.");

        success("Commission rule created. New sales will price against it.");
        reset();
        setOpen(false);
        router.refresh();
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Could not create the rule.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white transition hover:opacity-90"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        New commission rule
      </button>
    );
  }

  return (
    <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="rule-name">Rule name</label>
            <input
              id="rule-name"
              className={FIELD}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gold tier — 12%"
            />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="rule-priority">Priority</label>
            <input
              id="rule-priority"
              type="number"
              className={FIELD}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
            <p className="text-[11px] font-medium text-slate-500">Higher wins when two rules of the same scope match.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="rule-description">Description</label>
          <input
            id="rule-description"
            className={FIELD}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional — why this rule exists"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="rule-scope">Applies to</label>
            <select
              id="rule-scope"
              className={FIELD}
              value={scopeType}
              onChange={(e) => {
                setScopeType(e.target.value as CommissionScopeType);
                setScopeTarget("");
              }}
            >
              {COMMISSION_SCOPE_TYPES.map((scope) => (
                <option key={scope} value={scope}>
                  {SCOPE_LABELS[scope]}
                </option>
              ))}
            </select>
          </div>

          {scopeType === "campaign" ? (
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="rule-campaign">Campaign code</label>
              <input
                id="rule-campaign"
                className={FIELD}
                value={campaignCode}
                onChange={(e) => setCampaignCode(e.target.value)}
                placeholder="e.g. DIWALI25"
              />
            </div>
          ) : null}

          {targetChoices.length > 0 ? (
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="rule-target">{SCOPE_LABELS[scopeType]}</label>
              <select
                id="rule-target"
                className={FIELD}
                value={scopeTarget}
                onChange={(e) => setScopeTarget(e.target.value)}
              >
                <option value="">Select…</option>
                {targetChoices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="rule-type">Pays</label>
          <select
            id="rule-type"
            className={FIELD}
            value={commissionType}
            onChange={(e) => setCommissionType(e.target.value as CommissionType)}
          >
            {COMMISSION_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        {commissionType === "fixed" ? (
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="rule-fixed">Flat amount (₹)</label>
            <input
              id="rule-fixed"
              type="number"
              className={FIELD}
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              placeholder="500"
            />
          </div>
        ) : null}

        {commissionType === "percentage" ? (
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="rule-rate">Percentage of sale (%)</label>
            <input
              id="rule-rate"
              type="number"
              step="0.01"
              className={FIELD}
              value={percentageRate}
              onChange={(e) => setPercentageRate(e.target.value)}
              placeholder="10"
            />
          </div>
        ) : null}

        {commissionType === "tiered" ? (
          <div className="space-y-2">
            <p className={LABEL}>Slabs</p>
            <p className="text-[11px] font-medium text-slate-500">
              Slabs must not overlap, and each one needs a rate or a flat amount above zero — otherwise sales landing in it pay nothing.
            </p>
            {slabs.map((slab, index) => (
              <div key={index} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <input
                  className={FIELD}
                  type="number"
                  value={slab.min}
                  onChange={(e) => updateSlab(index, { min: e.target.value })}
                  placeholder="From ₹"
                  aria-label={`Slab ${index + 1} minimum`}
                />
                <input
                  className={FIELD}
                  type="number"
                  value={slab.max}
                  onChange={(e) => updateSlab(index, { max: e.target.value })}
                  placeholder="To ₹"
                  aria-label={`Slab ${index + 1} maximum`}
                />
                <input
                  className={FIELD}
                  type="number"
                  step="0.01"
                  value={slab.rate}
                  onChange={(e) => updateSlab(index, { rate: e.target.value })}
                  placeholder="Rate %"
                  aria-label={`Slab ${index + 1} rate`}
                />
                <input
                  className={FIELD}
                  type="number"
                  value={slab.fixed}
                  onChange={(e) => updateSlab(index, { fixed: e.target.value })}
                  placeholder="or flat ₹"
                  aria-label={`Slab ${index + 1} flat amount`}
                />
                <button
                  type="button"
                  onClick={() => setSlabs((current) => current.filter((_, i) => i !== index))}
                  disabled={slabs.length === 1}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSlabs((current) => [...current, { ...EMPTY_SLAB }])}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add slab
            </button>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="rule-min">Min payout (₹)</label>
            <input id="rule-min" type="number" className={FIELD} value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="rule-max">Max payout (₹)</label>
            <input id="rule-max" type="number" className={FIELD} value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="No cap" />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="rule-from">Valid from</label>
            <input id="rule-from" type="date" className={FIELD} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="rule-until">Valid until</label>
            <input id="rule-until" type="date" className={FIELD} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={submit}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Create rule
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setOpen(false)}
            className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </Card>
  );
}
