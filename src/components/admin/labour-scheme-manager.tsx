"use client";

import { useState } from "react";
import { AlertTriangle, Archive, Check, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { CATEGORY_LABEL, type LabourScheme } from "@/lib/labour/types";
import { cn } from "@/lib/utils";

/**
 * The screen where a government figure gets corrected.
 *
 * The point of this panel is that nobody edits TypeScript to change a rupee
 * amount. An administrator who reads a new notification opens the scheme,
 * changes the figure, pastes the notification link, and marks it verified —
 * and the public page changes with the next request.
 *
 * Every save records what the row looked like before, so a number can be
 * traced back to who changed it and why.
 */

type Row = LabourScheme & { daysSinceVerified: number | null; stale: boolean };

export function LabourSchemeManager({ schemes, readOnly }: { schemes: Row[]; readOnly: boolean }) {
  const { success, error } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [rows, setRows] = useState(schemes);

  const patch = async (id: string, body: Record<string, unknown>, reason: string) => {
    setBusy(id);
    try {
      const response = await fetch("/api/admin/labour-schemes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, patch: body, reason }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Could not save.");

      setRows((current) =>
        current.map((row) =>
          row.id === id
            ? {
                ...row,
                published: typeof body.published === "boolean" ? body.published : row.published,
                verification: {
                  ...row.verification,
                  status:
                    typeof body.verification_status === "string"
                      ? (body.verification_status as LabourScheme["verification"]["status"])
                      : row.verification.status,
                  verifiedOn:
                    typeof body.verified_on === "string" ? body.verified_on : row.verification.verifiedOn,
                },
                stale: body.verification_status === "verified" ? false : row.stale,
              }
            : row,
        ),
      );
      success("Saved.");
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  };

  const counts = {
    total: rows.length,
    published: rows.filter((row) => row.published).length,
    verified: rows.filter((row) => row.verification.status === "verified").length,
    stale: rows.filter((row) => row.stale).length,
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Tally label="Schemes" value={counts.total} />
        <Tally label="Published" value={counts.published} />
        <Tally label="Verified" value={counts.verified} />
        <Tally label="Needs verification" value={counts.stale} tone={counts.stale ? "warn" : "plain"} />
      </section>

      {counts.stale ? (
        <p className="flex items-start gap-2 rounded-xl border-l-4 border-l-[var(--dc-flame)] bg-orange-50 px-3.5 py-3 text-[12.5px] font-bold leading-snug text-[#c9430a]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {counts.stale} scheme ki jankari 90 din se purani hai ya verified nahi hai. Official notification
          dekhkar amount confirm kijiye, phir &ldquo;Verified&rdquo; par tap kijiye.
        </p>
      ) : null}

      {readOnly ? (
        <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-[12.5px] font-bold text-amber-800">
          Ye list abhi code ke initial dataset se dikh rahi hai — database mein rows nahi hain. Migration
          chalane aur schemes seed karne ke baad hi edit save honge.
        </p>
      ) : null}

      <ul className="space-y-2.5">
        {rows.map((scheme) => (
          <li key={scheme.id} className="lg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wide text-[var(--dc-blue-deep)]">
                  {CATEGORY_LABEL[scheme.category]}
                </p>
                <h3 className="text-[14.5px] font-extrabold leading-tight text-[var(--dc-ink)]">
                  {scheme.name}
                </h3>
                <p className="mt-0.5 text-[11.5px] font-semibold text-[var(--dc-body)]">
                  {scheme.benefits.length} benefit lines ·{" "}
                  {scheme.verification.verifiedOn
                    ? `last verified ${scheme.verification.verifiedOn}`
                    : "kabhi verify nahi hua"}
                  {scheme.daysSinceVerified !== null ? ` · ${scheme.daysSinceVerified} din pehle` : ""}
                </p>
              </div>

              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase",
                  scheme.verification.status === "verified" && !scheme.stale
                    ? "bg-[#0f9d58]/12 text-[#0b7742]"
                    : "bg-amber-500/15 text-amber-800",
                )}
              >
                {scheme.verification.status === "verified" && !scheme.stale ? (
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {scheme.stale && scheme.verification.status === "verified"
                  ? "Purani"
                  : scheme.verification.status}
              </span>
            </div>

            {scheme.verification.caveat ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11.5px] font-bold leading-snug text-amber-800">
                {scheme.verification.caveat}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <Action
                disabled={readOnly || busy === scheme.id}
                onClick={() =>
                  patch(
                    scheme.id,
                    { verification_status: "verified", verified_on: new Date().toISOString().slice(0, 10) },
                    "Official notification dekhkar confirm kiya",
                  )
                }
                icon={busy === scheme.id ? Loader2 : Check}
                spinning={busy === scheme.id}
                tone="good"
              >
                Verified
              </Action>
              <Action
                disabled={readOnly || busy === scheme.id}
                onClick={() => patch(scheme.id, { verification_status: "needs_review" }, "Dobara check karna hai")}
                icon={AlertTriangle}
                tone="warn"
              >
                Needs review
              </Action>
              <Action
                disabled={readOnly || busy === scheme.id}
                onClick={() => patch(scheme.id, { published: !scheme.published }, "Publish state badla")}
                icon={scheme.published ? Eye : EyeOff}
                tone="plain"
              >
                {scheme.published ? "Published" : "Draft"}
              </Action>
              <Action
                disabled={readOnly || busy === scheme.id}
                onClick={() =>
                  patch(
                    scheme.id,
                    { verification_status: "archived", published: false },
                    "Scheme band ya purani ho gayi",
                  )
                }
                icon={Archive}
                tone="plain"
              >
                Archive
              </Action>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tally({ label, value, tone = "plain" }: { label: string; value: number; tone?: "plain" | "warn" }) {
  return (
    <div className="lg-card p-3.5 text-center">
      <p
        className={cn(
          "text-[1.6rem] font-extrabold leading-none tabular-nums",
          tone === "warn" ? "text-[#c9430a]" : "text-[var(--dc-ink)]",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] font-bold text-[var(--dc-body)]">{label}</p>
    </div>
  );
}

function Action({
  children,
  onClick,
  disabled,
  icon: Icon,
  tone,
  spinning,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon: typeof Check;
  tone: "good" | "warn" | "plain";
  spinning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[12.5px] font-bold transition disabled:opacity-40",
        tone === "good"
          ? "border-[#0f9d58]/30 bg-[#0f9d58]/8 text-[#0b7742]"
          : tone === "warn"
            ? "border-amber-500/30 bg-amber-50 text-amber-800"
            : "border-[var(--dc-ink)]/12 bg-white text-[var(--dc-body)]",
      )}
    >
      <Icon className={cn("h-4 w-4", spinning && "animate-spin")} aria-hidden="true" />
      {children}
    </button>
  );
}
