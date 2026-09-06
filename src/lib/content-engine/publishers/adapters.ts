import "server-only";

import { BasePublisher, type PlatformAnalytics, type PublishInput, type PublishOutcome } from "@/lib/content-engine/publishers/base";
import type { ContentPlatform } from "@/lib/content-engine/types";

/**
 * The six platforms, each behind the same four methods.
 *
 * None of them has a live implementation in this repository, and that is
 * stated rather than hidden. Every one needs an OAuth grant from the shop's
 * own account — a Facebook app reviewed for `instagram_content_publish`, a
 * Google Cloud project with the YouTube Data API enabled, a LinkedIn
 * developer app, a WhatsApp Business sender. None of those can be created
 * from a repository, and a `doPublish` that returned a made-up post id would
 * mean a schedule row reading PUBLISHED for something nobody ever posted.
 *
 * So each adapter names exactly which credentials it needs and reports
 * CONFIGURATION_REQUIRED until they are there. When they are, the work left
 * in each is one HTTP call through `callExternal`, and the comment in each
 * class says which one.
 *
 * The publishing gate runs regardless, in `BasePublisher.publish`. An
 * unapproved government post is refused before an adapter is even asked
 * whether it is connected — which is why the safety test passes today, with
 * nothing connected, and will still pass when everything is.
 */

class InstagramPublisher extends BasePublisher {
  readonly platform: ContentPlatform = "INSTAGRAM";

  protected requiredEnv(): string[] {
    return ["META_CLIENT_ID", "META_CLIENT_SECRET"];
  }

  /*
    Two calls to the Graph API against the connected Instagram Business
    account: POST /{ig-user-id}/media to create a container from the image or
    video URL plus the caption, then POST /{ig-user-id}/media_publish with the
    returned creation id. Video containers must be polled until their
    status_code is FINISHED before publishing.
  */
  protected async doPublish(_input: PublishInput): Promise<PublishOutcome> {
    void _input;
    return this.notConfigured();
  }
}

class FacebookPublisher extends BasePublisher {
  readonly platform: ContentPlatform = "FACEBOOK";

  protected requiredEnv(): string[] {
    return ["META_CLIENT_ID", "META_CLIENT_SECRET"];
  }

  /*
    POST /{page-id}/photos with url + caption for an image post, or
    POST /{page-id}/feed with message + link for a text post, using the page
    access token derived from the connected user's grant.
  */
  protected async doPublish(_input: PublishInput): Promise<PublishOutcome> {
    void _input;
    return this.notConfigured();
  }

  /**
   * Facebook is the one platform here that really does schedule.
   *
   * `scheduled_publish_time` on a page post holds it server-side, which means
   * the post goes out whether or not this deployment is awake.
   */
  async schedule(_input: PublishInput & { at: string }): Promise<PublishOutcome> {
    void _input;
    if (!this.isConfigured()) return this.notConfigured("schedul");
    return {
      status: "CONFIGURATION_REQUIRED",
      externalPostId: null,
      message:
        "CONFIGURATION REQUIRED — Facebook can hold a scheduled post itself, but the page has not " +
        "been connected yet.",
    };
  }
}

class YouTubePublisher extends BasePublisher {
  readonly platform: ContentPlatform = "YOUTUBE";

  protected requiredEnv(): string[] {
    return ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"];
  }

  /*
    A resumable upload to videos.insert with snippet (title, description,
    tags) and status. Shorts are ordinary uploads under 60 seconds in a 9:16
    aspect ratio, not a separate endpoint.
  */
  protected async doPublish(_input: PublishInput): Promise<PublishOutcome> {
    void _input;
    return this.notConfigured();
  }
}

class LinkedInPublisher extends BasePublisher {
  readonly platform: ContentPlatform = "LINKEDIN";

  protected requiredEnv(): string[] {
    return ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"];
  }

  /* POST /rest/posts with the organisation URN as author and the commentary text. */
  protected async doPublish(_input: PublishInput): Promise<PublishOutcome> {
    void _input;
    return this.notConfigured();
  }
}

/**
 * WhatsApp, which this codebase already talks to.
 *
 * AiSensy is wired up for transactional messages — OTPs and application
 * updates — through `src/lib/whatsapp`. Marketing broadcasts are a different
 * thing: they need an approved template per message and they go to a customer
 * list rather than to a feed. Reusing the transactional path for marketing
 * would put shop promotions down the same channel as one-time passwords,
 * which is how a business number gets its template approvals revoked.
 *
 * So this adapter is deliberately separate and stays unconnected until a
 * marketing template and an audience list are configured.
 */
class WhatsAppPublisher extends BasePublisher {
  readonly platform: ContentPlatform = "WHATSAPP";

  protected requiredEnv(): string[] {
    return ["AISENSY_API_KEY", "CONTENT_WHATSAPP_CAMPAIGN"];
  }

  protected async doPublish(_input: PublishInput): Promise<PublishOutcome> {
    void _input;
    return this.notConfigured();
  }
}

class GoogleBusinessPublisher extends BasePublisher {
  readonly platform: ContentPlatform = "GOOGLE_BUSINESS";

  protected requiredEnv(): string[] {
    return ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
  }

  /* POST to the Business Profile API's localPosts for the location. */
  protected async doPublish(_input: PublishInput): Promise<PublishOutcome> {
    void _input;
    return this.notConfigured();
  }

  /**
   * Google Business has no post-level insights API worth the name.
   *
   * Saying so is more useful than returning zeros, which read as "nobody saw
   * it" rather than "we cannot know".
   */
  async getAnalytics(_externalPostId: string): Promise<PlatformAnalytics> {
    void _externalPostId;
    return {
      supported: false,
      metrics: {},
      message:
        "Google Business does not report per-post metrics through its API. Read them in the Business " +
        "Profile app and enter them on the Analytics screen.",
    };
  }
}

/**
 * The website, which is the one thing here we control.
 *
 * A website version is published by writing an article through the existing
 * CMS rather than by calling anybody's API. Until that wiring exists it is
 * honest about being unbuilt rather than silently succeeding.
 */
class WebsitePublisher extends BasePublisher {
  readonly platform: ContentPlatform = "WEBSITE";

  protected requiredEnv(): string[] {
    return ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  }

  protected async doPublish(_input: PublishInput): Promise<PublishOutcome> {
    void _input;
    return {
      status: "CONFIGURATION_REQUIRED",
      externalPostId: null,
      message:
        "CONFIGURATION REQUIRED — website publishing writes into the existing Blog & Guides CMS, " +
        "which this engine is not wired to yet. Copy the article version into /admin/articles for now.",
    };
  }
}

const PUBLISHERS: Record<ContentPlatform, BasePublisher> = {
  INSTAGRAM: new InstagramPublisher(),
  FACEBOOK: new FacebookPublisher(),
  YOUTUBE: new YouTubePublisher(),
  LINKEDIN: new LinkedInPublisher(),
  WHATSAPP: new WhatsAppPublisher(),
  GOOGLE_BUSINESS: new GoogleBusinessPublisher(),
  WEBSITE: new WebsitePublisher(),
};

export function publisherFor(platform: ContentPlatform): BasePublisher {
  return PUBLISHERS[platform];
}

export async function platformStatuses() {
  const entries = await Promise.all(
    (Object.keys(PUBLISHERS) as ContentPlatform[]).map(async (platform) => ({
      platform,
      ...(await PUBLISHERS[platform].getStatus()),
    })),
  );
  return entries;
}
