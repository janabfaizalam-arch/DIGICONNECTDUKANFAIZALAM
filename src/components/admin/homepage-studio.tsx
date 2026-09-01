"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Lock,
  Monitor,
  RotateCcw,
  Smartphone,
} from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { HOMEPAGE_SECTIONS, homepageSection, type HomepageSectionState } from "@/lib/homepage/sections";
import { cn } from "@/lib/utils";

/**
 * The homepage, edited by looking at it.
 *
 * Before this, changing the front page meant opening one of seven unrelated
 * admin screens and hoping the result was what you pictured — and the order
 * of the bands was not editable at all, because it was written out in code.
 *
 * The page itself is on the right, live, in a frame you can flip between
 * phone and desktop. The bands are on the left in the order they appear.
 * Drag one to move it, click the eye to switch it off, click the row to
 * scroll the preview to it. "Edit content" opens the screen that owns that
 * band's words and pictures — the copy is not duplicated here, because
 * content with two masters goes out of step within a week.
 */
export function HomepageStudio({ initialLayout }: { initialLayout: HomepageSectionState[] }) {
  const { success, error } = useToast();
  const [sections, setSections] = useState(initialLayout);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<"phone" | "desktop">("desktop");
  const [dragId, setDragId] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    // The hero is pinned at the top; nothing may be dropped above it.
    if (homepageSection(sections[to].id)?.locked) return;

    setSections((previous) => {
      const next = [...previous];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDirty(true);
  };

  const toggle = (id: string) => {
    setSections((previous) =>
      previous.map((section) => (section.id === id ? { ...section, enabled: !section.enabled } : section)),
    );
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/homepage/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: sections.map(({ id, enabled }) => ({ id, enabled })) }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Could not save.");

      setDirty(false);
      success("Homepage saved. Reloading the preview…");
      // Reload rather than trust the frame's cache: the point of the preview
      // is that it shows what a visitor would now get.
      if (frame.current) frame.current.src = previewSrc(device);
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSections(initialLayout);
    setDirty(false);
  };

  /** Scroll the preview to a band, and outline it for a moment. */
  const focusInPreview = (id: string) => {
    const win = frame.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage({ type: "dcd:focus-section", id }, window.location.origin);
    } catch {
      /* A cross-origin frame simply will not scroll; nothing else breaks. */
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[24rem_1fr]">
      {/* ── The bands ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="lg-card p-3.5">
          <p className="text-[12.5px] font-medium leading-snug text-[var(--dc-body)]">
            Drag a band to move it. The eye switches it off without deleting anything.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-bold text-white transition disabled:opacity-45"
              style={{ background: "var(--dc-grad-blue)" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
            {dirty ? (
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--dc-ink)]/12 px-3 text-[13px] font-bold text-[var(--dc-body)]"
              >
                <RotateCcw className="h-4 w-4" />
                Undo
              </button>
            ) : null}
          </div>
        </div>

        <ol className="space-y-1.5">
          {sections.map((section, index) => {
            const spec = homepageSection(section.id);
            if (!spec) return null;
            const locked = Boolean(spec.locked);

            return (
              <li
                key={section.id}
                draggable={!locked}
                onDragStart={() => setDragId(section.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!dragId || dragId === section.id) return;
                  move(
                    sections.findIndex((entry) => entry.id === dragId),
                    index,
                  );
                  setDragId(null);
                }}
                className={cn(
                  "lg-card flex items-start gap-2 p-2.5 transition",
                  dragId === section.id && "opacity-40",
                  !section.enabled && "opacity-55",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-5 shrink-0 items-center justify-center text-[var(--dc-body)]",
                    locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
                  )}
                  title={locked ? "The hero stays at the top" : "Drag to move"}
                >
                  {locked ? <Lock className="h-3.5 w-3.5" /> : <GripVertical className="h-4 w-4" />}
                </span>

                <button
                  type="button"
                  onClick={() => focusInPreview(section.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block text-[13px] font-extrabold leading-tight text-[var(--dc-ink)]">
                    {spec.label}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] font-medium leading-snug text-[var(--dc-body)]">
                    {spec.blurb}
                  </span>
                  {spec.editHref ? (
                    <Link
                      href={spec.editHref}
                      onClick={(event) => event.stopPropagation()}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-bold text-[var(--dc-blue-mid)] hover:underline"
                    >
                      Edit content
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span className="mt-1.5 block text-[11px] font-semibold text-[var(--dc-body)]/70">
                      Nothing to fill in — move it or switch it off
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => toggle(section.id)}
                  disabled={locked}
                  aria-label={section.enabled ? `Hide ${spec.label}` : `Show ${spec.label}`}
                  aria-pressed={section.enabled}
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                    locked
                      ? "cursor-not-allowed text-[var(--dc-body)]/40"
                      : section.enabled
                        ? "text-[var(--dc-blue-mid)] hover:bg-[var(--dc-sky-soft)]"
                        : "text-[var(--dc-body)]/60 hover:bg-[var(--dc-sky-soft)]",
                  )}
                >
                  {section.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ol>

        <p className="px-1 text-[11.5px] font-medium leading-snug text-[var(--dc-body)]">
          {HOMEPAGE_SECTIONS.length} bands. A band switched off keeps its content — turning it back on brings
          everything with it.
        </p>
      </div>

      {/* ── The page ───────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="lg-pill inline-flex items-center gap-0.5 p-1">
            {(
              [
                { id: "desktop", label: "Desktop", icon: Monitor },
                { id: "phone", label: "Phone", icon: Smartphone },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDevice(option.id)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold transition",
                    device === option.id ? "text-white" : "text-[var(--dc-body)]",
                  )}
                  style={device === option.id ? { background: "var(--dc-grad-blue)" } : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>

          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--dc-blue-mid)] hover:underline"
          >
            Open the real page
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="lg-card overflow-hidden p-2">
          <div className={cn("mx-auto transition-[max-width] duration-300", device === "phone" ? "max-w-[390px]" : "max-w-none")}>
            <iframe
              ref={frame}
              src={previewSrc(device)}
              title="Homepage preview"
              className="h-[70vh] w-full rounded-xl border-0 bg-white"
              loading="lazy"
            />
          </div>
        </div>

        {dirty ? (
          <p className="rounded-xl bg-[var(--dc-amber)]/15 px-3.5 py-2.5 text-[12.5px] font-bold text-[var(--dc-flame)]">
            The preview still shows the saved page. Save to see these changes in it.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Cache-busted so a save is visible on the next load rather than the next hour. */
function previewSrc(device: "phone" | "desktop") {
  return `/?preview=${device}&t=${Date.now()}`;
}
