import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  buildReelsJsonLd,
  isPlayableReel,
  resolveReelSource,
  safeReelHref,
  type HomepageReel,
} from "@/lib/homepage/reels";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");

const reel = (over: Partial<HomepageReel> = {}): HomepageReel => ({
  id: crypto.randomUUID(),
  title: "GST registration in 3 days",
  caption: "Ramesh got his certificate without leaving the shop.",
  video_url: "https://cdn.example.com/reels/gst.mp4",
  poster_url: "https://cdn.example.com/reels/gst.jpg",
  cta_label: "Apply now",
  cta_href: "/services/gst-registration",
  sort_order: 0,
  is_active: true,
  ...over,
});

describe("reel source resolution", () => {
  it("treats a direct video file as inline-playable", () => {
    for (const ext of ["mp4", "webm", "mov"]) {
      const source = resolveReelSource(`https://cdn.example.com/a.${ext}`);
      expect(source.kind, ext).toBe("file");
    }
  });

  it("still recognises a file behind a signed-URL query string", () => {
    // Supabase storage links carry ?token=… — a naive endsWith check would
    // classify every signed URL as unsupported.
    expect(resolveReelSource("https://x.supabase.co/a.mp4?token=abc").kind).toBe("file");
  });

  it("converts YouTube Shorts into a muted looping embed", () => {
    const source = resolveReelSource("https://www.youtube.com/shorts/dQw4w9WgXcQ");
    expect(source.kind).toBe("embed");
    if (source.kind !== "embed") return;
    expect(source.src).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(source.src).toContain("mute=1");
    // loop needs an explicit playlist of the same id or YouTube ignores it.
    expect(source.src).toContain("playlist=dQw4w9WgXcQ");
  });

  it("handles Vimeo", () => {
    expect(resolveReelSource("https://vimeo.com/123456789").kind).toBe("embed");
  });

  it("refuses anything not https", () => {
    expect(resolveReelSource("http://cdn.example.com/a.mp4").kind).toBe("unsupported");
    expect(resolveReelSource("javascript:alert(1)").kind).toBe("unsupported");
    expect(resolveReelSource("")).toEqual({ kind: "unsupported" });
    expect(resolveReelSource(null).kind).toBe("unsupported");
  });

  it("marks an unplayable row so it never reaches the rail", () => {
    // Otherwise the homepage shows a dead black card.
    expect(isPlayableReel(reel())).toBe(true);
    expect(isPlayableReel(reel({ video_url: "https://example.com/page" }))).toBe(false);
  });
});

describe("reel CTA links", () => {
  it("allows internal paths and https URLs", () => {
    expect(safeReelHref("/services/gst")).toBe("/services/gst");
    expect(safeReelHref("https://rnos.in/x")).toBe("https://rnos.in/x");
  });

  it("blocks script and protocol-relative targets", () => {
    // This value is admin-supplied and rendered as an anchor on a public page.
    expect(safeReelHref("javascript:alert(1)")).toBeNull();
    expect(safeReelHref("//evil.example.com")).toBeNull();
    expect(safeReelHref("http://evil.example.com")).toBeNull();
    expect(safeReelHref("")).toBeNull();
    expect(safeReelHref(null)).toBeNull();
  });
});

describe("reel structured data", () => {
  const now = "2026-08-12T00:00:00.000Z";

  it("emits one VideoObject per reel, in order", () => {
    const jsonLd = buildReelsJsonLd([reel({ title: "A" }), reel({ title: "B" })], now);
    const items = jsonLd?.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0].position).toBe(1);
    expect((items[1].item as Record<string, unknown>).name).toBe("B");
  });

  it("omits reels with no cover image rather than emitting an invalid VideoObject", () => {
    // thumbnailUrl is required; a missing one invalidates the entry.
    const jsonLd = buildReelsJsonLd([reel(), reel({ poster_url: null })], now);
    expect((jsonLd?.itemListElement as unknown[]).length).toBe(1);
  });

  it("falls back to the title when a reel has no caption", () => {
    const jsonLd = buildReelsJsonLd([reel({ caption: "" })], now);
    const item = (jsonLd?.itemListElement as Array<Record<string, unknown>>)[0].item as Record<string, unknown>;
    expect(item.description).toBe("GST registration in 3 days");
  });

  it("returns null when nothing qualifies", () => {
    expect(buildReelsJsonLd([], now)).toBeNull();
    expect(buildReelsJsonLd([reel({ poster_url: null })], now)).toBeNull();
  });
});

describe("reels wiring", () => {
  it("validates the video link on save instead of at render", () => {
    const route = readSrc("src/app/api/admin/homepage/reels/route.ts");
    expect(route).toContain("resolveReelSource");
    expect(route).toContain("safeReelHref");
  });

  it("autoplays muted and pauses off-screen", () => {
    // Sound-on autoplay is blocked by every mobile browser, and a rail of
    // videos all playing at once would burn the visitor's data.
    const rail = readSrc("src/components/homepage/reels-rail.tsx");
    expect(rail).toContain("IntersectionObserver");
    expect(rail).toContain('preload="none"');
    expect(rail).toMatch(/muted=\{muted\}/);
    expect(rail).toContain("video.pause()");
  });

  it("does not leave a rejected play() unhandled", () => {
    const rail = readSrc("src/components/homepage/reels-rail.tsx");
    expect(rail).not.toMatch(/void video\.play\(\);\s*\n/);
    expect(rail).toMatch(/video\.play\(\)\.then\(/);
  });

  it("hides the section when there is nothing to show", () => {
    const rail = readSrc("src/components/homepage/reels-rail.tsx");
    expect(rail).toMatch(/if \(!reels\.length\) return null;/);
  });
});
