"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";

import {
  EmptyState,
  ErrorNotice,
  SectionCard,
  Spinner,
} from "@/components/content-engine/primitives";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import type { RankedIdea } from "@/lib/content-engine/scoring";
import { FORMAT_LABEL, type ContentAngle } from "@/lib/content-engine/types";

type AngleRow = ContentAngle & { repeatWarning: string | null };

/**
 * Stage 02 — five ways into the same topic.
 *
 * The recommendation is marked, but nothing is chosen automatically. A hook
 * is the one part of a post the shopkeeper has an opinion about, and taking
 * that decision away to save a click is the wrong trade.
 */
export function AnglesWorkbench() {
  const router = useRouter();
  const params = useSearchParams();
  const { success, error: toastError } = useToast();

  const ideaId = params.get("idea");
  const [ideas, setIdeas] = useState<RankedIdea[]>([]);
  const [selected, setSelected] = useState<string | null>(ideaId);
  const [angles, setAngles] = useState<AngleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/admin/content-engine/ideas?status=NEW&status=RANKED&status=IN_PROGRESS");
        const json = (await response.json()) as { ideas?: RankedIdea[]; error?: string };
        if (!response.ok) throw new Error(json.error || "Ideas load nahi ho paaye.");
        setIdeas(json.ideas ?? []);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Ideas load nahi ho paaye.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const generate = useCallback(
    async (id: string) => {
      setBusy("generate");
      setError(null);
      try {
        const response = await fetch("/api/admin/content-engine/angles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ideaId: id, count: 5 }),
        });
        const json = (await response.json()) as { angles?: AngleRow[]; error?: string };
        if (!response.ok) throw new Error(json.error || "Hooks nahi ban paaye.");
        setAngles(json.angles ?? []);
        setSelected(id);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Hooks nahi ban paaye.";
        setError(message);
        toastError(message);
      } finally {
        setBusy(null);
      }
    },
    [toastError],
  );

  useEffect(() => {
    if (ideaId) void generate(ideaId);
  }, [ideaId, generate]);

  const write = async (angle: AngleRow) => {
    if (!selected) return;
    setBusy(angle.hook);
    try {
      const response = await fetch("/api/admin/content-engine/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId: selected, angle }),
      });
      const json = (await response.json()) as { post?: { id: string }; error?: string };
      if (!response.ok || !json.post) throw new Error(json.error || "Content nahi likha ja saka.");
      success("Master content ban gaya.");
      router.push(`/admin/content-engine/drafts?post=${json.post.id}`);
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Content nahi likha ja saka.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Spinner label="Ideas khul rahe hain…" />;

  return (
    <div className="space-y-4">
      <SectionCard title="Kis idea ke hooks chahiye?">
        {ideas.length ? (
          <div className="flex flex-wrap gap-2">
            {ideas.slice(0, 12).map((idea) => (
              <button
                key={idea.id}
                type="button"
                onClick={() => void generate(idea.id)}
                className={
                  "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors " +
                  (selected === idea.id
                    ? "border-[var(--dc-blue-600)] bg-[var(--dc-blue-600)] text-white"
                    : "border-slate-200 bg-white text-[var(--dc-body)] hover:border-[var(--dc-blue-600)]/40")
                }
              >
                {idea.title.slice(0, 46)}
                {idea.government ? " ·  sarkari" : ""}
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Koi idea nahi hai"
            detail="Pehle Ideas screen par jaakar kuch ideas generate kijiye."
            action={<Button onClick={() => router.push("/admin/content-engine/ideas")}>Ideas kholiye</Button>}
          />
        )}
      </SectionCard>

      {error && <ErrorNotice message={error} />}
      {busy === "generate" && <Spinner label="Hooks likhe ja rahe hain…" />}

      {angles.map((angle) => (
        <SectionCard
          key={angle.hook}
          className={angle.recommended ? "border-[var(--dc-blue-600)]/50 bg-[var(--dc-sky-soft)]/40" : undefined}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-[260px] flex-1">
              {angle.recommended && (
                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[var(--dc-blue-600)] px-2 py-0.5 text-[11px] font-bold text-white">
                  <Sparkles className="h-3 w-3" />
                  Recommended
                </span>
              )}
              <p className="text-[15px] font-bold leading-snug text-[var(--dc-ink)]">{angle.hook}</p>
              <p className="mt-1 text-[12.5px] font-medium leading-snug text-[var(--dc-body)]">{angle.reason}</p>
              {angle.repeatWarning && (
                <p className="mt-1.5 flex items-start gap-1 text-[11.5px] font-semibold text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  {angle.repeatWarning}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[11.5px] font-semibold text-[var(--dc-muted)]">
                {FORMAT_LABEL[angle.format]} · appeal {angle.appeal}/10 · freshness {angle.freshness}/10
              </p>
              <Button className="mt-2 h-9 px-4 text-[12.5px]" isLoading={busy === angle.hook} onClick={() => void write(angle)}>
                Is hook par likhiye
              </Button>
            </div>
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
