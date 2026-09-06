"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send, Sparkles } from "lucide-react";

import { ErrorNotice, SectionCard } from "@/components/content-engine/primitives";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { EXAMPLE_COMMANDS } from "@/lib/content-engine/command-center";

/**
 * The chat box, and the buttons its answers turn into.
 *
 * An answer that is only text leaves the shopkeeper to go and find the screen
 * that does the thing, which is where a "command centre" stops being one. So
 * every reply carries actions, and pressing one runs the real endpoint —
 * "Number 2 chalao" becomes an actual pipeline run that stops, like
 * everything else, at the approval queue.
 */

type Action = { label: string; kind: string; payload: Record<string, unknown> };
type Reply = { intent: string; message: string; actions: Action[] };
type Turn = { role: "you" | "engine"; text: string; actions?: Action[] };

export function CommandCenter() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    setTurns((current) => [...current, { role: "you", text: trimmed }]);
    setText("");
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/content-engine/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const json = (await response.json()) as { reply?: Reply; error?: string };
      if (!response.ok || !json.reply) throw new Error(json.error || "Jawab nahi mila.");

      setTurns((current) => [...current, { role: "engine", text: json.reply!.message, actions: json.reply!.actions }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Jawab nahi mila.");
    } finally {
      setBusy(false);
    }
  };

  const run = async (action: Action) => {
    if (action.kind === "navigate") {
      router.push(String(action.payload.href ?? "/admin/content-engine"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (action.kind === "mine") {
        const response = await fetch("/api/admin/content-engine/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: action.payload.count ?? 8, topic: action.payload.topic }),
        });
        const json = (await response.json()) as { ideas?: unknown[]; error?: string };
        if (!response.ok) throw new Error(json.error || "Ideas nahi ban paaye.");
        success(`${json.ideas?.length ?? 0} naye ideas idea bank mein aa gaye.`);
        router.push("/admin/content-engine/ideas");
        return;
      }

      if (action.kind === "run") {
        const response = await fetch("/api/admin/content-engine/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ideaId: action.payload.ideaId }),
        });
        const json = (await response.json()) as {
          run?: { postId: string; stages: { stage: string; ok: boolean; note: string }[] };
          error?: string;
        };
        if (!response.ok || !json.run) throw new Error(json.error || "Pipeline nahi chal paya.");

        setTurns((current) => [
          ...current,
          {
            role: "engine",
            text: json.run!.stages.map((stage) => `${stage.ok ? "✓" : "•"} ${stage.stage}: ${stage.note}`).join("\n"),
            actions: [
              {
                label: "Open in Approvals",
                kind: "navigate",
                payload: { href: `/admin/content-engine/approval?post=${json.run!.postId}` },
              },
            ],
          },
        ]);
        return;
      }

      if (action.kind === "learn") {
        const response = await fetch("/api/admin/content-engine/analytics", { method: "PUT" });
        const json = (await response.json()) as { result?: { summary: string }; error?: string };
        if (!response.ok || !json.result) throw new Error(json.error || "Analysis nahi ho paya.");
        setTurns((current) => [...current, { role: "engine", text: json.result!.summary }]);
        return;
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Ye kaam nahi ho paya.";
      setError(message);
      toastError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="AI Command Center"
      subtitle="Hindi, Hinglish ya English — jo aasan lage."
      className="border-[var(--dc-blue-600)]/25 bg-gradient-to-b from-[var(--dc-sky-soft)] to-white"
    >
      {turns.length > 0 && (
        <div className="mb-3 max-h-[320px] space-y-2 overflow-y-auto rounded-[0.9rem] border border-slate-200 bg-white p-3">
          {turns.map((turn, index) => (
            <div key={index} className={turn.role === "you" ? "text-right" : ""}>
              <p
                className={
                  turn.role === "you"
                    ? "inline-block rounded-[0.8rem] bg-[var(--dc-blue-600)] px-3 py-1.5 text-[12.5px] font-semibold text-white"
                    : "whitespace-pre-line text-[13px] font-medium leading-relaxed text-[var(--dc-body)]"
                }
              >
                {turn.text}
              </p>
              {turn.actions?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {turn.actions.map((action, actionIndex) => (
                    <Button
                      key={actionIndex}
                      size="default"
                      variant="outline"
                      className="h-8 px-3 text-[12px]"
                      onClick={() => run(action)}
                      isLoading={busy}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {error && <div className="mb-3"><ErrorNotice message={error} /></div>}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(text);
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Is hafte kya post karna chahiye?"
          className="h-11 flex-1 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-medium text-[var(--dc-ink)] outline-none focus:border-[var(--dc-blue-600)]"
        />
        <Button type="submit" isLoading={busy} className="h-11 px-4">
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {turns.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLE_COMMANDS.slice(0, 5).map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => void ask(example)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[var(--dc-body)] hover:border-[var(--dc-blue-600)]/40"
            >
              <Sparkles className="h-3 w-3 text-[var(--dc-orange-500)]" />
              {example}
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
