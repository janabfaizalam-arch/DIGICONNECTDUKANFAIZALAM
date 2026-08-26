"use client";

import { useState } from "react";
import { AlertTriangle, Check, ExternalLink, Loader2, Save } from "lucide-react";

import { FooterSocial } from "@/components/footer-social";
import type { SocialLink, SocialPlatform } from "@/lib/social-links";

export type AdminSocialRow = {
  platform: SocialPlatform;
  label: string;
  url: string;
  handle: string;
  is_active: boolean;
  sort_order: number;
};

type RowState = AdminSocialRow & { saving: boolean; saved: boolean; error: string | null };

/**
 * Social links editor.
 *
 * The table, the loader and the API route for this already existed; what was
 * missing was any screen to use them, so every platform sat at enabled:false
 * with an empty URL and the footer showed WhatsApp alone.
 *
 * Two rules the form enforces, both from the API:
 *
 *   • a link must be https — a customer following a social link from a company
 *     that handles their identity documents should not be dropped onto plain
 *     http;
 *   • a row cannot be switched on without a URL, because an active row with an
 *     empty URL renders a dead link in the footer of every page.
 *
 * The live preview at the bottom is the point of the screen: these links are
 * how someone tells the real account from an impersonator, so whoever fills
 * them in should see exactly what the customer will see.
 */
export function SocialLinksManager({
  initialRows,
  tableMissing,
  setupHint,
}: {
  initialRows: AdminSocialRow[];
  tableMissing: boolean;
  setupHint: string | null;
}) {
  const [rows, setRows] = useState<RowState[]>(
    initialRows.map((row) => ({ ...row, saving: false, saved: false, error: null })),
  );

  const update = (platform: string, patch: Partial<RowState>) => {
    setRows((current) =>
      current.map((row) =>
        row.platform === platform ? { ...row, ...patch, saved: false, error: null } : row,
      ),
    );
  };

  const save = async (platform: string) => {
    const row = rows.find((r) => r.platform === platform);
    if (!row) return;

    const url = row.url.trim();
    if (row.is_active && !url.startsWith("https://")) {
      update(platform, { error: "Add the full https:// link before showing this profile." });
      return;
    }
    if (url && !url.startsWith("https://")) {
      update(platform, { error: "Links must start with https://" });
      return;
    }

    setRows((c) => c.map((r) => (r.platform === platform ? { ...r, saving: true, error: null } : r)));

    try {
      const response = await fetch("/api/admin/homepage/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: row.platform,
          url,
          handle: row.handle.trim(),
          is_active: row.is_active,
          sort_order: row.sort_order,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setRows((c) =>
          c.map((r) =>
            r.platform === platform ? { ...r, saving: false, error: body.error || "Could not save." } : r,
          ),
        );
        return;
      }

      setRows((c) => c.map((r) => (r.platform === platform ? { ...r, saving: false, saved: true } : r)));
    } catch {
      setRows((c) =>
        c.map((r) =>
          r.platform === platform ? { ...r, saving: false, error: "Network error. Try again." } : r,
        ),
      );
    }
  };

  // What the footer will render, from the current form state rather than from
  // what was last saved — so an unsaved edit is visible before it is committed.
  const preview: SocialLink[] = rows
    .filter((row) => row.is_active && row.url.trim().startsWith("https://"))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      platform: row.platform,
      label: row.label,
      handle: row.handle.trim(),
      url: row.url.trim(),
      enabled: true,
      accent: "",
    }));

  return (
    <div className="space-y-6">
      {tableMissing ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-amber-900">Table not created yet</p>
            <p className="mt-1 text-sm text-amber-800">{setupHint}</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.platform} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[15px] font-extrabold text-slate-900">{row.label}</span>
                {row.is_active ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    Showing in footer
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                    Hidden
                  </span>
                )}
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={row.is_active}
                  onChange={(e) => update(row.platform, { is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Show in footer
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[1.6fr_1fr_auto]">
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Profile URL
                </span>
                <input
                  type="url"
                  inputMode="url"
                  value={row.url}
                  onChange={(e) => update(row.platform, { url: e.target.value })}
                  placeholder={`https://…  (your ${row.label} profile)`}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--dc-blue-bright)] focus:ring-4 focus:ring-[var(--dc-blue-bright)]/15"
                />
              </label>

              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Handle shown
                </span>
                <input
                  type="text"
                  value={row.handle}
                  onChange={(e) => update(row.platform, { handle: e.target.value })}
                  placeholder="@rnos.in"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--dc-blue-bright)] focus:ring-4 focus:ring-[var(--dc-blue-bright)]/15"
                />
              </label>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => save(row.platform)}
                  disabled={row.saving}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--dc-blue-700)] px-4 text-sm font-bold text-white transition hover:bg-[var(--dc-blue-600)] disabled:opacity-60"
                >
                  {row.saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : row.saved ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  {row.saved ? "Saved" : "Save"}
                </button>

                {row.url.trim().startsWith("https://") ? (
                  <a
                    href={row.url.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open this profile in a new tab"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Open {row.label} profile</span>
                  </a>
                ) : null}
              </div>
            </div>

            {row.error ? <p className="mt-2 text-sm font-bold text-red-600">{row.error}</p> : null}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Footer preview</p>
        <p className="mt-1 text-sm text-slate-500">
          Exactly what visitors will see. WhatsApp is always present and is generated from the support number, so it
          is not editable here.
        </p>
        <div className="mt-4 rounded-xl bg-white p-4">
          {preview.length ? (
            <FooterSocial links={preview} />
          ) : (
            <p className="text-sm font-semibold text-slate-400">
              No profiles switched on yet — the footer will show WhatsApp only.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
