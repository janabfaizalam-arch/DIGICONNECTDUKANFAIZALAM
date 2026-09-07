"use client";

import { useState } from "react";
import { Download, Palette } from "lucide-react";

import { PostPicker } from "@/components/content-engine/post-list";
import { EmptyState, ErrorNotice, SectionCard, StageBadge } from "@/components/content-engine/primitives";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { ALL_PLATFORMS } from "@/lib/content-engine/platforms";
import { PLATFORM_LABEL, type ContentDesign, type ContentPlatform, type ContentPost } from "@/lib/content-engine/types";

type DesignRow = ContentDesign & { brief: string };

/**
 * Stage 05 — the design brief for each platform.
 *
 * The brief is the deliverable, not a consolation prize for Canva being
 * unconnected. Canvas size, safe margins, colours, fonts and the filled
 * template variables are everything somebody needs to build the design by
 * hand in ten minutes, and the copy button hands it over as text.
 */
export function DesignsWorkbench() {
  const { success, error: toastError } = useToast();

  const [post, setPost] = useState<ContentPost | null>(null);
  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [canva, setCanva] = useState(false);
  const [platforms, setPlatforms] = useState<ContentPlatform[]>(["INSTAGRAM", "FACEBOOK"]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (item: ContentPost) => {
    setBusy("open");
    try {
      const response = await fetch(`/api/admin/content-engine/designs?postId=${encodeURIComponent(item.id)}`);
      const json = (await response.json()) as { post?: ContentPost; designs?: DesignRow[]; canva?: boolean; error?: string };
      if (!response.ok || !json.post) throw new Error(json.error || "Post nahi khul paya.");
      setPost(json.post);
      setDesigns(json.designs ?? []);
      setCanva(Boolean(json.canva));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Post nahi khul paya.");
    } finally {
      setBusy(null);
    }
  };

  const generate = async () => {
    if (!post) return;
    setBusy("generate");
    setError(null);
    try {
      const response = await fetch("/api/admin/content-engine/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, platforms, render: canva }),
      });
      const json = (await response.json()) as { designs?: DesignRow[]; error?: string };
      if (!response.ok) throw new Error(json.error || "Design spec nahi ban paya.");
      setDesigns(json.designs ?? []);
      success("Design brief taiyaar hai.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Design spec nahi ban paya.";
      setError(message);
      toastError(message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <PostPicker
        title="Design ke liye taiyaar"
        statuses={["FACT_CHECKED", "DRAFT_READY", "DESIGN_READY", "APPROVAL_PENDING"]}
        selectedId={post?.id ?? null}
        onSelect={(item) => void open(item)}
        emptyTitle="Koi post taiyaar nahi hai"
        emptyDetail="Content likhne ke baad post yahan aa jaayegi."
      />

      <div className="space-y-4">
        {error && <ErrorNotice message={error} />}

        {!canva && (
          <div className="rounded-[1rem] border border-slate-300 bg-slate-50 p-3">
            <p className="text-[12.5px] font-bold text-[var(--dc-ink)]">CONFIGURATION REQUIRED — Canva jud nahi hua</p>
            <p className="mt-0.5 text-[12px] font-medium leading-snug text-[var(--dc-muted)]">
              CANVA_CLIENT_ID aur CANVA_CLIENT_SECRET set kijiye, phir Settings mein Canva account jodiye. Tab tak
              neeche wala brief poora hai — usse haath se design ban jaayega.
            </p>
          </div>
        )}

        {!post ? (
          <EmptyState title="Baayen se ek post chuniye" detail="Uske har platform ka design brief yahan banega." />
        ) : (
          <>
            <SectionCard title={post.masterTopic} action={<StageBadge status={post.status} />}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--dc-muted)]">Platforms</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_PLATFORMS.map((platform) => {
                  const on = platforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() =>
                        setPlatforms((current) =>
                          on ? current.filter((item) => item !== platform) : [...current, platform],
                        )
                      }
                      className={
                        "rounded-full border px-3 py-1 text-[12px] font-semibold " +
                        (on
                          ? "border-[var(--dc-blue-600)] bg-[var(--dc-blue-600)] text-white"
                          : "border-slate-200 bg-white text-[var(--dc-body)]")
                      }
                    >
                      {PLATFORM_LABEL[platform]}
                    </button>
                  );
                })}
              </div>
              <Button className="mt-3 h-9 px-4 text-[12.5px]" isLoading={busy === "generate"} onClick={() => void generate()}>
                <Palette className="h-4 w-4" />
                Design brief banaiye
              </Button>
            </SectionCard>

            {designs.map((design) => (
              <SectionCard
                key={design.id}
                title={PLATFORM_LABEL[design.platform]}
                subtitle={`${design.spec.canvas?.label ?? ""} · ${design.spec.canvas?.width ?? 0} × ${design.spec.canvas?.height ?? 0}`}
                action={<StageBadge status={design.status} />}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[1.05rem] font-extrabold leading-tight text-[var(--dc-ink)]">
                      {design.spec.headline}
                    </p>
                    {design.spec.subheadline && (
                      <p className="mt-1 text-[13px] font-semibold text-[var(--dc-body)]">{design.spec.subheadline}</p>
                    )}
                    <ul className="mt-2 space-y-1">
                      {(design.spec.body ?? []).map((line, index) => (
                        <li key={index} className="text-[12.5px] font-medium text-[var(--dc-body)]">
                          • {line}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 inline-block rounded-full bg-[var(--dc-orange-500)] px-3 py-1 text-[12px] font-bold text-white">
                      {design.spec.cta}
                    </p>
                  </div>

                  <div className="space-y-1 text-[12px] font-medium text-[var(--dc-muted)]">
                    <p>
                      <span className="font-bold text-[var(--dc-ink)]">Visual:</span> {design.spec.visualSuggestion}
                    </p>
                    <p>
                      <span className="font-bold text-[var(--dc-ink)]">Logo:</span> {design.spec.logoPlacement}
                    </p>
                    <p>
                      <span className="font-bold text-[var(--dc-ink)]">Fonts:</span> {design.spec.font?.heading} /{" "}
                      {design.spec.font?.body}
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      {Object.values(design.spec.colors ?? {}).map((color) => (
                        <span
                          key={color}
                          title={color}
                          className="h-5 w-5 rounded-full border border-slate-300"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {design.status !== "READY" && design.previewUrl === null && (
                  <p className="mt-2 text-[11.5px] font-semibold text-[var(--dc-muted)]">
                    Spec taiyaar hai. Rendered design tabhi banega jab Canva jud jaayega.
                  </p>
                )}

                <Button
                  variant="outline"
                  className="mt-3 h-9 px-3 text-[12px]"
                  onClick={() => {
                    void navigator.clipboard?.writeText(design.brief);
                    success("Brief copy ho gaya. Designer ko bhej dijiye.");
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Brief copy kijiye
                </Button>
              </SectionCard>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
