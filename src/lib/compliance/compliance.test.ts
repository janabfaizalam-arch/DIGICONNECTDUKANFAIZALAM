import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { CONSENT_VERSION } from "@/lib/compliance/config";
import { parseConsent } from "@/lib/consent/consent";
import { toPrivacyEmbedUrl } from "@/lib/embeds";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("toPrivacyEmbedUrl", () => {
  it("rewrites every YouTube link form to youtube-nocookie", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=abcDEF12345",
      "https://youtu.be/abcDEF12345",
      "https://www.youtube.com/embed/abcDEF12345",
      "https://youtube.com/shorts/abcDEF12345",
      "https://m.youtube.com/watch?v=abcDEF12345&t=3",
    ]) {
      expect(toPrivacyEmbedUrl(url)).toBe("https://www.youtube-nocookie.com/embed/abcDEF12345?rel=0");
    }
  });

  it("adds do-not-track to Vimeo", () => {
    expect(toPrivacyEmbedUrl("https://vimeo.com/123456")).toBe("https://player.vimeo.com/video/123456?dnt=1");
  });

  it("refuses non-https and malformed links", () => {
    expect(toPrivacyEmbedUrl("http://example.com/video")).toBeNull();
    expect(toPrivacyEmbedUrl("javascript:alert(1)")).toBeNull();
    expect(toPrivacyEmbedUrl("not a url")).toBeNull();
    expect(toPrivacyEmbedUrl("https://www.youtube.com/watch")).toBeNull();
  });
});

describe("parseConsent", () => {
  const encode = (value: unknown) => encodeURIComponent(JSON.stringify(value));

  it("treats a missing or unreadable cookie as no decision", () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent("garbage%")).toBeNull();
  });

  it("treats a choice made under an older version as no decision", () => {
    expect(parseConsent(encode({ v: CONSENT_VERSION - 1, analytics: true, marketing: true }))).toBeNull();
  });

  it("only grants a category on an explicit true", () => {
    const state = parseConsent(encode({ v: CONSENT_VERSION, analytics: "yes", marketing: true, ts: "t" }));
    expect(state).toEqual({ v: CONSENT_VERSION, analytics: false, marketing: true, ts: "t" });
  });
});

describe("tracking is consent-gated", () => {
  it("the root layout loads no tracker directly", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).not.toContain("connect.facebook.net");
    expect(layout).not.toContain("<GoogleAnalytics");
    expect(layout).not.toContain("<VisitTracker");
    expect(layout).toContain("<TrackingScripts");
    expect(layout).toContain("<CookieConsent");
  });

  it("GA and the Pixel mount only behind their consent flags", () => {
    const source = read("src/components/privacy/tracking-scripts.tsx");
    expect(source).toContain("gaMeasurementId && analyticsAllowed ? <GoogleAnalytics");
    expect(source).toContain("metaPixelId && marketingAllowed ?");
  });

  it("GA never defaults analytics or ad storage to granted before consent", () => {
    const source = read("src/components/google-analytics.tsx");
    expect(source).toContain("ad_storage: 'denied'");
    expect(source).toContain("allow_google_signals: false");
  });
});

describe("security regressions", () => {
  it("create-order refuses to price an order from the client amount alone", () => {
    const source = read("src/app/api/create-order/route.ts");
    expect(source).toContain('"order_target_required"');
  });

  it("the documents bucket has no anonymous or all-users read policy", () => {
    const migration = read("supabase/migrations/20260926090000_close_documents_bucket_reads.sql");
    expect(migration).toContain('drop policy if exists "Public can read documents bucket"');
    expect(migration).toContain('drop policy if exists "Authenticated users can read documents"');
    expect(migration).toContain('drop policy if exists "Public can upload lead files"');
    expect(migration).not.toMatch(/create policy[^;]*to (public|anon)/i);
  });

  it("the credit form does not log personal data", () => {
    const source = read("src/components/credit/credit-score-form.tsx");
    expect(source).not.toMatch(/console\.log\([^)]*\b(pan|mobile|dob)\b/);
  });
});

describe("migration history", () => {
  it("every migration has a unique version", () => {
    // Supabase keys applied migrations by the numeric prefix; two files with
    // the same prefix make `supabase db push` fail on the second one.
    const versions = readdirSync(join(root, "supabase/migrations"))
      .filter((f: string) => f.endsWith(".sql"))
      .map((f: string) => f.split("_")[0]);
    const duplicates = versions.filter((v: string, i: number) => versions.indexOf(v) !== i);
    expect(duplicates).toEqual([]);
  });
});

describe("API route inventory", () => {
  it("has no route left needing review", async () => {
    const { execFileSync } = await import("child_process");
    const rows = JSON.parse(
      execFileSync("node", ["scripts/security/api-inventory.mjs", "--json"], { cwd: root, encoding: "utf8" }),
    ) as { route: string; risk: string }[];
    expect(rows.length).toBeGreaterThan(200);
    expect(rows.filter((r) => r.risk === "review").map((r) => r.route)).toEqual([]);
  });
});
