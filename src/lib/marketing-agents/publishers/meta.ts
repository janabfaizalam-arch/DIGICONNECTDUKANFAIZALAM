import "server-only";

import { env } from "@/lib/marketing-agents/config";
import { PublishError, requestJson, sleep, type PublishInput, type PublishResult } from "@/lib/marketing-agents/publishers/types";

/**
 * Facebook Page, Instagram and Threads — all Meta Graph APIs.
 *
 * Tokens go in the POST body, never the query string, so they cannot end up
 * in an access log.
 */

function graphVersion() {
  return env("META_GRAPH_VERSION") || "v23.0";
}

function form(fields: Record<string, string>) {
  return new URLSearchParams(fields);
}

export async function publishFacebook(input: PublishInput): Promise<PublishResult> {
  const pageId = env("META_PAGE_ID");
  const token = env("META_PAGE_ACCESS_TOKEN");
  const base = `https://graph.facebook.com/${graphVersion()}`;

  if (input.imageUrl) {
    const photo = await requestJson<{ id?: string; post_id?: string }>(`${base}/${pageId}/photos`, {
      method: "POST",
      body: form({ url: input.imageUrl, caption: input.text, access_token: token }),
    });
    if (!photo.id) throw new PublishError("Facebook returned no photo id.");

    // Facebook stores the poster as JPEG; Instagram only reliably accepts JPEG.
    let jpegImageUrl: string | undefined;
    try {
      const details = await requestJson<{ images?: Array<{ source?: string; width?: number }> }>(
        `${base}/${photo.id}?fields=images`,
        { method: "GET", headers: { Authorization: `Bearer ${token}` } },
      );
      jpegImageUrl = details.images?.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.source;
    } catch {
      jpegImageUrl = undefined;
    }

    const postId = photo.post_id ?? photo.id;
    return {
      platform: "facebook",
      status: "posted",
      postId,
      postUrl: `https://www.facebook.com/${postId}`,
      jpegImageUrl,
    };
  }

  const post = await requestJson<{ id?: string }>(`${base}/${pageId}/feed`, {
    method: "POST",
    body: form({ message: input.text, link: input.link, access_token: token }),
  });
  if (!post.id) throw new PublishError("Facebook returned no post id.");
  return { platform: "facebook", status: "posted", postId: post.id, postUrl: `https://www.facebook.com/${post.id}` };
}

/** Wait until a media container is ready to publish. */
async function waitForContainer(base: string, containerId: string, token: string, field: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const status = await requestJson<Record<string, string>>(`${base}/${containerId}?fields=${field}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const value = status[field];
    if (value === "FINISHED") return;
    if (value === "ERROR" || value === "EXPIRED") throw new PublishError(`Media container ${value.toLowerCase()}.`);
    await sleep(2_500);
  }
  throw new PublishError("Media container was not ready in time.");
}

export async function publishInstagram(input: PublishInput): Promise<PublishResult> {
  const image = input.jpegImageUrl || input.imageUrl;
  if (!image) return { platform: "instagram", status: "skipped", error: "Instagram needs an image." };

  const userId = env("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  const token = env("META_PAGE_ACCESS_TOKEN");
  const base = `https://graph.facebook.com/${graphVersion()}`;

  const container = await requestJson<{ id?: string }>(`${base}/${userId}/media`, {
    method: "POST",
    body: form({ image_url: image, caption: input.text, access_token: token }),
  });
  if (!container.id) throw new PublishError("Instagram returned no container id.");
  await waitForContainer(base, container.id, token, "status_code");

  const published = await requestJson<{ id?: string }>(`${base}/${userId}/media_publish`, {
    method: "POST",
    body: form({ creation_id: container.id, access_token: token }),
  });
  if (!published.id) throw new PublishError("Instagram returned no media id.");

  let postUrl: string | undefined;
  try {
    const details = await requestJson<{ permalink?: string }>(`${base}/${published.id}?fields=permalink`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    postUrl = details.permalink;
  } catch {
    postUrl = undefined;
  }
  return { platform: "instagram", status: "posted", postId: published.id, postUrl };
}

export async function publishThreads(input: PublishInput): Promise<PublishResult> {
  const userId = env("THREADS_USER_ID");
  const token = env("THREADS_ACCESS_TOKEN");
  const base = "https://graph.threads.net/v1.0";

  const fields: Record<string, string> = input.imageUrl
    ? { media_type: "IMAGE", image_url: input.jpegImageUrl || input.imageUrl, text: input.text, access_token: token }
    : { media_type: "TEXT", text: input.text, access_token: token };

  const container = await requestJson<{ id?: string }>(`${base}/${userId}/threads`, { method: "POST", body: form(fields) });
  if (!container.id) throw new PublishError("Threads returned no container id.");
  await waitForContainer(base, container.id, token, "status");

  const published = await requestJson<{ id?: string }>(`${base}/${userId}/threads_publish`, {
    method: "POST",
    body: form({ creation_id: container.id, access_token: token }),
  });
  if (!published.id) throw new PublishError("Threads returned no post id.");
  return { platform: "threads", status: "posted", postId: published.id };
}
