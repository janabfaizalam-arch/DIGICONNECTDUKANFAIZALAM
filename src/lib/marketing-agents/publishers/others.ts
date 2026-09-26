import "server-only";

import { env } from "@/lib/marketing-agents/config";
import { oauth1Header } from "@/lib/marketing-agents/oauth1";
import { clampText } from "@/lib/marketing-agents/links";
import { PublishError, requestJson, type PublishInput, type PublishResult } from "@/lib/marketing-agents/publishers/types";

/** X (Twitter): text and link. Image upload needs a paid API tier, so it is left out. */
export async function publishX(input: PublishInput): Promise<PublishResult> {
  const url = "https://api.x.com/2/tweets";
  const authorization = oauth1Header("POST", url, {
    consumerKey: env("X_API_KEY"),
    consumerSecret: env("X_API_SECRET"),
    token: env("X_ACCESS_TOKEN"),
    tokenSecret: env("X_ACCESS_TOKEN_SECRET"),
  });

  const result = await requestJson<{ data?: { id?: string } }>(url, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ text: input.text }),
  });
  const id = result.data?.id;
  if (!id) throw new PublishError("X returned no post id.");
  return { platform: "x", status: "posted", postId: id, postUrl: `https://x.com/i/web/status/${id}` };
}

/**
 * LinkedIn's "little text" format reserves these characters; unescaped, the
 * post is rejected. Hashtags are then turned back into LinkedIn's own
 * hashtag markup so they stay clickable.
 */
export function linkedInCommentary(text: string) {
  return text
    .replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`)
    .replace(/\\#([\p{L}\p{N}]+)/gu, "{hashtag|\\#|$1}");
}

/**
 * LinkedIn: a post sharing the tracked link as an article card.
 * `LINKEDIN_AUTHOR_URN` is `urn:li:organization:<id>` for a company page or
 * `urn:li:person:<id>` for a profile.
 */
export async function publishLinkedIn(input: PublishInput): Promise<PublishResult> {
  const version = env("LINKEDIN_API_VERSION") || "202509";
  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("LINKEDIN_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": version,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: env("LINKEDIN_AUTHOR_URN"),
      commentary: linkedInCommentary(input.text),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: {
        article: {
          source: input.link,
          title: clampText(input.title, 200),
          description: clampText(input.description, 250),
        },
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);

  if (!response) throw new PublishError("Network error reaching LinkedIn.");
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new PublishError(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  const id = response.headers.get("x-restli-id") ?? undefined;
  return {
    platform: "linkedin",
    status: "posted",
    postId: id,
    postUrl: id ? `https://www.linkedin.com/feed/update/${id}` : undefined,
  };
}

/** Telegram channel: the poster with the caption, or a text message without one. */
export async function publishTelegram(input: PublishInput): Promise<PublishResult> {
  const base = `https://api.telegram.org/bot${env("TELEGRAM_BOT_TOKEN")}`;
  const chatId = env("TELEGRAM_CHAT_ID");

  const result = input.imageUrl
    ? await requestJson<{ ok?: boolean; result?: { message_id?: number } }>(`${base}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, photo: input.imageUrl, caption: clampText(input.text, 1024) }),
      })
    : await requestJson<{ ok?: boolean; result?: { message_id?: number } }>(`${base}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: clampText(input.text, 4096) }),
      });

  if (!result.ok) throw new PublishError("Telegram did not accept the message.");
  const messageId = result.result?.message_id;
  const publicChannel = chatId.startsWith("@") ? chatId.slice(1) : null;
  return {
    platform: "telegram",
    status: "posted",
    postId: messageId ? String(messageId) : undefined,
    postUrl: publicChannel && messageId ? `https://t.me/${publicChannel}/${messageId}` : undefined,
  };
}

/** Pinterest: a pin linking to the website. Pins keep sending visitors for months. */
export async function publishPinterest(input: PublishInput): Promise<PublishResult> {
  const image = input.jpegImageUrl || input.imageUrl;
  if (!image) return { platform: "pinterest", status: "skipped", error: "Pinterest needs an image." };

  const pin = await requestJson<{ id?: string }>("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("PINTEREST_ACCESS_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      board_id: env("PINTEREST_BOARD_ID"),
      title: clampText(input.title, 100),
      description: clampText(input.description, 500),
      link: input.link,
      media_source: { source_type: "image_url", url: image },
    }),
  });
  if (!pin.id) throw new PublishError("Pinterest returned no pin id.");
  return { platform: "pinterest", status: "posted", postId: pin.id, postUrl: `https://www.pinterest.com/pin/${pin.id}/` };
}
