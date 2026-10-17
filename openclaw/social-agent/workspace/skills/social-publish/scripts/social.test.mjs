import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PLATFORM_LIMITS, alreadyPosted, composePost, loadDraft, main, oauth1Signature, parseArgs, prepare, redact } from "./social.mjs";

/**
 * The OpenClaw agent's publisher posts in the shop's name, in public, on the
 * owner's say-so. These tests pin the parts that must not drift: nothing
 * leaves without --confirm, secrets never reach output, and the text each
 * platform gets fits that platform.
 */

const ENV = {
  META_PAGE_ID: "111",
  META_PAGE_ACCESS_TOKEN: "EAAGsecretpagetoken",
  X_API_KEY: "xkey123",
  X_API_SECRET: "xsecret123",
  X_ACCESS_TOKEN: "xtoken123",
  X_ACCESS_TOKEN_SECRET: "xtokensecret123",
  TELEGRAM_BOT_TOKEN: "123456:ABCdefGhi_jkl",
  TELEGRAM_CHAT_ID: "@digiconnect",
  SITE_URL: "https://www.rnos.in/",
};

let dir;
let saved;

function writeDraft(draft) {
  const file = join(dir, "draft.json");
  writeFileSync(file, JSON.stringify(draft));
  return file;
}

const DRAFT = {
  id: "2026-10-20-diwali-gst",
  path: "/services/gst-registration",
  title: "GST registration before Diwali",
  description: "Documents and steps for GST registration.",
  hashtags: ["GST", "#DigiConnectDukan", "gst"],
  posts: {
    facebook: "Diwali se pehle GST registration karwa lijiye — documents ki list yahan hai.",
    x: "Diwali sale se pehle GST number? Documents ready rakhiye.",
    instagram: "GST registration ke documents: PAN, Aadhaar, address proof.",
  },
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "social-"));
  saved = { ...process.env };
  Object.assign(process.env, ENV, { SOCIAL_LOG: join(dir, "log.jsonl") });
});

afterEach(() => {
  process.env = saved;
  vi.restoreAllMocks();
});

describe("the approval gate", () => {
  it("never calls the network without --confirm", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await main(["post", writeDraft(DRAFT)]);
    expect(code).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join("\n")).toContain("DRY RUN");
  });

  it("treats --confirm=anything-but-bare as not confirmed", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.spyOn(console, "log").mockImplementation(() => {});
    await main(["post", writeDraft(DRAFT), "--confirm=no"]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not reply to a comment without --confirm", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.spyOn(console, "log").mockImplementation(() => {});
    await main(["reply", "--platform", "facebook", "--comment-id", "1_2", "--text", "Dhanyavaad!"]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts once with --confirm, then refuses to post the same draft twice", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("/feed")) return new Response(JSON.stringify({ id: "111_999" }));
      if (u.includes("api.x.com")) return new Response(JSON.stringify({ data: { id: "42" } }));
      return new Response("{}", { status: 404 });
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const file = writeDraft({ ...DRAFT, posts: { facebook: DRAFT.posts.facebook, x: DRAFT.posts.x } });

    expect(await main(["post", file, "--confirm"])).toBe(0);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(alreadyPosted(DRAFT.id)).toEqual(new Set(["facebook", "x"]));

    fetchSpy.mockClear();
    await main(["post", file, "--confirm"]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("secrets", () => {
  it("redacts tokens and token shapes from messages", () => {
    const text = redact("failed https://api.telegram.org/bot123456:ABCdefGhi_jkl/sendPhoto access_token=EAAGsecretpagetoken&x=1");
    expect(text).not.toContain("ABCdefGhi_jkl");
    expect(text).not.toContain("EAAGsecretpagetoken");
  });

  it("keeps a platform's error out of the log unredacted", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Invalid token EAAGsecretpagetoken" } }), { status: 400 }),
    );
    vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await main(["post", writeDraft({ ...DRAFT, posts: { facebook: DRAFT.posts.facebook } }), "--confirm"]);
    expect(code).toBe(1);
    const log = readFileSync(process.env.SOCIAL_LOG, "utf8");
    expect(log).toContain('"status":"failed"');
    expect(log).not.toContain("EAAGsecretpagetoken");
  });
});

describe("prepared text", () => {
  it("tags every link with the platform, and keeps links out of Instagram captions", () => {
    const prepared = prepare(loadDraft(writeDraft(DRAFT)));
    const byPlatform = Object.fromEntries(prepared.map((p) => [p.platform, p]));
    expect(byPlatform.facebook.text).toContain("https://www.rnos.in/services/gst-registration?utm_source=facebook&utm_medium=social&utm_campaign=2026-10-20-diwali-gst");
    expect(byPlatform.instagram.text).not.toContain("https://");
    expect(byPlatform.instagram.warnings).toContain("needs an image; will be skipped");
  });

  it("deduplicates hashtags case-insensitively", () => {
    const { text } = composePost({ platform: "facebook", body: "Hello there friends", link: null, hashtags: DRAFT.hashtags });
    expect(text.match(/#GST/gi)).toHaveLength(1);
  });

  it("fits X's limit counting a link as 23 characters", () => {
    const long = "Diwali offer ".repeat(40);
    const { text, truncated } = composePost({ platform: "x", body: long, link: "https://www.rnos.in/" + "a".repeat(200), hashtags: ["GST"] });
    expect(truncated).toBe(true);
    const weighted = [...text.replace(/https:\/\/\S+/, "")].length + 23;
    expect(weighted).toBeLessThanOrEqual(PLATFORM_LIMITS.x.text);
  });

  it("lists every problem with a bad draft at once", () => {
    expect(() => loadDraft(writeDraft({ id: "Bad Id", path: "services", posts: { myspace: "hi there friends" } }))).toThrow(
      /"id" must be[\s\S]*"path" must start[\s\S]*unknown platform "myspace"/,
    );
  });
});

describe("OAuth 1.0a", () => {
  it("matches X's documented signature example", () => {
    // https://developer.x.com/en/docs/authentication/oauth-1-0a/creating-a-signature
    const signature = oauth1Signature({
      method: "POST",
      url: "https://api.twitter.com/1.1/statuses/update.json",
      params: {
        status: "Hello Ladies + Gentlemen, a signed OAuth request!",
        include_entities: "true",
        oauth_consumer_key: "xvz1evFS4wEEPTGEFPHBog",
        oauth_nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: "1318622958",
        oauth_token: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
        oauth_version: "1.0",
      },
      consumerSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
      tokenSecret: "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE",
    });
    expect(signature).toBe("hCtSmYh+iHYCEqBWrE7C7hYmtUk=");
  });
});

describe("argument parsing", () => {
  it("reads --flag value, --flag=value and bare flags", () => {
    expect(parseArgs(["post", "d.json", "--only", "x,facebook", "--confirm", "--limit=5"])).toEqual({
      positional: ["post", "d.json"],
      flags: { only: "x,facebook", confirm: true, limit: "5" },
    });
  });
});
