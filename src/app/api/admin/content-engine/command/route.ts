import { NextResponse } from "next/server";

import { logActivity } from "@/lib/content-engine/activity";
import { failureResponse, badRequest, readJson, requireAdmin } from "@/lib/content-engine/api";
import { generateJson } from "@/lib/content-engine/ai/generate";
import { compare, EMPTY_METRICS, addMetrics, metricsFromRow, performanceScore, type PostPerformance } from "@/lib/content-engine/analytics";
import { voicePrompt } from "@/lib/content-engine/brand-voice";
import { parseCommand } from "@/lib/content-engine/command-center";
import { rankIdeas } from "@/lib/content-engine/scoring";
import { istHourOf, planAhead } from "@/lib/content-engine/scheduler";
import * as repo from "@/lib/content-engine/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The chat box.
 *
 * The recognisable shapes are matched without a model call — "5 Labour Card
 * ideas do" is a regular expression, not a reasoning problem — and only what
 * is left over is sent to one, with the real state of the engine attached so
 * it answers from this shop's data rather than from what a content strategist
 * generally says.
 *
 * The one thing this endpoint never does is publish. A command can start a
 * pipeline run; the run stops at the approval queue like everything else.
 */

type Reply = {
  intent: string;
  message: string;
  /** Things the screen can turn into buttons. */
  actions: { label: string; kind: string; payload: Record<string, unknown> }[];
};

const SYSTEM = `You advise the owner of a small-town Indian digital services shop about what to post.
You are given this shop's real idea bank, its recent performance and its schedule. Answer using only
that. Never invent a scheme, an amount, a date or a statistic. Reply in the same language mix the
question used (Hindi, Hinglish or English). Two or three sentences. Return JSON only.`;

export async function POST(request: Request) {
  const guard = await requireAdmin(request, "generate");
  if (!guard.ok) return guard.response;

  const body = await readJson<{ text?: string }>(request);
  const text = String(body?.text ?? "").trim();
  if (!text) return badRequest("Kuchh likhiye.");

  try {
    const intent = parseCommand(text);
    const reply = await respond(intent, text);

    await logActivity({
      entity: "settings",
      entityId: null,
      action: `command:${intent.kind}`,
      actor: guard.actor,
      detail: text.slice(0, 300),
    });

    return NextResponse.json({ reply, intent });
  } catch (caught) {
    return failureResponse(caught);
  }
}

async function respond(intent: ReturnType<typeof parseCommand>, text: string): Promise<Reply> {
  switch (intent.kind) {
    case "generate_ideas":
      return {
        intent: intent.kind,
        message: `${intent.count} ideas ${intent.topic ? `"${intent.topic}" par ` : ""}mine kar raha hoon.`,
        actions: [
          {
            label: `Generate ${intent.count} ideas`,
            kind: "mine",
            payload: { count: intent.count, topic: intent.topic },
          },
        ],
      };

    case "run_idea": {
      const ideas = await repo.listIdeas({ status: ["NEW", "RANKED"], limit: 50 });
      const ranked = rankIdeas(ideas);
      const chosen = typeof intent.reference === "number" ? ranked[intent.reference - 1] : undefined;

      if (!chosen) {
        return {
          intent: intent.kind,
          message: "Us number ka koi idea list mein nahi mila. Pehle idea bank kholiye.",
          actions: [],
        };
      }

      return {
        intent: intent.kind,
        message:
          `"${chosen.title}" par pura pipeline chalata hoon: hook, content, ` +
          `${chosen.government ? "fact check, " : ""}design, platform versions. ` +
          "Approval queue mein rukega — publish tabhi hoga jab aap approve karenge.",
        actions: [{ label: "Run the pipeline", kind: "run", payload: { ideaId: chosen.id } }],
      };
    }

    case "calendar": {
      const settings = await repo.getSettings();
      const rows = await repo.listSchedule({ from: new Date().toISOString() });
      const slots = planAhead({
        from: new Date(),
        days: intent.days,
        plan: settings.weeklyPlan,
        occupiedDates: rows.map((row) => row.scheduledAt.slice(0, 10)),
      });

      return {
        intent: intent.kind,
        message: slots.length
          ? `Agle ${intent.days} din mein ${slots.length} khali slot hain: ` +
            slots.slice(0, 5).map((slot) => `${slot.date} — ${slot.theme}`).join(", ") +
            (slots.length > 5 ? "…" : "")
          : `Agle ${intent.days} din poore bhare hue hain.`,
        actions: [{ label: "Open the calendar", kind: "navigate", payload: { href: "/admin/content-engine/calendar" } }],
      };
    }

    case "analyse": {
      const posts = await performanceRows();
      const comparison = compare(posts);
      return {
        intent: intent.kind,
        message: comparison.observations.join(" "),
        actions: [{ label: "Run the full analysis", kind: "learn", payload: {} }],
      };
    }

    case "status": {
      const posts = await repo.listPosts({ limit: 300 });
      const count = (status: string) => posts.filter((post) => post.status === status).length;
      return {
        intent: intent.kind,
        message:
          `Drafts: ${count("DRAFT_READY")}. Fact check pending: ${count("FACT_CHECK_PENDING")}. ` +
          `Approval ka intezaar: ${count("APPROVAL_PENDING")}. Scheduled: ${count("SCHEDULED")}. ` +
          `Published: ${count("PUBLISHED") + count("ANALYZED")}.`,
        actions: [],
      };
    }

    case "more_hooks":
      return {
        intent: intent.kind,
        message: "Kis post ke liye? Draft kholkar 'More hooks' dabaiye.",
        actions: [{ label: "Open drafts", kind: "navigate", payload: { href: "/admin/content-engine/drafts" } }],
      };

    case "simplify":
    case "convert_format":
    case "platform_version":
      return {
        intent: intent.kind,
        message: "Ye ek post par lagta hai. Post kholiye, wahan se ye badlaav kar dijiye.",
        actions: [{ label: "Open drafts", kind: "navigate", payload: { href: "/admin/content-engine/drafts" } }],
      };

    case "plan_week":
    default:
      return planWeek(text);
  }
}

async function performanceRows(): Promise<PostPerformance[]> {
  const [posts, analytics] = await Promise.all([
    repo.listPosts({ status: ["PUBLISHED", "ANALYZED"], limit: 200 }),
    repo.listAnalytics(),
  ]);

  const byPost = new Map<string, ReturnType<typeof metricsFromRow>>();
  for (const row of analytics) {
    byPost.set(row.contentPostId, addMetrics(byPost.get(row.contentPostId) ?? EMPTY_METRICS, metricsFromRow(row)));
  }

  return posts.map((post) => {
    const metrics = byPost.get(post.id) ?? EMPTY_METRICS;
    return {
      postId: post.id,
      topic: post.masterTopic,
      category: post.masterTopic,
      hook: post.hook,
      format: post.contentType,
      platforms: [],
      publishedAt: post.publishedAt,
      publishedHour: post.publishedAt ? istHourOf(post.publishedAt) : null,
      metrics,
      score: performanceScore(metrics),
    };
  });
}

/**
 * "Is hafte kya post karna chahiye?" — the question this box exists for.
 *
 * The model is given the ranked bank, the schedule, last week's numbers and
 * the brand voice, and asked to choose from what is there. It is not asked to
 * think of topics: that is the mine engine's job and it has real inputs.
 */
async function planWeek(text: string): Promise<Reply> {
  const [ideas, settings, learning, schedule, brand] = await Promise.all([
    repo.listIdeas({ status: ["NEW", "RANKED"], limit: 40 }),
    repo.getSettings(),
    repo.latestLearning(),
    repo.listSchedule({ from: new Date().toISOString() }),
    repo.getBrand(),
  ]);

  const ranked = rankIdeas(ideas).slice(0, 15);

  if (!ranked.length) {
    return {
      intent: "plan_week",
      message: "Idea bank khali hai. Pehle ideas generate kijiye, phir main is hafte ka plan bata sakta hoon.",
      actions: [{ label: "Generate ideas", kind: "mine", payload: { count: 8 } }],
    };
  }

  const answer = await generateJson<{ message: string; picks: number[] }>({
    task: "command_planning",
    system: SYSTEM,
    prompt: [
      voicePrompt(brand),
      "",
      `THE SHOPKEEPER ASKED: ${text}`,
      "",
      "IDEA BANK, already ranked (number, score out of 50, topic):",
      ...ranked.map(
        (idea, index) =>
          `${index + 1}. [${idea.rankedScore}/50]${idea.government ? " [SARKARI]" : ""} ${idea.title} — ${idea.scoreReason}`,
      ),
      "",
      "THE WEEKLY PLAN THIS SHOP FOLLOWS:",
      ...Object.entries(settings.weeklyPlan).map(([day, entry]) => `- ${day}: ${entry.theme} at ${entry.time}`),
      "",
      `ALREADY SCHEDULED: ${schedule.length} posts in the coming days.`,
      "",
      `WHAT LAST PERIOD SHOWED: ${learning?.summary ?? "No analysis yet."}`,
      "",
      "Recommend which of the numbered ideas to post this week and why, in two or three sentences.",
      "Choose only from the numbered list.",
      'Return JSON: { "message": "your answer", "picks": [numbers you recommended] }',
    ].join("\n"),
    parse: (value) => {
      const object = (value ?? {}) as { message?: unknown; picks?: unknown };
      const message = typeof object.message === "string" ? object.message.trim() : "";
      if (!message) throw new Error("Empty answer.");
      return {
        message,
        picks: Array.isArray(object.picks) ? object.picks.map(Number).filter(Number.isFinite) : [],
      };
    },
    fresh: true,
    temperature: 0.6,
  });

  return {
    intent: "plan_week",
    message: answer.message,
    actions: answer.picks
      .map((pick) => ranked[pick - 1])
      .filter(Boolean)
      .slice(0, 3)
      .map((idea) => ({
        label: `Run: ${idea.title.slice(0, 40)}`,
        kind: "run",
        payload: { ideaId: idea.id },
      })),
  };
}
