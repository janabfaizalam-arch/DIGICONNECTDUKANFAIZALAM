"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  Check,
  Database,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";

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
 *
 * Before the table has rows there is nothing to save into, and this screen
 * used to answer that by greying every button out. Four dead buttons and a
 * paragraph of explanation is not an answer — it is the same as broken. So the
 * buttons stay live and say what is missing when tapped, and the thing that
 * is missing has its own button right at the top.
 */

type Row = LabourScheme & { daysSinceVerified: number | null; stale: boolean };

export function LabourSchemeManager({ schemes, readOnly }: { schemes: Row[]; readOnly: boolean }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState(schemes);
  const setupRef = useRef<HTMLDivElement | null>(null);

  /** Send the reader to the one control that can unblock them. */
  const pointAtSetup = () => {
    error("Pehle schemes ko database mein import kijiye — upar wala button.");
    setupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setupRef.current?.animate?.(
      [{ transform: "scale(1)" }, { transform: "scale(1.015)" }, { transform: "scale(1)" }],
      { duration: 420, easing: "ease-out" },
    );
  };

  const importSeed = async () => {
    setImporting(true);
    try {
      const response = await fetch("/api/admin/labour-schemes", { method: "POST" });
      const json = (await response.json()) as { error?: string; imported?: number; existing?: number };
      if (!response.ok) throw new Error(json.error || "Import nahi ho paya.");

      success(
        json.imported
          ? `${json.imported} scheme database mein aa gayi. Ab edit save honge.`
          : "Saari schemes pehle se database mein hain.",
      );
      // The server component re-reads the table; the rows below come back
      // from the database and `readOnly` turns itself off.
      router.refresh();
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Import nahi ho paya.");
    } finally {
      setImporting(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>, reason: string) => {
    if (readOnly) {
      pointAtSetup();
      return;
    }
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
      {readOnly ? (
        <SetupCard ref={setupRef} count={rows.length} busy={importing} onImport={importSeed} />
      ) : null}

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
                disabled={busy === scheme.id}
                pending={readOnly}
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
                disabled={busy === scheme.id}
                pending={readOnly}
                onClick={() => patch(scheme.id, { verification_status: "needs_review" }, "Dobara check karna hai")}
                icon={AlertTriangle}
                tone="warn"
              >
                Needs review
              </Action>
              <Action
                disabled={busy === scheme.id}
                pending={readOnly}
                onClick={() => patch(scheme.id, { published: !scheme.published }, "Publish state badla")}
                icon={scheme.published ? Eye : EyeOff}
                tone="plain"
              >
                {scheme.published ? "Published" : "Draft"}
              </Action>
              <Action
                disabled={busy === scheme.id}
                pending={readOnly}
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

/**
 * The one thing standing between this screen and working.
 *
 * It carries the button that fills the table, and — because that button
 * cannot create the table itself — the exact migration filename to run first
 * if it comes back saying so.
 */
function SetupCard({
  ref,
  count,
  busy,
  onImport,
}: {
  ref: React.Ref<HTMLDivElement>;
  count: number;
  busy: boolean;
  onImport: () => void;
}) {
  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-2xl border border-amber-300/70 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-5"
    >
      <p className="flex items-center gap-2 text-[13.5px] font-extrabold text-amber-900">
        <Database className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
        Ye {count} schemes abhi code ki file se dikh rahi hain, database se nahi
      </p>
      <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-amber-900/85">
        Isliye niche ke buttons abhi kuch save nahi kar sakte — save karne ke liye rows database mein honi
        chahiye. Ek baar import kar dijiye, uske baad har edit yahin se save hoga aur public page turant badlega.
      </p>
      <button
        type="button"
        onClick={onImport}
        disabled={busy}
        className="mt-3 inline-flex h-12 items-center gap-2 rounded-xl bg-[#b45309] px-5 text-[13.5px] font-extrabold text-white shadow-sm transition hover:-translate-y-px hover:bg-[#92400e] disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Database className="h-4 w-4" aria-hidden="true" />
        )}
        {busy ? "Import ho raha hai…" : `${count} schemes database mein daaliye`}
      </button>
      <p className="mt-2.5 text-[11.5px] font-semibold leading-snug text-amber-900/70">
        Agar button kahe ki table nahi mili, to pehle Supabase SQL editor mein{" "}
        <code className="rounded bg-amber-900/10 px-1 py-0.5 font-mono text-[11px]">
          20260904140000_labour_schemes.sql
        </code>{" "}
        chalaiye.
      </p>
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
  pending,
  icon: Icon,
  tone,
  spinning,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Live, but it will explain the import step rather than save. */
  pending?: boolean;
  icon: typeof Check;
  tone: "good" | "warn" | "plain";
  spinning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={pending ? "Pehle schemes ko database mein import kijiye" : undefined}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[12.5px] font-bold transition active:scale-[0.97] disabled:opacity-40",
        tone === "good"
          ? "border-[#0f9d58]/30 bg-[#0f9d58]/8 text-[#0b7742] hover:bg-[#0f9d58]/16"
          : tone === "warn"
            ? "border-amber-500/30 bg-amber-50 text-amber-800 hover:bg-amber-100"
            : "border-[var(--dc-ink)]/12 bg-white text-[var(--dc-body)] hover:border-[var(--dc-ink)]/25",
        pending && "opacity-70",
      )}
    >
      <Icon className={cn("h-4 w-4", spinning && "animate-spin")} aria-hidden="true" />
      {children}
    </button>
  );
}
