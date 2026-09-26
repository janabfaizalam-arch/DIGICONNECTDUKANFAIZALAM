import "server-only";

import { configuredPlatforms, redact, type SocialPlatformId } from "@/lib/marketing-agents/config";
import { composePost, trackedUrl } from "@/lib/marketing-agents/links";
import type { GeneratedPosts } from "@/lib/marketing-agents/post-agent";
import { publishFacebook, publishInstagram, publishThreads } from "@/lib/marketing-agents/publishers/meta";
import { publishLinkedIn, publishPinterest, publishTelegram, publishX } from "@/lib/marketing-agents/publishers/others";
import type { PublishInput, PublishResult } from "@/lib/marketing-agents/publishers/types";

/**
 * Agent 4 — Publisher.
 *
 * Posts to every platform that has credentials, one after another, and
 * records what happened on each. One platform failing — an expired token is
 * the usual reason — never stops the others.
 */

const PUBLISHERS: Record<SocialPlatformId, (input: PublishInput) => Promise<PublishResult>> = {
  facebook: publishFacebook,
  instagram: publishInstagram,
  threads: publishThreads,
  x: publishX,
  linkedin: publishLinkedIn,
  telegram: publishTelegram,
  pinterest: publishPinterest,
};

export type PreparedPost = {
  platform: SocialPlatformId;
  text: string;
  link: string;
};

/** The exact text each platform will get, so draft mode can show it. */
export function preparePosts(input: {
  posts: GeneratedPosts;
  siteUrl: string;
  servicePath: string;
  campaign: string;
  platforms: SocialPlatformId[];
}): PreparedPost[] {
  const bodies: Record<SocialPlatformId, string> = {
    facebook: input.posts.facebook,
    instagram: input.posts.instagram,
    threads: input.posts.threads,
    x: input.posts.x,
    linkedin: input.posts.linkedin,
    telegram: input.posts.telegram,
    pinterest: input.posts.pinterestDescription,
  };

  return input.platforms.map((platform) => {
    const link = trackedUrl({ siteUrl: input.siteUrl, path: input.servicePath, platform, campaign: input.campaign });
    // Instagram captions cannot hold a clickable link; the post says "link in bio".
    const textLink = platform === "instagram" || platform === "linkedin" || platform === "pinterest" ? null : link;
    return {
      platform,
      link,
      text: composePost({ platform, body: bodies[platform], link: textLink, hashtags: input.posts.hashtags }),
    };
  });
}

export async function runPublishAgent(input: {
  prepared: PreparedPost[];
  posts: GeneratedPosts;
  imageUrl: string | null;
}): Promise<PublishResult[]> {
  const results: PublishResult[] = [];
  let jpegImageUrl: string | null = null;

  for (const post of input.prepared) {
    try {
      const result = await PUBLISHERS[post.platform]({
        text: post.text,
        link: post.link,
        title: post.platform === "pinterest" ? input.posts.pinterestTitle : input.posts.article.title,
        description: post.platform === "pinterest" ? input.posts.pinterestDescription : input.posts.article.excerpt,
        imageUrl: input.imageUrl,
        jpegImageUrl,
      });
      if (result.jpegImageUrl) jpegImageUrl = result.jpegImageUrl;
      results.push({ ...result, jpegImageUrl: undefined });
    } catch (caught) {
      results.push({
        platform: post.platform,
        status: "failed",
        error: redact(caught instanceof Error ? caught.message : String(caught)).slice(0, 500),
      });
    }
  }

  return results;
}

export { configuredPlatforms };
