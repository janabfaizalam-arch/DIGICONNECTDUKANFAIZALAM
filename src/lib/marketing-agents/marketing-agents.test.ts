import { describe, expect, it } from "vitest";

import { configuredPlatforms, pickLatestModel, redact, resolveMarketingAgentsMode } from "@/lib/marketing-agents/config";
import { campaignName, clampText, composePost, indiaDate, normaliseHashtags, trackedUrl } from "@/lib/marketing-agents/links";
import { extractJson, suggestedReplacementModel } from "@/lib/marketing-agents/llm";
import { oauth1Signature } from "@/lib/marketing-agents/oauth1";
import { pickServiceForToday } from "@/lib/marketing-agents/pick-service";
import { linkedInCommentary } from "@/lib/marketing-agents/publishers/others";

describe("mode", () => {
  it("is fail-closed", () => {
    expect(resolveMarketingAgentsMode(undefined)).toBe("disabled");
    expect(resolveMarketingAgentsMode("yes")).toBe("disabled");
    expect(resolveMarketingAgentsMode(" LIVE ")).toBe("live");
    expect(resolveMarketingAgentsMode("draft")).toBe("draft");
  });

  it("uses a platform only when every variable is set", () => {
    expect(configuredPlatforms({ TELEGRAM_BOT_TOKEN: "x", TELEGRAM_CHAT_ID: "@c" } as NodeJS.ProcessEnv)).toEqual(["telegram"]);
    expect(configuredPlatforms({ TELEGRAM_BOT_TOKEN: "x", TELEGRAM_CHAT_ID: " " } as NodeJS.ProcessEnv)).toEqual([]);
  });

  it("scrubs secrets from error text", () => {
    const env = { TELEGRAM_BOT_TOKEN: "123456:ABCDEFGHIJ" } as NodeJS.ProcessEnv;
    expect(redact("failed https://api.telegram.org/bot123456:ABCDEFGHIJ/sendPhoto", env)).not.toContain("ABCDEFGHIJ");
    expect(redact("?access_token=EAAB123&x=1", env)).toBe("?access_token=[redacted]&x=1");
  });
});

describe("links", () => {
  it("tags every link for analytics", () => {
    const url = new URL(
      trackedUrl({ siteUrl: "https://www.rnos.in/", path: "/services/pan-card", platform: "facebook", campaign: "daily-x" }),
    );
    expect(url.pathname).toBe("/services/pan-card");
    expect(url.searchParams.get("utm_source")).toBe("facebook");
    expect(url.searchParams.get("utm_medium")).toBe("social");
    expect(url.searchParams.get("utm_campaign")).toBe("daily-x");
  });

  it("names campaigns by date and service", () => {
    expect(campaignName("2026-09-25", "gst-registration")).toBe("daily-2026-09-25-gst-registration");
  });

  it("keeps X posts within 280 with the link intact", () => {
    const link = `https://www.rnos.in/services/gst?${"a".repeat(150)}`;
    const text = composePost({ platform: "x", body: "word ".repeat(100), link, hashtags: ["GST", "#India", "extra"] });
    expect(text).toContain(link);
    const weighted = [...text.replace(link, "x".repeat(23))].length;
    expect(weighted).toBeLessThanOrEqual(280);
    expect(text.match(/#/g)?.length).toBe(2);
  });

  it("dedupes and cleans hashtags", () => {
    expect(normaliseHashtags(["#GST", "gst", "Digital India", ""], 5)).toEqual(["#GST", "#DigitalIndia"]);
  });

  it("clamps on a word boundary", () => {
    expect(clampText("aaaa bbbb cccc", 11)).toBe("aaaa bbbb…");
    expect(clampText("short", 10)).toBe("short");
  });

  it("uses the Indian date", () => {
    expect(indiaDate(new Date("2026-09-25T20:00:00Z"))).toBe("2026-09-26");
  });
});

describe("service rotation", () => {
  const candidates = [
    { slug: "a", featured: false },
    { slug: "b", featured: false },
    { slug: "c", featured: true },
  ];

  it("prefers a service never posted about", () => {
    expect(pickServiceForToday(candidates, { a: "2026-09-20", c: "2026-09-24" }, "2026-09-25")?.slug).toBe("b");
  });

  it("then the one idle longest, with featured services coming round sooner", () => {
    const last = { a: "2026-09-20", b: "2026-09-19", c: "2026-09-22" };
    // a idle 5, b idle 6, c idle 3 + 3 featured = 6 → tie broken by catalogue order (b first)
    expect(pickServiceForToday(candidates, last, "2026-09-25")?.slug).toBe("b");
    expect(pickServiceForToday(candidates, { ...last, b: "2026-09-24" }, "2026-09-25")?.slug).toBe("c");
  });

  it("returns null with nothing to pick", () => {
    expect(pickServiceForToday([], {}, "2026-09-25")).toBeNull();
  });
});

describe("model replies", () => {
  it("finds JSON inside prose or fences", () => {
    expect(extractJson('Here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Sure! {"a":{"b":2}} hope it helps')).toEqual({ a: { b: 2 } });
    expect(() => extractJson("no json")).toThrow();
  });
});

describe("publishers", () => {
  it("signs OAuth 1.0a requests (Twitter's documented example)", () => {
    const signature = oauth1Signature({
      method: "POST",
      url: "https://api.twitter.com/1.1/statuses/update.json",
      params: {
        include_entities: "true",
        status: "Hello Ladies + Gentlemen, a signed OAuth request!",
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

  it("escapes LinkedIn's reserved characters but keeps hashtags", () => {
    expect(linkedInCommentary("PAN (new) #GST_Help #India")).toBe("PAN \\(new\\) {hashtag|\\#|GST}\\_Help {hashtag|\\#|India}");
  });
});

describe("model choice", () => {
  it("picks the newest stable Flash model for each kind", () => {
    const names = [
      "models/gemini-2.5-flash",
      "models/gemini-3.8-flash",
      "models/gemini-3.10-flash",
      "models/gemini-3.8-flash-image",
      "models/gemini-3.8-pro",
      "models/gemini-4.0-flash-preview-09-2026",
    ];
    expect(pickLatestModel(names, "text")).toBe("gemini-3.10-flash");
    expect(pickLatestModel(names, "image")).toBe("gemini-3.8-flash-image");
  });

  it("uses a preview only when there is no stable model", () => {
    expect(pickLatestModel(["models/gemini-4.0-flash-image-preview"], "image")).toBe("gemini-4.0-flash-image-preview");
    expect(pickLatestModel(["models/gemini-3.8-pro"], "text")).toBeNull();
  });

  it("reads the replacement Google names in a retirement error", () => {
    const message =
      '{"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for the latest features and improvements.","status":"NOT_FOUND"}}';
    expect(suggestedReplacementModel(message)).toBe("gemini-3.8-flash");
    expect(suggestedReplacementModel("quota exceeded, use less")).toBeNull();
  });
});
