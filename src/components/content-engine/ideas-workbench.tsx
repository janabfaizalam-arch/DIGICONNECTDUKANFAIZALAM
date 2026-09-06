"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, ThumbsDown, Wand2 } from "lucide-react";

import {
  EmptyState,
  ErrorNotice,
  GovernmentBadge,
  NotInstalledNotice,
  ScoreBar,
  SectionCard,
  Spinner,
} from "@/components/content-engine/primitives";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { MAX_TOTAL_SCORE, type RankedIdea } from "@/lib/content-engine/scoring";
import { FORMAT_LABEL } from "@/lib/content-engine/types";

/**
 * The idea bank.
 *
 * Sorted by the ranked score rather than the raw one, and each card says why
 * it sits where it does — both the model's reasoning and, once there is
 * enough history, what this shop's own posts moved it by. A ranking nobody
 * can interrogate is a ranking nobody follows.
 */
export function IdeasWorkbench() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [ideas, setIdeas] = useState<RankedIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notInstalled, setNotInstalled] = useState(false);
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/content-engine/ideas");
      const json = (await response.json()) as { ideas?: RankedIdea[]; error?: string; code?: string };
      if (json.code === "not_installed") {
        setNotInstalled(true);
        return;
      }
      if (!response.ok) throw new Error(json.error || "Ideas load nahi ho paaye.");
      setIdeas(json.ideas ?? []);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ideas load nahi ho paaye.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mine = async (count: number) => {
    setBusy("mine");
    setError(null);
    try {
      const response = await fetch("/api/admin/content-engine/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count,
          topic: topic.trim() || undefined,
          // The single most valuable input the mine has. Typed in here because
          // customer questions arrive on WhatsApp and in person, not in a table.
          customerQuestions: questions
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        }),
      });
      const json = (await response.json()) as { ideas?: RankedIdea[]; dropped?: number; error?: string };
      if (!response.ok) throw new Error(json.error || "Ideas nahi ban paaye.");

      success(
        `${json.ideas?.length ?? 0} naye ideas aa gaye` +
          (json.dropped ? `, ${json.dropped} purane jaise the isliye chhod diye.` : "."),
      );
      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Ideas nahi ban paaye.";
      setError(message);
      toastError(message);
    } finally {
      setBusy(null);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>, note: string) => {
    setBusy(id);
    try {
      const response = await fetch("/api/admin/content-engine/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, patch: body }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Save nahi hua.");
      success(note);
      await load();
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Save nahi hua.");
    } finally {
      setBusy(null);
    }
  };

  const runPipeline = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch("/api/admin/content-engine/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId: id }),
      });
      const json = (await response.json()) as { run?: { postId: string }; error?: string };
      if (!response.ok || !json.run) throw new Error(json.error || "Pipeline nahi chal paya.");
      success("Content ban gaya. Ab approval queue mein hai.");
      router.push(`/admin/content-engine/approval?post=${json.run.postId}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Pipeline nahi chal paya.";
      setError(message);
      toastError(message);
    } finally {
      setBusy(null);
    }
  };

  if (notInstalled) return <NotInstalledNotice />;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Naye ideas nikaaliye"
        subtitle="Customer ke asli sawal sabse achhe ideas dete hain. Ek line mein ek sawal."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Kisi ek vishay par? (jaise: Labour Card)"
            className="h-11 rounded-full border border-slate-200 px-4 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
          />
          <div className="flex gap-2">
            <Button onClick={() => void mine(8)} isLoading={busy === "mine"} className="flex-1">
              <Wand2 className="h-4 w-4" />
              Generate ideas
            </Button>
            <Button variant="outline" onClick={() => void load()} className="h-11 w-11 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <textarea
          value={questions}
          onChange={(event) => setQuestions(event.target.value)}
          rows={3}
          placeholder={"Customers ne kya poocha? Ek line mein ek sawal.\nLabour Card renewal kaise hota hai?\nITR ki last date kya hai?"}
          className="mt-3 w-full rounded-[0.9rem] border border-slate-200 p-3 text-[13px] font-medium outline-none focus:border-[var(--dc-blue-600)]"
        />
      </SectionCard>

      {error && <ErrorNotice message={error} />}

      {loading ? (
        <Spinner label="Idea bank khul raha hai…" />
      ) : ideas.length === 0 ? (
        <EmptyState
          title="Idea bank abhi khali hai"
          detail="Upar 'Generate ideas' dabaiye. Behtar rahega ki pehle kuch asli customer sawal bhi daal dein."
        />
      ) : (
        <div className="space-y-3">
          {ideas.map((idea, index) => (
            <SectionCard key={idea.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[260px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-[var(--dc-muted)]">#{index + 1}</span>
                    <h3 className="text-[15px] font-bold leading-tight text-[var(--dc-ink)]">{idea.title}</h3>
                    {idea.government && <GovernmentBadge compact />}
                  </div>
                  <p className="mt-1 text-[13px] font-medium leading-snug text-[var(--dc-body)]">{idea.description}</p>
                  <p className="mt-1.5 text-[12px] font-medium italic leading-snug text-[var(--dc-muted)]">
                    {idea.scoreReason}
                  </p>
                  {idea.historyAdjustment !== 0 && (
                    <p className="mt-1 text-[11.5px] font-semibold text-[var(--dc-blue-700)]">
                      {idea.historyAdjustment > 0 ? "+" : ""}
                      {idea.historyAdjustment.toFixed(1)} — {idea.historyReason}
                    </p>
                  )}
                  <p className="mt-1.5 text-[11.5px] font-semibold text-[var(--dc-muted)]">
                    {idea.category} · {FORMAT_LABEL[idea.suggestedFormat]} · {idea.targetAudience || "sabhi customers"}
                  </p>
                </div>

                <div className="w-full max-w-[230px] space-y-1">
                  <p className="text-right text-[1.5rem] font-extrabold leading-none text-[var(--dc-ink)]">
                    {idea.rankedScore.toFixed(0)}
                    <span className="text-[13px] font-bold text-[var(--dc-muted)]">/{MAX_TOTAL_SCORE}</span>
                  </p>
                  <ScoreBar label="Hook" value={idea.scores.hook_score} />
                  <ScoreBar label="Demand" value={idea.scores.demand_score} />
                  <ScoreBar label="Freshness" value={idea.scores.freshness_score} />
                  <ScoreBar label="Business" value={idea.scores.business_value_score} />
                  <ScoreBar label="Shareable" value={idea.scores.shareability_score} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  className="h-9 px-4 text-[12.5px]"
                  isLoading={busy === idea.id}
                  onClick={() => void runPipeline(idea.id)}
                >
                  Create content
                </Button>
                <Button
                  variant="outline"
                  className="h-9 px-4 text-[12.5px]"
                  onClick={() => router.push(`/admin/content-engine/angles?idea=${idea.id}`)}
                >
                  Hooks dekhiye
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 px-3 text-[12.5px]"
                  isLoading={busy === idea.id}
                  onClick={() => void patch(idea.id, { status: "REJECTED" }, "Idea hata diya.")}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            </SectionCard>
          ))}

          <Button variant="outline" onClick={() => void mine(8)} isLoading={busy === "mine"} className="w-full">
            <Plus className="h-4 w-4" />
            Generate more
          </Button>
        </div>
      )}
    </div>
  );
}
