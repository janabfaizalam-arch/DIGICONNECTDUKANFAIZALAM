"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Save, Wand2 } from "lucide-react";

import { PostPicker } from "@/components/content-engine/post-list";
import {
  EmptyState,
  ErrorNotice,
  GovernmentBadge,
  SectionCard,
  StageBadge,
} from "@/components/content-engine/primitives";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import type { ActivityEntry, ContentPost } from "@/lib/content-engine/types";

/**
 * Stage 03 — the master content, and edits to it.
 *
 * The one rule worth knowing before editing here: changing the text of a
 * government post that was already verified resets its fact check. The claims
 * were checked against the previous words, and a figure typed in afterwards
 * would otherwise go out wearing a badge it never earned. The screen says so
 * rather than letting it be a surprise.
 */
export function DraftsWorkbench() {
  const params = useSearchParams();
  const { success, error: toastError } = useToast();

  const [post, setPost] = useState<ContentPost | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [draft, setDraft] = useState({ hook: "", body: "", cta: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("Aur simple Hindi mein kar dijiye");

  const open = useCallback(async (id: string) => {
    setBusy("open");
    try {
      const response = await fetch(`/api/admin/content-engine/drafts?id=${encodeURIComponent(id)}`);
      const json = (await response.json()) as { post?: ContentPost; activity?: ActivityEntry[]; error?: string };
      if (!response.ok || !json.post) throw new Error(json.error || "Post nahi khul paya.");
      setPost(json.post);
      setActivity(json.activity ?? []);
      setDraft({ hook: json.post.hook, body: json.post.body, cta: json.post.cta });
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Post nahi khul paya.");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    const id = params.get("post");
    if (id) void open(id);
  }, [params, open]);

  const save = async () => {
    if (!post) return;
    setBusy("save");
    try {
      const response = await fetch("/api/admin/content-engine/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, patch: draft }),
      });
      const json = (await response.json()) as { post?: ContentPost; error?: string };
      if (!response.ok || !json.post) throw new Error(json.error || "Save nahi hua.");
      setPost(json.post);
      success(
        json.post.factCheckStatus === "PENDING" && post.factCheckStatus === "VERIFIED"
          ? "Save ho gaya. Text badla hai isliye fact check dobara karna hoga."
          : "Save ho gaya.",
      );
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Save nahi hua.");
    } finally {
      setBusy(null);
    }
  };

  const rewriteField = async (field: "hook" | "body" | "cta") => {
    if (!post) return;
    setBusy(`rewrite:${field}`);
    try {
      const response = await fetch("/api/admin/content-engine/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, rewrite: { field, instruction } }),
      });
      const json = (await response.json()) as { text?: string; warnings?: string[]; error?: string };
      if (!response.ok || !json.text) throw new Error(json.error || "Rewrite nahi ho paya.");
      setDraft((current) => ({ ...current, [field]: json.text as string }));
      success(json.warnings?.length ? `Ho gaya, lekin dhyan dijiye: ${json.warnings.join(", ")}` : "Ho gaya. Save dabaiye.");
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Rewrite nahi ho paya.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <PostPicker
        title="Drafts"
        subtitle="Likhe hue post, jinme abhi badlaav ho sakta hai."
        statuses={["ANGLE_READY", "DRAFT_READY", "FACT_CHECKED", "DESIGN_READY", "FAILED"]}
        selectedId={post?.id ?? null}
        onSelect={(item) => void open(item.id)}
        emptyTitle="Koi draft nahi hai"
        emptyDetail="Ideas screen se ek idea uthaiye, hook chuniye, content ban jaayega."
      />

      <div className="space-y-4">
        {error && <ErrorNotice message={error} />}

        {!post ? (
          <EmptyState title="Baayen se ek post chuniye" detail="Uska pura content yahan khulega." />
        ) : (
          <>
            <SectionCard
              title={post.masterTopic}
              subtitle={post.selectedAngle}
              action={
                <span className="flex flex-wrap items-center gap-2">
                  {post.government && <GovernmentBadge compact />}
                  <StageBadge status={post.status} />
                </span>
              }
            >
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--dc-muted)]">
                Hook
              </label>
              <textarea
                value={draft.hook}
                onChange={(event) => setDraft({ ...draft, hook: event.target.value })}
                rows={2}
                className="w-full rounded-[0.9rem] border border-slate-200 p-3 text-[13.5px] font-semibold outline-none focus:border-[var(--dc-blue-600)]"
              />

              <label className="mb-1 mt-3 block text-[11px] font-bold uppercase tracking-wide text-[var(--dc-muted)]">
                Content
              </label>
              <textarea
                value={draft.body}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                rows={14}
                className="w-full rounded-[0.9rem] border border-slate-200 p-3 text-[13px] font-medium leading-relaxed outline-none focus:border-[var(--dc-blue-600)]"
              />

              <label className="mb-1 mt-3 block text-[11px] font-bold uppercase tracking-wide text-[var(--dc-muted)]">
                Call to action
              </label>
              <textarea
                value={draft.cta}
                onChange={(event) => setDraft({ ...draft, cta: event.target.value })}
                rows={2}
                className="w-full rounded-[0.9rem] border border-slate-200 p-3 text-[13px] font-semibold outline-none focus:border-[var(--dc-blue-600)]"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <Button isLoading={busy === "save"} onClick={() => void save()} className="h-9 px-4 text-[12.5px]">
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>

              {post.government && post.factCheckStatus === "VERIFIED" && (
                <p className="mt-2 text-[11.5px] font-semibold text-amber-800">
                  Ye sarkari post verified hai. Text badal kar save karenge to fact check dobara karna padega — yahi
                  sahi hai, kyunki claims purane text par check hue the.
                </p>
              )}
            </SectionCard>

            <SectionCard title="AI se badlaav karwaiye" subtitle="Pura content dobara nahi banega, sirf ye hissa badlega.">
              <input
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                className="mb-2 h-10 w-full rounded-full border border-slate-200 px-4 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
                placeholder="Jaise: aur simple Hindi mein kar dijiye"
              />
              <div className="flex flex-wrap gap-2">
                {(["hook", "body", "cta"] as const).map((field) => (
                  <Button
                    key={field}
                    variant="outline"
                    className="h-9 px-3 text-[12.5px]"
                    isLoading={busy === `rewrite:${field}`}
                    onClick={() => void rewriteField(field)}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    {field === "hook" ? "Hook" : field === "cta" ? "CTA" : "Content"}
                  </Button>
                ))}
              </div>
            </SectionCard>

            {activity.length > 0 && (
              <SectionCard title="Is post ke saath ab tak kya hua">
                <ul className="space-y-1.5">
                  {activity.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-baseline gap-2 text-[12px]">
                      <span className="font-bold text-[var(--dc-ink)]">{entry.action}</span>
                      <span className="font-medium text-[var(--dc-muted)]">{entry.actor}</span>
                      <span className="font-medium text-[var(--dc-muted)]">
                        {new Date(entry.createdAt).toLocaleString("en-IN")}
                      </span>
                      {entry.detail && <span className="w-full font-medium text-[var(--dc-body)]">{entry.detail}</span>}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
