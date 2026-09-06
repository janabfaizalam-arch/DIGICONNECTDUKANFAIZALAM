/**
 * The one door out of this system, and what it refuses.
 *
 * Everything else here generates: ideas, hooks, drafts, designs, captions.
 * This file is the only thing standing between all of that and a live
 * Instagram account, and it is written to be read by somebody checking
 * whether a mistake is possible rather than by somebody adding a feature.
 *
 * The rule that matters: a post that makes a claim about a government scheme
 * — an amount, an eligibility rule, a document list, a fee, a deadline —
 * never publishes without a named human having approved it. Not when the
 * model was confident. Not when the fact check came back VERIFIED. Not when
 * automatic publishing is switched on, because that switch is about the
 * shop's own offers and says nothing about sarkari figures. A wrong scheme
 * amount on a public page sends somebody to an office with the wrong papers,
 * and the cost of that lands on the customer, not on us.
 *
 * Pure by design. No database, no network, no clock beyond one passed in.
 * Every caller — the scheduler, the publish route, the cron job — asks the
 * same function, so there is exactly one place to read and exactly one place
 * a bug could hide.
 */

import type {
  ApprovalStatus,
  ContentPlatform,
  ContentStatus,
  EngineSettings,
  FactCheckStatus,
} from "@/lib/content-engine/types";

/** The minimum a caller must know about a post to ask whether it may go out. */
export type PublishCandidate = {
  id: string;
  status: ContentStatus;
  approvalStatus: ApprovalStatus;
  factCheckStatus: FactCheckStatus;
  government: boolean;
  platform: ContentPlatform;
  scheduledAt: string | null;
};

export type PublishDecision =
  | { allowed: true }
  | { allowed: false; blockers: PublishBlocker[] };

export type PublishBlocker = {
  code:
    | "not_approved"
    | "government_needs_human"
    | "fact_check_incomplete"
    | "wrong_stage"
    | "not_due"
    | "auto_publish_off";
  /** Shown to an administrator, so it says what to do rather than what failed. */
  message: string;
};

/**
 * Stages from which publishing is even a question.
 *
 * A post is either APPROVED and waiting, or SCHEDULED and due. Anything
 * earlier has not been through the gates; anything later has already gone.
 */
const PUBLISHABLE_STAGES: ContentStatus[] = ["APPROVED", "SCHEDULED"];

/**
 * Fact-check outcomes a government post may carry to the door.
 *
 * NEEDS_REVIEW is not on this list even though a human approval also exists,
 * because approving a post is not the same act as verifying a claim, and the
 * approval screen shows the claim beside its source precisely so those two
 * decisions stay distinct.
 */
const GOVERNMENT_FACT_CHECK_OK: FactCheckStatus[] = ["VERIFIED"];

export type GuardContext = {
  settings: Pick<EngineSettings, "autoPublish" | "autoPublishGovernment" | "humanApprovalRequired">;
  /** Now, passed in so the decision is reproducible in a test. */
  now: Date;
  /**
   * True when a person pressed "publish now" on the approval screen.
   *
   * It relaxes the schedule check and the automatic-publishing switch, and
   * nothing else. A human pressing a button is not permission to skip
   * approval or to publish an unverified scheme amount — those refusals hold
   * whoever is asking.
   */
  manual?: boolean;
};

/**
 * May this go out?
 *
 * Returns every blocker rather than the first, because the approval screen
 * lists them and an administrator who fixes one only to be told about the
 * next has been sent round a loop.
 */
export function evaluatePublish(candidate: PublishCandidate, context: GuardContext): PublishDecision {
  const blockers: PublishBlocker[] = [];

  if (!PUBLISHABLE_STAGES.includes(candidate.status)) {
    blockers.push({
      code: "wrong_stage",
      message: `This post is at ${candidate.status}. Only an APPROVED or SCHEDULED post can publish.`,
    });
  }

  if (candidate.approvalStatus !== "APPROVED") {
    blockers.push({
      code: "not_approved",
      message: "Nobody has approved this yet. Open it in Approvals and approve it first.",
    });
  }

  /*
    The government rule, stated twice on purpose.

    The first clause is the one that must never be removable: a sarkari post
    with no human approval is refused whatever else is true. The second says
    that even an approved one needs its claims verified, because approval is a
    judgement about the message and verification is a judgement about the
    facts.
  */
  if (candidate.government) {
    if (candidate.approvalStatus !== "APPROVED") {
      blockers.push({
        code: "government_needs_human",
        message:
          "Sarkari jaankari hai. Ye bina kisi insaan ke approve kiye kabhi publish nahi hogi — " +
          "amount, eligibility ya last date galat gayi to nuksaan customer ka hota hai.",
      });
    }
    if (!GOVERNMENT_FACT_CHECK_OK.includes(candidate.factCheckStatus)) {
      blockers.push({
        code: "fact_check_incomplete",
        message: `Fact check is ${candidate.factCheckStatus}. Every claim must be VERIFIED against an official source before a government post goes out.`,
      });
    }
  } else if (candidate.factCheckStatus === "PENDING" || candidate.factCheckStatus === "REJECTED") {
    blockers.push({
      code: "fact_check_incomplete",
      message: `Fact check is ${candidate.factCheckStatus}. Finish it or mark it not required.`,
    });
  }

  if (!context.manual) {
    if (!context.settings.autoPublish) {
      blockers.push({
        code: "auto_publish_off",
        message: "Automatic publishing is off. Publish it by hand, or turn AUTO_PUBLISH on in Settings.",
      });
    }
    if (candidate.government && !context.settings.autoPublishGovernment) {
      blockers.push({
        code: "government_needs_human",
        message:
          "Automatic publishing is never applied to government content unless an administrator has explicitly enabled it. Publish this one by hand.",
      });
    }
    if (!isDue(candidate.scheduledAt, context.now)) {
      blockers.push({
        code: "not_due",
        message: candidate.scheduledAt
          ? `Scheduled for ${candidate.scheduledAt}, which has not arrived.`
          : "No scheduled time on this post.",
      });
    }
  }

  return blockers.length ? { allowed: false, blockers } : { allowed: true };
}

function isDue(scheduledAt: string | null, now: Date): boolean {
  if (!scheduledAt) return false;
  const at = Date.parse(scheduledAt);
  return Number.isFinite(at) && at <= now.getTime();
}

/**
 * The same decision, as a throw.
 *
 * Publishers call this at the top of `publish()` so that a caller which
 * forgot to check cannot get past it. A returned boolean can be ignored; an
 * exception cannot.
 */
export class PublishBlockedError extends Error {
  readonly blockers: PublishBlocker[];

  constructor(blockers: PublishBlocker[]) {
    super(`Publishing refused: ${blockers.map((blocker) => blocker.code).join(", ")}`);
    this.name = "PublishBlockedError";
    this.blockers = blockers;
  }
}

export function assertPublishable(candidate: PublishCandidate, context: GuardContext): void {
  const decision = evaluatePublish(candidate, context);
  if (!decision.allowed) throw new PublishBlockedError(decision.blockers);
}

/**
 * Does this text need a human before it goes anywhere?
 *
 * Used when an idea or a draft is created, to set the `government` flag once
 * rather than re-deciding it at publish time. It is deliberately generous:
 * a false positive costs an approval click, a false negative costs a
 * customer a wasted trip to a government office, and those are not the same
 * mistake.
 */
const GOVERNMENT_MARKERS = [
  "scheme",
  "yojana",
  "yojna",
  "sarkari",
  "government",
  "govt",
  "subsidy",
  "subsidi",
  "eligibility",
  "patrata",
  "last date",
  "deadline",
  "aakhri tarikh",
  "antim tithi",
  "labour card",
  "shram",
  "pension",
  "ration",
  "aadhaar",
  "aadhar",
  "pan card",
  "gst",
  "income tax",
  "itr",
  "pm ",
  "pradhan mantri",
  "mukhyamantri",
  "cm yuva",
  "e-shram",
  "eshram",
  "ayushman",
  "fee",
  "fees",
  "shulk",
  "notification",
  "circular",
  "gazette",
  "rule",
  "niyam",
  "documents required",
  "dastavez",
  "benefit",
  "labh",
  "installment",
  "kist",
];

export function looksGovernmental(...texts: (string | null | undefined)[]): boolean {
  const haystack = texts.filter(Boolean).join(" ").toLowerCase();
  if (!haystack.trim()) return false;
  return GOVERNMENT_MARKERS.some((marker) => haystack.includes(marker));
}
