import "server-only";

import { logActivity } from "@/lib/content-engine/activity";
import { PublishBlockedError, evaluatePublish, type GuardContext } from "@/lib/content-engine/publishing-guard";
import { publisherFor } from "@/lib/content-engine/publishers/adapters";
import * as repo from "@/lib/content-engine/repository";
import { dueState } from "@/lib/content-engine/scheduler";
import type { ContentScheduleRow } from "@/lib/content-engine/types";

/**
 * Taking a due schedule row and actually publishing it.
 *
 * One function, used by the cron job and by the "publish now" button, so
 * there is one path to the outside world rather than two that can drift.
 *
 * Order matters here and is worth stating: claim the row first, then check
 * the gate, then call the platform. Claiming first means two overlapping cron
 * runs cannot both take the same row. Checking the gate after claiming means
 * a refusal is recorded on the row rather than leaving it PENDING to be
 * retried forever.
 */

export type PublishAttempt = {
  scheduleId: string;
  postId: string;
  platform: string;
  status: ContentScheduleRow["publishingStatus"];
  message: string;
};

export async function publishScheduledRow(input: {
  row: ContentScheduleRow;
  actor: string;
  now: Date;
  manual?: boolean;
}): Promise<PublishAttempt> {
  const { row } = input;

  const post = await repo.getPost(row.contentPostId);
  if (!post) {
    await repo.finishScheduleRow(row.id, {
      publishingStatus: "FAILED",
      errorMessage: "The post this was scheduled for no longer exists.",
    });
    return {
      scheduleId: row.id,
      postId: row.contentPostId,
      platform: row.platform,
      status: "FAILED",
      message: "The post this was scheduled for no longer exists.",
    };
  }

  const settings = await repo.getSettings();
  const guard: GuardContext = { settings, now: input.now, manual: input.manual };

  const candidate = {
    id: post.id,
    status: post.status,
    approvalStatus: post.approvalStatus,
    factCheckStatus: post.factCheckStatus,
    government: post.government,
    platform: row.platform,
    scheduledAt: row.scheduledAt,
  };

  /*
    Checked before the row is claimed as well as inside the adapter. Not
    redundancy for its own sake: a refused post should not be marked
    PUBLISHING and then unmarked, because a crash between those two writes
    leaves a row stuck in a state the next run will not pick up.
  */
  const decision = evaluatePublish(candidate, guard);
  if (!decision.allowed) {
    const message = decision.blockers.map((blocker) => blocker.message).join(" ");
    await repo.finishScheduleRow(row.id, { publishingStatus: "SKIPPED", errorMessage: message });
    await logActivity({
      entity: "schedule",
      entityId: row.contentPostId,
      action: "publish:refused",
      actor: input.actor,
      detail: `${row.platform}: ${message}`,
    });
    return { scheduleId: row.id, postId: post.id, platform: row.platform, status: "SKIPPED", message };
  }

  const claimed = await repo.claimScheduleRow(row.id);
  if (!claimed) {
    // Another worker took it between the read and here. Not an error.
    return {
      scheduleId: row.id,
      postId: post.id,
      platform: row.platform,
      status: "PUBLISHING",
      message: "Another run has already taken this one.",
    };
  }

  const versions = await repo.listVersions(post.id);
  const version = versions.find((candidateVersion) => candidateVersion.platform === row.platform);
  if (!version) {
    const message = `No ${row.platform} version has been written for this post.`;
    await repo.finishScheduleRow(row.id, { publishingStatus: "FAILED", errorMessage: message });
    return { scheduleId: row.id, postId: post.id, platform: row.platform, status: "FAILED", message };
  }

  try {
    const outcome = await publisherFor(row.platform).publish({
      candidate,
      version,
      mediaUrls: [],
      guard,
    });

    await repo.finishScheduleRow(row.id, {
      publishingStatus: outcome.status === "PUBLISHED" ? "PUBLISHED" : outcome.status,
      externalPostId: outcome.externalPostId,
      errorMessage: outcome.status === "PUBLISHED" ? null : outcome.message,
    });

    if (outcome.status === "PUBLISHED") {
      await repo.upsertVersion({ ...version, status: "PUBLISHED" });
      // The post is published once any platform has it; the rest of the rows
      // carry their own state.
      if (post.status !== "PUBLISHED") {
        await repo.updatePost(post.id, { status: "PUBLISHED", publishedAt: new Date().toISOString() });
      }
    }

    await logActivity({
      entity: "schedule",
      entityId: post.id,
      action: `publish:${outcome.status.toLowerCase()}`,
      actor: input.actor,
      detail: `${row.platform}: ${outcome.message}`,
    });

    return {
      scheduleId: row.id,
      postId: post.id,
      platform: row.platform,
      status: outcome.status === "PUBLISHED" ? "PUBLISHED" : outcome.status,
      message: outcome.message,
    };
  } catch (caught) {
    const message =
      caught instanceof PublishBlockedError
        ? caught.blockers.map((blocker) => blocker.message).join(" ")
        : caught instanceof Error
          ? caught.message
          : "Publishing failed.";

    await repo.finishScheduleRow(row.id, {
      publishingStatus: caught instanceof PublishBlockedError ? "SKIPPED" : "FAILED",
      errorMessage: message,
    });
    await logActivity({
      entity: "schedule",
      entityId: post.id,
      action: "publish:failed",
      actor: input.actor,
      detail: `${row.platform}: ${message}`,
    });

    return {
      scheduleId: row.id,
      postId: post.id,
      platform: row.platform,
      status: caught instanceof PublishBlockedError ? "SKIPPED" : "FAILED",
      message,
    };
  }
}

/**
 * Everything due right now, published.
 *
 * A row whose time passed twelve hours ago is not published late; it is
 * skipped, because "aaj last date hai" going out on Thursday for a Tuesday
 * deadline is worse than not going out at all.
 */
export async function publishDue(input: { actor: string; now: Date; limit?: number }): Promise<PublishAttempt[]> {
  const rows = await repo.listSchedule({
    to: new Date(input.now.getTime() + 60_000).toISOString(),
    status: ["PENDING", "QUEUED"],
  });

  const attempts: PublishAttempt[] = [];

  for (const row of rows.slice(0, input.limit ?? 20)) {
    const state = dueState(row.scheduledAt, input.now);

    if (state === "not_yet") continue;

    if (state === "too_late") {
      const message = "Missed its slot by more than twelve hours, so it was not published. Reschedule it.";
      await repo.finishScheduleRow(row.id, { publishingStatus: "SKIPPED", errorMessage: message });
      attempts.push({
        scheduleId: row.id,
        postId: row.contentPostId,
        platform: row.platform,
        status: "SKIPPED",
        message,
      });
      continue;
    }

    attempts.push(await publishScheduledRow({ row, actor: input.actor, now: input.now }));
  }

  return attempts;
}
