#!/usr/bin/env node
/**
 * DigiConnect Dukan social publisher for the OpenClaw agent.
 *
 * A port of the website's own publishers (src/lib/marketing-agents/), with no
 * dependencies so it runs on any OpenClaw host with Node 20+. It reads the
 * same environment variable names as the Vercel pipeline, so the values can
 * be copied across unchanged.
 *
 * Nothing is ever sent without `--confirm`. Without it, `post` and `reply`
 * print exactly what would go out and stop. The agent is told to add
 * `--confirm` only after the owner approves the preview; this flag is the
 * second lock on that door.
 *
 *   node social.mjs status
 *   node social.mjs preview content/drafts/<id>.json
 *   node social.mjs post    content/drafts/<id>.json [--only facebook,x] [--confirm]
 *   node social.mjs comments [--platform facebook|instagram] [--limit 10]
 *   node social.mjs reply   --platform facebook|instagram --comment-id ID --text "..." [--confirm]
 *   node social.mjs recent  [--platform facebook|instagram] [--limit 10]
 */

import { createHmac, randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------
// Configuration

export const PLATFORM_ORDER = ["facebook", "instagram", "threads", "x", "linkedin", "telegram", "pinterest"];

export const PLATFORM_ENV = {
  facebook: ["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN"],
  instagram: ["INSTAGRAM_BUSINESS_ACCOUNT_ID", "META_PAGE_ACCESS_TOKEN"],
  threads: ["THREADS_USER_ID", "THREADS_ACCESS_TOKEN"],
  x: ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"],
  linkedin: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN"],
  telegram: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
  pinterest: ["PINTEREST_ACCESS_TOKEN", "PINTEREST_BOARD_ID"],
};

const SECRET_ENV = [
  "META_PAGE_ACCESS_TOKEN",
  "THREADS_ACCESS_TOKEN",
  "X_API_KEY",
  "X_API_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_TOKEN_SECRET",
  "LINKEDIN_ACCESS_TOKEN",
  "TELEGRAM_BOT_TOKEN",
  "PINTEREST_ACCESS_TOKEN",
];

export const PLATFORM_LIMITS = {
  facebook: { text: 2000, hashtags: 5 },
  instagram: { text: 2200, hashtags: 15 },
  threads: { text: 500, hashtags: 3 },
  // X counts every link as 23 characters, whatever its length.
  x: { text: 280, hashtags: 2 },
  linkedin: { text: 3000, hashtags: 5 },
  telegram: { text: 1024, hashtags: 4 },
  pinterest: { text: 500, hashtags: 5 },
};

const X_LINK_WEIGHT = 23;

/** Platforms that cannot show a clickable link in the text itself. */
const NO_TEXT_LINK = new Set(["instagram", "linkedin", "pinterest"]);

/** Platforms that cannot post without an image. */
const NEEDS_IMAGE = new Set(["instagram", "pinterest"]);

export function env(name, source = process.env) {
  return (source[name] ?? "").trim();
}

export function isConfigured(platform, source = process.env) {
  return PLATFORM_ENV[platform].every((name) => env(name, source).length > 0);
}

export function siteUrl(source = process.env) {
  return (env("SITE_URL", source) || "https://www.rnos.in").replace(/\/$/, "");
}

/** Strip every configured secret, and the shapes secrets take, out of a message. */
export function redact(text, source = process.env) {
  let clean = String(text);
  for (const name of SECRET_ENV) {
    const value = env(name, source);
    if (value.length >= 6) clean = clean.split(value).join("[redacted]");
  }
  return clean
    .replace(/(access_token=)[^&\s"']+/gi, "$1[redacted]")
    .replace(/\/bot\d+:[A-Za-z0-9_-]+/g, "/bot[redacted]");
}

// ---------------------------------------------------------------------------
// Text shaping (mirrors src/lib/marketing-agents/links.ts)

export function trackedUrl({ site, path, platform, campaign }) {
  const url = new URL(path || "/", `${site}/`);
  url.searchParams.set("utm_source", platform);
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

export function clampText(text, limit) {
  const clean = String(text).trim();
  if ([...clean].length <= limit) return clean;
  const chars = [...clean].slice(0, Math.max(0, limit - 1)).join("");
  const lastSpace = chars.lastIndexOf(" ");
  const cut = lastSpace > limit * 0.6 ? chars.slice(0, lastSpace) : chars;
  return `${cut.trimEnd()}…`;
}

export function normaliseHashtags(tags, max) {
  const seen = new Set();
  const out = [];
  for (const raw of tags ?? []) {
    const tag = String(raw).replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(`#${tag}`);
    if (out.length >= max) break;
  }
  return out;
}

export function composePost({ platform, body, link, hashtags }) {
  const limits = PLATFORM_LIMITS[platform];
  const tags = normaliseHashtags(hashtags, limits.hashtags).join(" ");
  const linkLine = link ? `👉 ${link}` : "";
  const linkCost = link ? (platform === "x" ? X_LINK_WEIGHT + 3 : [...linkLine].length) : 0;
  const separators = (linkLine ? 2 : 0) + (tags ? 2 : 0);
  const budget = limits.text - linkCost - [...tags].length - separators;
  const clamped = clampText(body, Math.max(40, budget));
  return { text: [clamped, linkLine, tags].filter(Boolean).join("\n\n"), truncated: clamped !== String(body).trim() };
}

// ---------------------------------------------------------------------------
// Drafts

/**
 * Read and check a draft file. Returns the draft, or throws with every
 * problem listed so the agent can fix them in one pass.
 */
export function loadDraft(file) {
  const draftPath = resolve(file);
  let draft;
  try {
    draft = JSON.parse(readFileSync(draftPath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read draft ${file}: ${error.message}`);
  }

  const problems = [];
  if (!draft || typeof draft !== "object") problems.push("draft must be a JSON object");
  else {
    if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(draft.id ?? "")) problems.push('"id" must be a lowercase slug like "2026-10-20-diwali-gst"');
    if (draft.path && !String(draft.path).startsWith("/")) problems.push('"path" must start with "/" (a page on the website)');
    if (!draft.posts || typeof draft.posts !== "object") problems.push('"posts" must map platform names to text');
    else {
      for (const [platform, text] of Object.entries(draft.posts)) {
        if (!PLATFORM_ORDER.includes(platform)) problems.push(`unknown platform "${platform}" in posts`);
        else if (typeof text !== "string" || text.trim().length < 10) problems.push(`posts.${platform} is empty or too short`);
      }
    }
    if (draft.image != null) {
      const { url, path } = draft.image;
      if (url && !/^https:\/\//.test(url)) problems.push('"image.url" must be a public https URL');
      if (path && !existsSync(resolve(dirname(draftPath), "..", "..", path)) && !existsSync(resolve(path)))
        problems.push(`"image.path" ${path} does not exist`);
      if (!url && !path) problems.push('"image" needs either "url" or "path"');
    }
  }
  if (problems.length) throw new Error(`Draft ${file} is not ready:\n- ${problems.join("\n- ")}`);

  if (draft.image?.path) {
    const relativeToWorkspace = resolve(dirname(draftPath), "..", "..", draft.image.path);
    draft.image.path = existsSync(relativeToWorkspace) ? relativeToWorkspace : resolve(draft.image.path);
  }
  return draft;
}

/** The exact text each platform would receive, plus warnings. No network. */
export function prepare(draft, { only, source = process.env } = {}) {
  const site = siteUrl(source);
  const campaign = (draft.campaign || draft.id).slice(0, 90);
  const wanted = PLATFORM_ORDER.filter((p) => draft.posts[p] && (!only || only.includes(p)));

  return wanted.map((platform) => {
    const link = draft.path ? trackedUrl({ site, path: draft.path, platform, campaign }) : null;
    const textLink = link && !NO_TEXT_LINK.has(platform) ? link : null;
    const { text, truncated } = composePost({ platform, body: draft.posts[platform], link: textLink, hashtags: draft.hashtags });
    const warnings = [];
    if (!isConfigured(platform, source)) warnings.push(`not configured (set ${PLATFORM_ENV[platform].join(", ")})`);
    if (truncated) warnings.push(`body was cut to fit the ${PLATFORM_LIMITS[platform].text}-character limit`);
    if (NEEDS_IMAGE.has(platform) && !draft.image) warnings.push("needs an image; will be skipped");
    if (NEEDS_IMAGE.has(platform) && draft.image?.path && !draft.image.url && !draft.posts.facebook)
      warnings.push("a local image reaches this platform only through the Facebook upload; add a facebook post or an image.url");
    // What the platform counts: X weighs any link as 23 characters.
    const counted = platform === "x" ? text.replace(/https?:\/\/\S+/g, "x".repeat(X_LINK_WEIGHT)) : text;
    return { platform, link, text, chars: [...counted].length, warnings };
  });
}

// ---------------------------------------------------------------------------
// HTTP

const TIMEOUT_MS = 30_000;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function platformErrorMessage(body) {
  if (!body || typeof body !== "object") return "";
  if (body.error && typeof body.error === "object" && typeof body.error.message === "string") return body.error.message;
  for (const key of ["message", "description", "detail", "title", "error"]) {
    if (typeof body[key] === "string") return body[key];
  }
  if (Array.isArray(body.errors) && typeof body.errors[0]?.message === "string") return body.errors[0].message;
  return "";
}

/** fetch → parsed JSON, or an Error carrying the platform's message (never the URL). */
export async function requestJson(url, init = {}) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    throw new Error(error?.name === "TimeoutError" ? "Request timed out." : "Network error reaching the platform.");
  }
  const raw = await response.text();
  let body = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  if (!response.ok) throw new Error(redact(`HTTP ${response.status}: ${platformErrorMessage(body) || raw.slice(0, 300)}`));
  return { body: body ?? {}, headers: response.headers };
}

const form = (fields) => new URLSearchParams(fields);
const graph = (source = process.env) => `https://graph.facebook.com/${env("META_GRAPH_VERSION", source) || "v23.0"}`;

function imageBlob(path) {
  const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
  const type = types[extname(path).toLowerCase()];
  if (!type) throw new Error(`Unsupported image type ${extname(path)}; use jpg, png or webp.`);
  return new Blob([readFileSync(path)], { type });
}

// ---------------------------------------------------------------------------
// OAuth 1.0a for X (mirrors src/lib/marketing-agents/oauth1.ts)

export function percentEncode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function oauth1Signature({ method, url, params, consumerSecret, tokenSecret }) {
  const normalised = Object.entries(params)
    .map(([k, v]) => [percentEncode(k), percentEncode(v)])
    .sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : 1) : a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const base = [method.toUpperCase(), percentEncode(url), percentEncode(normalised)].join("&");
  const key = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return createHmac("sha1", key).update(base).digest("base64");
}

export function oauth1Header(method, url, creds, nonce = randomBytes(16).toString("hex"), timestamp = String(Math.floor(Date.now() / 1000))) {
  const oauth = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: creds.token,
    oauth_version: "1.0",
  };
  const signature = oauth1Signature({ method, url, params: oauth, consumerSecret: creds.consumerSecret, tokenSecret: creds.tokenSecret });
  return `OAuth ${Object.entries({ ...oauth, oauth_signature: signature })
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(", ")}`;
}

// ---------------------------------------------------------------------------
// Publishers. Each takes { text, link, title, description, image } where
// image is { url?, path? } and returns { postId, postUrl, jpegImageUrl? }.

async function waitForContainer(base, id, token, field) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { body } = await requestJson(`${base}/${id}?fields=${field}`, { headers: { Authorization: `Bearer ${token}` } });
    if (body[field] === "FINISHED") return;
    if (body[field] === "ERROR" || body[field] === "EXPIRED") throw new Error(`Media container ${body[field].toLowerCase()}.`);
    await sleep(2_500);
  }
  throw new Error("Media container was not ready in time.");
}

const publishers = {
  async facebook({ text, link, image }) {
    const base = graph();
    const pageId = env("META_PAGE_ID");
    const token = env("META_PAGE_ACCESS_TOKEN");

    if (image) {
      let body;
      if (image.url) {
        body = form({ url: image.url, caption: text, access_token: token });
      } else {
        body = new FormData();
        body.set("source", imageBlob(image.path), basename(image.path));
        body.set("caption", text);
        body.set("access_token", token);
      }
      const { body: photo } = await requestJson(`${base}/${pageId}/photos`, { method: "POST", body });
      if (!photo.id) throw new Error("Facebook returned no photo id.");

      // Facebook re-hosts the poster as a public JPEG; Instagram, Threads and
      // Pinterest need exactly that.
      let jpegImageUrl;
      try {
        const { body: details } = await requestJson(`${base}/${photo.id}?fields=images`, { headers: { Authorization: `Bearer ${token}` } });
        jpegImageUrl = details.images?.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.source;
      } catch {
        jpegImageUrl = undefined;
      }
      const postId = photo.post_id ?? photo.id;
      return { postId, postUrl: `https://www.facebook.com/${postId}`, jpegImageUrl };
    }

    const { body: post } = await requestJson(`${base}/${pageId}/feed`, {
      method: "POST",
      body: form({ message: text, ...(link ? { link } : {}), access_token: token }),
    });
    if (!post.id) throw new Error("Facebook returned no post id.");
    return { postId: post.id, postUrl: `https://www.facebook.com/${post.id}` };
  },

  async instagram({ text, publicImageUrl }) {
    if (!publicImageUrl) return { skipped: "Instagram needs a public image (image.url, or a Facebook post in the same run)." };
    const base = graph();
    const userId = env("INSTAGRAM_BUSINESS_ACCOUNT_ID");
    const token = env("META_PAGE_ACCESS_TOKEN");
    const { body: container } = await requestJson(`${base}/${userId}/media`, {
      method: "POST",
      body: form({ image_url: publicImageUrl, caption: text, access_token: token }),
    });
    if (!container.id) throw new Error("Instagram returned no container id.");
    await waitForContainer(base, container.id, token, "status_code");
    const { body: published } = await requestJson(`${base}/${userId}/media_publish`, {
      method: "POST",
      body: form({ creation_id: container.id, access_token: token }),
    });
    if (!published.id) throw new Error("Instagram returned no media id.");
    let postUrl;
    try {
      const { body } = await requestJson(`${base}/${published.id}?fields=permalink`, { headers: { Authorization: `Bearer ${token}` } });
      postUrl = body.permalink;
    } catch {
      postUrl = undefined;
    }
    return { postId: published.id, postUrl };
  },

  async threads({ text, publicImageUrl }) {
    const base = "https://graph.threads.net/v1.0";
    const userId = env("THREADS_USER_ID");
    const token = env("THREADS_ACCESS_TOKEN");
    const fields = publicImageUrl
      ? { media_type: "IMAGE", image_url: publicImageUrl, text, access_token: token }
      : { media_type: "TEXT", text, access_token: token };
    const { body: container } = await requestJson(`${base}/${userId}/threads`, { method: "POST", body: form(fields) });
    if (!container.id) throw new Error("Threads returned no container id.");
    await waitForContainer(base, container.id, token, "status");
    const { body: published } = await requestJson(`${base}/${userId}/threads_publish`, {
      method: "POST",
      body: form({ creation_id: container.id, access_token: token }),
    });
    if (!published.id) throw new Error("Threads returned no post id.");
    return { postId: published.id };
  },

  // Text and link only: X image upload needs a paid API tier.
  async x({ text }) {
    const url = "https://api.x.com/2/tweets";
    const authorization = oauth1Header("POST", url, {
      consumerKey: env("X_API_KEY"),
      consumerSecret: env("X_API_SECRET"),
      token: env("X_ACCESS_TOKEN"),
      tokenSecret: env("X_ACCESS_TOKEN_SECRET"),
    });
    const { body } = await requestJson(url, {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const id = body.data?.id;
    if (!id) throw new Error("X returned no post id.");
    return { postId: id, postUrl: `https://x.com/i/web/status/${id}` };
  },

  async linkedin({ text, link, title, description }) {
    if (!link) return { skipped: 'LinkedIn posts share a website link; add "path" to the draft.' };
    const commentary = text.replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`).replace(/\\#([\p{L}\p{N}]+)/gu, "{hashtag|\\#|$1}");
    const { headers } = await requestJson("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("LINKEDIN_ACCESS_TOKEN")}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": env("LINKEDIN_API_VERSION") || "202509",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: env("LINKEDIN_AUTHOR_URN"),
        commentary,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        content: { article: { source: link, title: clampText(title || "DigiConnect Dukan", 200), description: clampText(description || "", 250) } },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });
    const id = headers.get("x-restli-id") ?? undefined;
    return { postId: id, postUrl: id ? `https://www.linkedin.com/feed/update/${id}` : undefined };
  },

  async telegram({ text, image }) {
    const base = `https://api.telegram.org/bot${env("TELEGRAM_BOT_TOKEN")}`;
    const chatId = env("TELEGRAM_CHAT_ID");
    let result;
    if (image?.url) {
      ({ body: result } = await requestJson(`${base}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, photo: image.url, caption: clampText(text, 1024) }),
      }));
    } else if (image?.path) {
      const body = new FormData();
      body.set("chat_id", chatId);
      body.set("photo", imageBlob(image.path), basename(image.path));
      body.set("caption", clampText(text, 1024));
      ({ body: result } = await requestJson(`${base}/sendPhoto`, { method: "POST", body }));
    } else {
      ({ body: result } = await requestJson(`${base}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: clampText(text, 4096) }),
      }));
    }
    if (!result.ok) throw new Error("Telegram did not accept the message.");
    const messageId = result.result?.message_id;
    const channel = chatId.startsWith("@") ? chatId.slice(1) : null;
    return { postId: messageId ? String(messageId) : undefined, postUrl: channel && messageId ? `https://t.me/${channel}/${messageId}` : undefined };
  },

  async pinterest({ link, title, description, text, publicImageUrl }) {
    if (!publicImageUrl) return { skipped: "Pinterest needs a public image (image.url, or a Facebook post in the same run)." };
    const { body: pin } = await requestJson("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: { Authorization: `Bearer ${env("PINTEREST_ACCESS_TOKEN")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        board_id: env("PINTEREST_BOARD_ID"),
        title: clampText(title || text, 100),
        description: clampText(description || text, 500),
        ...(link ? { link } : {}),
        media_source: { source_type: "image_url", url: publicImageUrl },
      }),
    });
    if (!pin.id) throw new Error("Pinterest returned no pin id.");
    return { postId: pin.id, postUrl: `https://www.pinterest.com/pin/${pin.id}/` };
  },
};

// ---------------------------------------------------------------------------
// Post log: one JSON line per platform attempt, so a draft is never posted
// twice to the same platform even if the agent is asked again.

export function logPath(source = process.env) {
  return resolve(env("SOCIAL_LOG", source) || "content/post-log.jsonl");
}

export function alreadyPosted(draftId, file = logPath()) {
  if (!existsSync(file)) return new Set();
  const done = new Set();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row.draftId === draftId && row.status === "posted") done.add(row.platform);
    } catch {
      // A torn line from a crash is not worth failing a post over.
    }
  }
  return done;
}

function appendLog(row, file = logPath()) {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`);
}

// ---------------------------------------------------------------------------
// Commands

function printPreview(prepared, draft) {
  console.log(`Draft ${draft.id}${draft.image ? ` · image: ${draft.image.url || draft.image.path}` : " · no image"}\n`);
  for (const p of prepared) {
    console.log(`━━ ${p.platform.toUpperCase()} (${p.chars}/${PLATFORM_LIMITS[p.platform].text} chars)${p.link ? `\nlink: ${p.link}` : ""}`);
    for (const w of p.warnings) console.log(`⚠️  ${w}`);
    console.log(`\n${p.text}\n`);
  }
}

async function cmdPost(file, { only, confirm }) {
  const draft = loadDraft(file);
  const prepared = prepare(draft, { only });
  if (!prepared.length) throw new Error("No platforms selected: the draft has no posts for the platforms asked for.");

  if (!confirm) {
    printPreview(prepared, draft);
    console.log("DRY RUN — nothing was posted. Show this preview to the owner; re-run with --confirm only after they approve.");
    return 0;
  }

  const done = alreadyPosted(draft.id);
  let publicImageUrl = draft.image?.url ?? null;
  const results = [];

  for (const p of prepared) {
    if (done.has(p.platform)) {
      results.push({ platform: p.platform, status: "skipped", error: "already posted from this draft" });
      continue;
    }
    if (!isConfigured(p.platform)) {
      results.push({ platform: p.platform, status: "skipped", error: "not configured" });
      continue;
    }
    try {
      const out = await publishers[p.platform]({
        text: p.text,
        link: p.link,
        title: draft.title,
        description: draft.description,
        image: draft.image ?? null,
        publicImageUrl,
      });
      if (out.skipped) {
        results.push({ platform: p.platform, status: "skipped", error: out.skipped });
      } else {
        if (out.jpegImageUrl) publicImageUrl = out.jpegImageUrl;
        results.push({ platform: p.platform, status: "posted", postId: out.postId, postUrl: out.postUrl });
      }
    } catch (error) {
      results.push({ platform: p.platform, status: "failed", error: redact(error.message) });
    }
    const last = results.at(-1);
    appendLog({ draftId: draft.id, ...last });
  }

  for (const r of results) {
    const icon = r.status === "posted" ? "✅" : r.status === "skipped" ? "⏭️" : "❌";
    console.log(`${icon} ${r.platform}: ${r.status}${r.postUrl ? ` ${r.postUrl}` : r.postId ? ` id=${r.postId}` : ""}${r.error ? ` — ${r.error}` : ""}`);
  }
  return results.some((r) => r.status === "failed") ? 1 : 0;
}

function cmdStatus() {
  for (const platform of PLATFORM_ORDER) {
    const missing = PLATFORM_ENV[platform].filter((name) => !env(name));
    console.log(`${missing.length ? "❌" : "✅"} ${platform}${missing.length ? ` — missing ${missing.join(", ")}` : ""}`);
  }
  console.log(`\nsite: ${siteUrl()}  ·  log: ${logPath()}`);
  return 0;
}

const metaAuth = () => ({ headers: { Authorization: `Bearer ${env("META_PAGE_ACCESS_TOKEN")}` } });

/** Comments on recent posts that the page has not replied to yet. */
async function cmdComments({ platform, limit }) {
  const rows = [];
  if (platform !== "instagram" && isConfigured("facebook")) {
    const pageId = env("META_PAGE_ID");
    const fields = `id,message,permalink_url,comments.limit(25){id,message,created_time,from,comments.limit(10){from}}`;
    const { body } = await requestJson(`${graph()}/${pageId}/posts?fields=${encodeURIComponent(fields)}&limit=${limit}`, metaAuth());
    for (const post of body.data ?? []) {
      for (const c of post.comments?.data ?? []) {
        if (c.from?.id === pageId) continue;
        const replied = (c.comments?.data ?? []).some((r) => r.from?.id === pageId);
        if (!replied) rows.push({ platform: "facebook", commentId: c.id, from: c.from?.name ?? "someone", text: c.message, at: c.created_time, post: post.permalink_url });
      }
    }
  }
  if (platform !== "facebook" && isConfigured("instagram")) {
    const igId = env("INSTAGRAM_BUSINESS_ACCOUNT_ID");
    const { body: me } = await requestJson(`${graph()}/${igId}?fields=username`, metaAuth());
    const fields = `id,permalink,comments.limit(25){id,text,username,timestamp,replies{username}}`;
    const { body } = await requestJson(`${graph()}/${igId}/media?fields=${encodeURIComponent(fields)}&limit=${limit}`, metaAuth());
    for (const media of body.data ?? []) {
      for (const c of media.comments?.data ?? []) {
        if (c.username === me.username) continue;
        const replied = (c.replies?.data ?? []).some((r) => r.username === me.username);
        if (!replied) rows.push({ platform: "instagram", commentId: c.id, from: `@${c.username}`, text: c.text, at: c.timestamp, post: media.permalink });
      }
    }
  }
  if (!isConfigured("facebook") && !isConfigured("instagram")) throw new Error("Neither Facebook nor Instagram is configured.");
  console.log(JSON.stringify(rows, null, 2));
  return 0;
}

async function cmdReply({ platform, commentId, text, confirm }) {
  if (!["facebook", "instagram"].includes(platform)) throw new Error("--platform must be facebook or instagram.");
  if (!commentId || !/^[\w-]+$/.test(commentId)) throw new Error("--comment-id is required.");
  if (!text?.trim()) throw new Error("--text is required.");
  if (!isConfigured(platform)) throw new Error(`${platform} is not configured.`);
  if (!confirm) {
    console.log(`DRY RUN — would reply on ${platform} to comment ${commentId}:\n\n${text}\n\nRe-run with --confirm only after the owner approves.`);
    return 0;
  }
  const edge = platform === "facebook" ? "comments" : "replies";
  const { body } = await requestJson(`${graph()}/${commentId}/${edge}`, {
    method: "POST",
    body: form({ message: text, access_token: env("META_PAGE_ACCESS_TOKEN") }),
  });
  appendLog({ draftId: `reply-${commentId}`, platform, status: "posted", postId: body.id });
  console.log(`✅ replied on ${platform} (id=${body.id})`);
  return 0;
}

/** Recent posts with their engagement counts, for the weekly digest. */
async function cmdRecent({ platform, limit }) {
  const rows = [];
  if (platform !== "instagram" && isConfigured("facebook")) {
    const fields = "id,message,created_time,permalink_url,shares,reactions.summary(true).limit(0),comments.summary(true).limit(0)";
    const { body } = await requestJson(`${graph()}/${env("META_PAGE_ID")}/posts?fields=${encodeURIComponent(fields)}&limit=${limit}`, metaAuth());
    for (const p of body.data ?? []) {
      rows.push({
        platform: "facebook",
        at: p.created_time,
        url: p.permalink_url,
        text: clampText(p.message ?? "", 80),
        reactions: p.reactions?.summary?.total_count ?? 0,
        comments: p.comments?.summary?.total_count ?? 0,
        shares: p.shares?.count ?? 0,
      });
    }
  }
  if (platform !== "facebook" && isConfigured("instagram")) {
    const fields = "id,caption,timestamp,permalink,like_count,comments_count";
    const { body } = await requestJson(`${graph()}/${env("INSTAGRAM_BUSINESS_ACCOUNT_ID")}/media?fields=${fields}&limit=${limit}`, metaAuth());
    for (const m of body.data ?? []) {
      rows.push({ platform: "instagram", at: m.timestamp, url: m.permalink, text: clampText(m.caption ?? "", 80), likes: m.like_count ?? 0, comments: m.comments_count ?? 0 });
    }
  }
  console.log(JSON.stringify(rows, null, 2));
  return 0;
}

// ---------------------------------------------------------------------------
// CLI

export function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const [key, inline] = arg.slice(2).split(/=(.*)/s, 2);
    if (inline !== undefined) flags[key] = inline;
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) flags[key] = argv[++i];
    else flags[key] = true;
  }
  return { positional, flags };
}

const USAGE = `usage:
  social.mjs status
  social.mjs preview <draft.json> [--only facebook,x]
  social.mjs post <draft.json> [--only facebook,x] [--confirm]
  social.mjs comments [--platform facebook|instagram] [--limit 10]
  social.mjs reply --platform facebook|instagram --comment-id ID --text "..." [--confirm]
  social.mjs recent [--platform facebook|instagram] [--limit 10]`;

export async function main(argv = process.argv.slice(2)) {
  const { positional, flags } = parseArgs(argv);
  const [command, file] = positional;
  const only = typeof flags.only === "string" ? flags.only.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  const limit = Math.min(Math.max(Number(flags.limit) || 10, 1), 50);
  const platform = typeof flags.platform === "string" ? flags.platform : undefined;

  switch (command) {
    case "status":
      return cmdStatus();
    case "preview":
      if (!file) throw new Error(USAGE);
      return cmdPost(file, { only, confirm: false });
    case "post":
      if (!file) throw new Error(USAGE);
      return cmdPost(file, { only, confirm: flags.confirm === true });
    case "comments":
      return cmdComments({ platform, limit });
    case "reply":
      return cmdReply({ platform, commentId: flags["comment-id"], text: flags.text, confirm: flags.confirm === true });
    case "recent":
      return cmdRecent({ platform, limit });
    default:
      console.log(USAGE);
      return command ? 2 : 0;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`error: ${redact(error.message)}`);
      process.exit(1);
    },
  );
}
