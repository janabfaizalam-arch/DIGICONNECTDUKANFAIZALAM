import "server-only";

import { logActivity } from "@/lib/content-engine/activity";
import { checkFacts, isOfficialSource } from "@/lib/content-engine/engines/fact-check";
import { buildDesign } from "@/lib/content-engine/engines/design";
import { repurposeAll } from "@/lib/content-engine/engines/repurpose";
import { writeDraft } from "@/lib/content-engine/engines/write";
import { generateAngles } from "@/lib/content-engine/engines/angle";
import { hookStyleOf } from "@/lib/content-engine/scoring";
import { looksGovernmental } from "@/lib/content-engine/publishing-guard";
import { transition } from "@/lib/content-engine/pipeline";
import * as repo from "@/lib/content-engine/repository";
import { specFor } from "@/lib/content-engine/platforms";
import type {
  ContentAngle,
  ContentPlatform,
  ContentPost,
  ContentStatus,
} from "@/lib/content-engine/types";

/**
 * Running the stages in order, and stopping where a person is needed.
 *
 * "Number 2 chalao" turns into this: angle, write, fact check, design,
 * repurpose, and then a full stop at the approval queue. The full stop is the
 * feature. Everything upstream of it can be automated because a bad draft
 * costs a regeneration; everything downstream of it touches the public, and a
 * government post that reaches the public wrong costs a customer a wasted day.
 *
 * Each stage records its transition before doing the work, so a run that dies
 * halfway leaves a post whose status says where it stopped rather than a post
 * that silently looks finished.
 */

async function move(post: ContentPost, to: ContentStatus, actor: string, detail = ""): Promise<ContentPost> {
  const result = transition(post.status, to);
  if (!result.ok) throw new Error(result.reason);

  const updated = await repo.updatePost(post.id, { status: to });
  if (!updated) throw new Error("That post no longer exists.");

  await logActivity({
    entity: "post",
    entityId: post.id,
    action: `stage:${to}`,
    actor,
    fromStatus: post.status,
    toStatus: to,
    detail,
  });

  return updated;
}

async function fail(post: ContentPost, actor: string, message: string): Promise<never> {
  await repo.updatePost(post.id, { status: "FAILED", failureReason: message.slice(0, 500) });
  await logActivity({
    entity: "post",
    entityId: post.id,
    action: "stage:FAILED",
    actor,
    fromStatus: post.status,
    toStatus: "FAILED",
    detail: message,
  });
  throw new Error(message);
}

/* ─────────────────────────────────────────────────────────────────────────
   Angles
   ───────────────────────────────────────────────────────────────────────── */

export async function runAngles(ideaId: string, actor: string, count = 5): Promise<ContentAngle[]> {
  const [idea, brand, usedHooks] = await Promise.all([
    repo.getIdea(ideaId),
    repo.getBrand(),
    repo.listUsedHooks(),
  ]);
  if (!idea) throw new Error("That idea does not exist.");

  const angles = await generateAngles({ brand, idea, usedHooks, count });

  await logActivity({
    entity: "idea",
    entityId: ideaId,
    action: "angles:generated",
    actor,
    detail: `${angles.length} hooks proposed.`,
  });

  return angles;
}

/* ─────────────────────────────────────────────────────────────────────────
   Writing
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Create the master post from a chosen angle.
 *
 * The government flag is decided here, from the idea and the hook together,
 * and never revisited. Deciding it at publish time would mean re-deciding it
 * on text that has been rewritten several times since anybody looked.
 */
export async function runWrite(input: {
  ideaId: string;
  angle: ContentAngle;
  actor: string;
}): Promise<ContentPost> {
  const [idea, brand] = await Promise.all([repo.getIdea(input.ideaId), repo.getBrand()]);
  if (!idea) throw new Error("That idea does not exist.");

  const government = idea.government || looksGovernmental(input.angle.hook, idea.title, idea.description);

  const post = await repo.insertPost({
    ideaId: idea.id,
    masterTopic: idea.title,
    selectedAngle: input.angle.reason,
    hook: input.angle.hook,
    body: "",
    cta: "",
    contentType: input.angle.format,
    status: "ANGLE_READY",
    government,
    // A government post starts needing both gates; an ordinary one needs
    // approval only, because approval is the default in this shop.
    factCheckStatus: government ? "PENDING" : "NOT_REQUIRED",
    approvalStatus: "PENDING",
  });

  await repo.updateIdea(idea.id, { status: "IN_PROGRESS" });
  await repo.recordHook(input.angle.hook, hookStyleOf(input.angle.hook), post.id);
  await logActivity({
    entity: "post",
    entityId: post.id,
    action: "post:created",
    actor: input.actor,
    toStatus: "ANGLE_READY",
    detail: `From idea "${idea.title}". Government: ${government}.`,
  });

  try {
    const draft = await writeDraft({
      brand,
      topic: idea.title,
      hook: input.angle.hook,
      angleReason: input.angle.reason,
      format: input.angle.format,
      audience: idea.targetAudience,
      government,
      // Nothing is verified at this point, so a government draft is written
      // without figures on purpose and the fact check stage fills them in.
      verifiedFacts: [],
    });

    const saved = await repo.updatePost(post.id, {
      hook: draft.hook,
      body: draft.body,
      cta: draft.cta,
      masterTopic: draft.title || idea.title,
    });
    if (!saved) throw new Error("The draft could not be saved.");

    return move(
      saved,
      "DRAFT_READY",
      input.actor,
      draft.warnings.length ? `Brand warnings: ${draft.warnings.join(", ")}` : "",
    );
  } catch (caught) {
    return fail(post, input.actor, caught instanceof Error ? caught.message : "Writing failed.");
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Fact checking
   ───────────────────────────────────────────────────────────────────────── */

export async function runFactCheck(input: {
  postId: string;
  actor: string;
  sources: { title: string; url: string; publisher: string; excerpt: string }[];
}): Promise<{ post: ContentPost; blocking: boolean; claims: number }> {
  const post = await repo.getPost(input.postId);
  if (!post) throw new Error("That post does not exist.");

  const pending =
    post.status === "FACT_CHECK_PENDING" ? post : await move(post, "FACT_CHECK_PENDING", input.actor);

  try {
    const result = await checkFacts({
      content: [pending.hook, pending.body, pending.cta].filter(Boolean).join("\n\n"),
      topic: pending.masterTopic,
      sources: input.sources.map((source) => ({ ...source, official: isOfficialSource(source.url) })),
    });

    await repo.replaceFactChecks(pending.id, result.checks);
    const updated = await repo.updatePost(pending.id, { factCheckStatus: result.status });
    if (!updated) throw new Error("The fact check could not be saved.");

    await logActivity({
      entity: "post",
      entityId: pending.id,
      action: "fact-check:completed",
      actor: input.actor,
      detail: `${result.checks.length} claims, verdict ${result.status}${result.blocking ? " (blocking)" : ""}.`,
    });

    /*
      A blocking verdict stops here. The post stays at FACT_CHECK_PENDING so
      the fact check screen has something to work, and moving on would mean a
      design and platform versions built around a figure nobody has confirmed.
    */
    if (result.blocking) {
      return { post: updated, blocking: true, claims: result.checks.length };
    }

    return { post: await move(updated, "FACT_CHECKED", input.actor), blocking: false, claims: result.checks.length };
  } catch (caught) {
    return fail(pending, input.actor, caught instanceof Error ? caught.message : "The fact check failed.");
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Design and repurposing
   ───────────────────────────────────────────────────────────────────────── */

export async function runDesign(input: {
  postId: string;
  actor: string;
  platforms: ContentPlatform[];
}): Promise<ContentPost> {
  const [post, brand] = await Promise.all([repo.getPost(input.postId), repo.getBrand()]);
  if (!post) throw new Error("That post does not exist.");

  for (const platform of input.platforms) {
    try {
      const spec = await buildDesign({
        brand,
        platform,
        format: post.contentType,
        hook: post.hook,
        body: post.body,
        cta: post.cta,
      });

      await repo.upsertDesign({
        contentPostId: post.id,
        platform,
        templateId: "",
        designId: null,
        previewUrl: null,
        exportUrl: null,
        // The specification is ready; an external renderer is a separate step
        // and its absence is not this stage failing.
        status: "SPEC_READY",
        spec,
      });
    } catch (caught) {
      await logActivity({
        entity: "design",
        entityId: post.id,
        action: "design:failed",
        actor: input.actor,
        detail: `${platform}: ${caught instanceof Error ? caught.message : "unknown error"}`,
      });
    }
  }

  return post.status === "DESIGN_READY" ? post : move(post, "DESIGN_READY", input.actor);
}

export async function runRepurpose(input: {
  postId: string;
  actor: string;
  platforms: ContentPlatform[];
}): Promise<{ created: number; failures: { platform: ContentPlatform; message: string }[] }> {
  const [post, brand] = await Promise.all([repo.getPost(input.postId), repo.getBrand()]);
  if (!post) throw new Error("That post does not exist.");

  const { versions, failures } = await repurposeAll({
    brand,
    master: {
      topic: post.masterTopic,
      hook: post.hook,
      body: post.body,
      cta: post.cta,
      government: post.government,
    },
    platforms: input.platforms,
  });

  for (const version of versions) {
    await repo.upsertVersion({ ...version, contentPostId: post.id });
  }

  await logActivity({
    entity: "post",
    entityId: post.id,
    action: "repurpose:completed",
    actor: input.actor,
    detail: `${versions.length} platform versions written${failures.length ? `, ${failures.length} failed` : ""}.`,
  });

  return { created: versions.length, failures };
}

/* ─────────────────────────────────────────────────────────────────────────
   The whole run
   ───────────────────────────────────────────────────────────────────────── */

export type PipelineRun = {
  postId: string;
  status: ContentStatus;
  stages: { stage: string; ok: boolean; note: string }[];
  /** True when a person now has to do something before this can go further. */
  awaitingHuman: boolean;
};

/**
 * Idea to approval queue, in one call.
 *
 * Stops at APPROVAL_PENDING every time. There is no argument that carries it
 * past that point, because the only thing that carries a post past that point
 * is a person pressing approve on a screen that shows them the claims and the
 * sources.
 */
export async function runPipeline(input: {
  ideaId: string;
  actor: string;
  platforms: ContentPlatform[];
  sources?: { title: string; url: string; publisher: string; excerpt: string }[];
}): Promise<PipelineRun> {
  const stages: PipelineRun["stages"] = [];

  const angles = await runAngles(input.ideaId, input.actor);
  const chosen = angles.find((angle) => angle.recommended) ?? angles[0];
  if (!chosen) throw new Error("No usable hook could be generated for this idea.");
  stages.push({ stage: "angle", ok: true, note: `Chose: ${chosen.hook}` });

  let post = await runWrite({ ideaId: input.ideaId, angle: chosen, actor: input.actor });
  stages.push({ stage: "write", ok: true, note: `${post.body.length} characters of master content.` });

  if (post.government) {
    const checked = await runFactCheck({
      postId: post.id,
      actor: input.actor,
      sources: input.sources ?? [],
    });
    post = checked.post;
    stages.push({
      stage: "fact-check",
      ok: !checked.blocking,
      note: checked.blocking
        ? `${checked.claims} claims checked. A critical claim has no official source, so this stops here for a human.`
        : `${checked.claims} claims checked and verified.`,
    });

    if (checked.blocking) {
      return { postId: post.id, status: post.status, stages, awaitingHuman: true };
    }
  } else {
    stages.push({ stage: "fact-check", ok: true, note: "Not a government topic; no claims to verify." });
  }

  post = await runDesign({ postId: post.id, actor: input.actor, platforms: input.platforms });
  stages.push({ stage: "design", ok: true, note: `${input.platforms.length} design specifications ready.` });

  const repurposed = await runRepurpose({ postId: post.id, actor: input.actor, platforms: input.platforms });
  stages.push({
    stage: "repurpose",
    ok: repurposed.failures.length === 0,
    note: `${repurposed.created} platform versions${
      repurposed.failures.length ? `, ${repurposed.failures.map((f) => f.platform).join(", ")} failed` : ""
    }.`,
  });

  post = await move(post, "APPROVAL_PENDING", input.actor, "Waiting for a person.");
  stages.push({ stage: "approval", ok: true, note: "In the approval queue. Nothing publishes until somebody approves it." });

  return { postId: post.id, status: post.status, stages, awaitingHuman: true };
}

/** Which platforms a format naturally belongs on, when the caller does not say. */
export function defaultPlatformsFor(format: ContentPost["contentType"]): ContentPlatform[] {
  const all: ContentPlatform[] = ["INSTAGRAM", "FACEBOOK", "WHATSAPP", "YOUTUBE", "LINKEDIN", "WEBSITE", "GOOGLE_BUSINESS"];
  return all.filter((platform) => specFor(platform).formats.includes(format) || platform === "WHATSAPP");
}
