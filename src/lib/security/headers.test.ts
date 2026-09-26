import { describe, expect, it } from "vitest";

import nextConfig from "../../../next.config";
import { buildCspHeaders, buildFullDirectives, cspOptionsFromEnv } from "@/lib/security/csp";
import { isOptimizableImage, remoteImagePatterns } from "@/lib/security/image-hosts";

type Header = { key: string; value: string };

async function headersFor(source: string): Promise<Header[]> {
  const rules = (await nextConfig.headers!()) as { source: string; headers: Header[] }[];
  return rules.find((r) => r.source === source)!.headers;
}

/** The headers a response gets: later rules override earlier ones per key, as in Next. */
async function effectiveHeaders(path: "/" | "/other"): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers!()) as { source: string; headers: Header[] }[];
  const out: Record<string, string> = {};
  for (const rule of rules) {
    const matches = rule.source === "/(.*)" || rule.source === path;
    if (!matches) continue;
    for (const header of rule.headers) out[header.key.toLowerCase()] = header.value;
  }
  return out;
}

const SUPABASE = "https://abcdefghijklmnop.supabase.co";

describe("security headers on every route", () => {
  it("sends the full baseline set", async () => {
    const h = await effectiveHeaders("/other");
    expect(h["strict-transport-security"]).toMatch(/max-age=\d{8,}/);
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("microphone=()");
    expect(h["permissions-policy"]).toContain("geolocation=()");
    expect(h["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
    expect(h["cross-origin-resource-policy"]).toBe("same-site");
    expect(h["x-frame-options"]).toBe("DENY");
  });

  it("always enforces the structural CSP directives, and refuses framing", async () => {
    const csp = (await effectiveHeaders("/other"))["content-security-policy"];
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("lets only our own origin frame the homepage", async () => {
    const h = await effectiveHeaders("/");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'self'");
    expect(h["content-security-policy"]).not.toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("SAMEORIGIN");
  });

  it("ships the full allowlist policy (report-only unless CSP_ENFORCE=true)", async () => {
    const h = await headersFor("/(.*)");
    const keys = h.map((x) => x.key);
    const enforce = cspOptionsFromEnv().enforce;
    expect(keys).toContain(enforce ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only");
    const full = h.find((x) => x.key === (enforce ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only"))!.value;
    expect(full).toContain("default-src 'self'");
    expect(full).toContain("report-uri /api/csp-report");
  });
});

describe("CSP allowlist", () => {
  const directives = buildFullDirectives({ supabaseUrl: SUPABASE, frameAncestors: "'none'", reportUri: "/r" });

  it("never allows a bare wildcard or eval", () => {
    for (const [name, values] of Object.entries(directives)) {
      for (const value of values) {
        expect(value, `${name} contains ${value}`).not.toBe("*");
        expect(value, `${name} contains ${value}`).not.toMatch(/^https?:\/\/\*$/);
      }
    }
    expect(directives["script-src"]).not.toContain("'unsafe-eval'");
    expect(directives["script-src"]).not.toContain("https:");
    expect(directives["connect-src"]).not.toContain("https:");
    expect(directives["frame-src"]).not.toContain("https:");
  });

  it("allows what checkout, Supabase, analytics and video embeds need", () => {
    expect(directives["script-src"]).toContain("https://*.razorpay.com");
    expect(directives["frame-src"]).toContain("https://*.razorpay.com");
    expect(directives["connect-src"]).toContain("https://*.razorpay.com");
    expect(directives["connect-src"]).toContain(SUPABASE);
    expect(directives["script-src"]).toContain("https://www.googletagmanager.com");
    expect(directives["script-src"]).toContain("https://connect.facebook.net");
    expect(directives["frame-src"]).toContain("https://www.youtube-nocookie.com");
    expect(directives["frame-src"]).toContain("https://player.vimeo.com");
    // MediaPipe (Smart Print portrait) compiles WebAssembly.
    expect(directives["script-src"]).toContain("'wasm-unsafe-eval'");
  });

  it("adds the Vercel toolbar only on previews", () => {
    expect(buildFullDirectives({ frameAncestors: "'none'" })["script-src"]).not.toContain("https://vercel.live");
    expect(buildFullDirectives({ frameAncestors: "'none'", isPreview: true })["script-src"]).toContain("https://vercel.live");
  });

  it("merges into one enforced header when CSP_ENFORCE=true", () => {
    const headers = buildCspHeaders({ supabaseUrl: SUPABASE, frameAncestors: "'none'", enforce: true });
    expect(headers).toHaveLength(1);
    expect(headers[0].key).toBe("Content-Security-Policy");
    expect(headers[0].value).toContain("default-src 'self'");
  });
});

describe("image optimiser allowlist", () => {
  it("next.config has no wildcard remote image host", () => {
    const patterns = nextConfig.images?.remotePatterns ?? [];
    for (const pattern of patterns) {
      const hostname = (pattern as { hostname: string }).hostname;
      expect(hostname).not.toMatch(/\*/);
      expect((pattern as { protocol?: string }).protocol).toBe("https");
    }
  });

  it("restricts Supabase to public bucket paths", () => {
    const [supabase] = remoteImagePatterns(SUPABASE);
    expect(supabase).toEqual({
      protocol: "https",
      hostname: "abcdefghijklmnop.supabase.co",
      pathname: "/storage/v1/object/public/**",
    });
  });

  it("only optimises allowlisted sources", () => {
    const patterns = remoteImagePatterns(SUPABASE);
    expect(isOptimizableImage("/images/logo.png", patterns)).toBe(true);
    expect(isOptimizableImage(`${SUPABASE}/storage/v1/object/public/gallery/a.webp`, patterns)).toBe(true);
    expect(isOptimizableImage(`${SUPABASE}/storage/v1/object/sign/documents/a.pdf`, patterns)).toBe(false);
    expect(isOptimizableImage("https://evil.example/x.png", patterns)).toBe(false);
    expect(isOptimizableImage("https://images.unsplash.com.evil.example/x.png", patterns)).toBe(false);
    expect(isOptimizableImage("http://images.unsplash.com/x.png", patterns)).toBe(false);
    expect(isOptimizableImage("//evil.example/x.png", patterns)).toBe(false);
    expect(isOptimizableImage("data:image/png;base64,AAAA", patterns)).toBe(false);
  });
});
