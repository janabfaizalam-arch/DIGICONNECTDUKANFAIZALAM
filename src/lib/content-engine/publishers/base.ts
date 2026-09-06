import "server-only";

import { ExternalError, type ExternalFailure } from "@/lib/content-engine/errors";
import { assertPublishable, type GuardContext, type PublishCandidate } from "@/lib/content-engine/publishing-guard";
import type { ContentPlatform, ContentVersion } from "@/lib/content-engine/types";

/**
 * What every platform adapter looks like from the outside.
 *
 * Four methods, the same four everywhere, so the scheduler does not know or
 * care which platform it is talking to. Adding Threads later means writing one
 * file, not touching the scheduler.
 *
 * The important part is `publish`: every implementation calls
 * `assertPublishable` first. Not "should call" — the base class below does it
 * before dispatching, so an adapter cannot forget. An approval gate that each
 * of six adapters has to remember to check is a gate that will be open in one
 * of them.
 */

export type PublishInput = {
  candidate: PublishCandidate;
  version: ContentVersion;
  /** Media the platform needs. Absent for text-only posts. */
  mediaUrls: string[];
  guard: GuardContext;
};

export type PublishOutcome = {
  status: "PUBLISHED" | "CONFIGURATION_REQUIRED" | "FAILED" | "SKIPPED";
  externalPostId: string | null;
  /** Shown to the admin. Never carries a token or a raw API error. */
  message: string;
};

export type PlatformStatus = {
  connected: boolean;
  accountName: string | null;
  /** What an administrator must do next, when anything. */
  message: string;
};

export type PlatformAnalytics = {
  supported: boolean;
  metrics: Partial<{
    impressions: number;
    reach: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    clicks: number;
    watchTimeSeconds: number;
  }>;
  message: string;
};

export interface Publisher {
  readonly platform: ContentPlatform;
  publish(input: PublishInput): Promise<PublishOutcome>;
  schedule(input: PublishInput & { at: string }): Promise<PublishOutcome>;
  getStatus(): Promise<PlatformStatus>;
  getAnalytics(externalPostId: string): Promise<PlatformAnalytics>;
}

/**
 * The half of every adapter that must not be rewritten per platform.
 *
 * Subclasses implement `doPublish` and the rest; the gate, and the refusal to
 * report success for something that did not happen, live here.
 */
export abstract class BasePublisher implements Publisher {
  abstract readonly platform: ContentPlatform;

  /** The environment variables this platform needs, for the honest status message. */
  protected abstract requiredEnv(): string[];

  protected abstract doPublish(input: PublishInput): Promise<PublishOutcome>;

  /** True when every credential this adapter needs is present. */
  isConfigured(): boolean {
    return this.requiredEnv().every((name) => Boolean(process.env[name]));
  }

  protected notConfigured(action = "publish"): PublishOutcome {
    return {
      status: "CONFIGURATION_REQUIRED",
      externalPostId: null,
      message:
        `CONFIGURATION REQUIRED — ${this.platform} is not connected, so nothing was ${action}ed. ` +
        `Set ${this.requiredEnv().join(", ")} and connect the account in Settings.`,
    };
  }

  async publish(input: PublishInput): Promise<PublishOutcome> {
    // Before anything else, and before any adapter-specific code can run.
    assertPublishable(input.candidate, input.guard);

    if (!this.isConfigured()) return this.notConfigured();

    try {
      return await this.doPublish(input);
    } catch (caught) {
      const error =
        caught instanceof ExternalError ? caught : new ExternalError(this.platform, "upstream", String(caught));
      return {
        status: "FAILED",
        externalPostId: null,
        message: error.toPublic().message,
      };
    }
  }

  /**
   * Ask the platform to hold the post until a time.
   *
   * Most of these APIs cannot. Rather than pretending, the default records
   * that this engine's own scheduler will do it — which is true, and is what
   * the admin needs to know when deciding whether the shop's phone has to be
   * on at ten in the morning.
   */
  async schedule(input: PublishInput & { at: string }): Promise<PublishOutcome> {
    if (!this.isConfigured()) return this.notConfigured("schedul");
    return {
      status: "SKIPPED",
      externalPostId: null,
      message: `${this.platform} does not accept scheduled posts through its API. This engine will publish it at ${input.at}.`,
    };
  }

  async getStatus(): Promise<PlatformStatus> {
    if (!this.isConfigured()) {
      return {
        connected: false,
        accountName: null,
        message: `CONFIGURATION REQUIRED — set ${this.requiredEnv().join(", ")} to connect ${this.platform}.`,
      };
    }
    return { connected: true, accountName: null, message: "Credentials are set." };
  }

  async getAnalytics(_externalPostId: string): Promise<PlatformAnalytics> {
    void _externalPostId;
    return {
      supported: false,
      metrics: {},
      message: `${this.platform} analytics are not connected. Enter the figures by hand on the Analytics screen.`,
    };
  }

  /** A named failure, for adapters that need to raise one. */
  protected fail(failure: ExternalFailure, message: string): never {
    throw new ExternalError(this.platform, failure, message);
  }
}
