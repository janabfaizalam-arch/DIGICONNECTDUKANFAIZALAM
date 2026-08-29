import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { readCode } from "@/lib/testing/source";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const code = readCode;

/**
 * The homepage and the services directory are force-dynamic and between them
 * read six tables on every visit, by every visitor — none of it per-visitor,
 * none of it changing unless an admin edits it. Every one of those was the
 * same answer fetched again, with the page unable to paint until all of them
 * came back.
 */
const CACHED = [
  "getCachedPublicServices",
  "getCachedHomepageSlides",
  "getCachedHomepageFaqs",
  "getCachedHomepageTestimonials",
  "getCachedHomepageReels",
  "getCachedFooterSocialLinks",
] as const;

describe("public marketing content is read from cache", () => {
  const cached = code("src/lib/homepage/cached.ts");

  for (const loader of CACHED) {
    it(`${loader} is wrapped for caching`, () => {
      expect(cached).toMatch(new RegExp(`export const ${loader} = cachePublicRead\\(`));
    });
  }

  it("uses a distinct tag per kind of content, so one edit clears one thing", () => {
    const tags = [...cached.matchAll(/HOMEPAGE_TAGS\.(\w+)/g)].map((m) => m[1]);
    expect(tags).toHaveLength(CACHED.length);
    expect(new Set(tags).size).toBe(CACHED.length);
  });

  /**
   * The wrappers were first written into the loader files themselves, and
   * client components import those files for their types — so `next/cache`
   * followed them into the browser bundle and the homepage grew by 37 kB on
   * the change meant to make it faster. `server-only` turns that into a build
   * error instead of a number nobody looks at.
   */
  it("cannot be pulled into a client bundle", () => {
    expect(read("src/lib/homepage/cached.ts")).toMatch(/^import "server-only";/m);
  });

  it("leaves the loader modules free of server-only cache imports", () => {
    for (const file of [
      "src/lib/services.ts",
      "src/lib/homepage-slides.ts",
      "src/lib/homepage/faqs.ts",
      "src/lib/homepage/testimonials.ts",
      "src/lib/homepage/reels.ts",
      "src/lib/homepage/social.ts",
    ]) {
      expect(code(file), `${file} must stay importable from a client component`).not.toContain(
        "next/cache",
      );
    }
  });

  /**
   * A cache an admin cannot clear is worse than no cache: they edit, nothing
   * changes, and they edit again. Every write path clears its own tag.
   */
  const WRITERS: [string, string][] = [
    ["src/app/api/admin/homepage/faqs/route.ts", "faqs"],
    ["src/app/api/admin/homepage/testimonials/route.ts", "testimonials"],
    ["src/app/api/admin/homepage/reels/route.ts", "reels"],
    ["src/app/api/admin/homepage/social/route.ts", "social"],
    ["src/app/api/admin/homepage-slides/route.ts", "slides"],
    ["src/app/api/admin/homepage-slides/[id]/route.ts", "slides"],
    ["src/lib/service-admin.ts", "services"],
  ];

  for (const [file, tag] of WRITERS) {
    it(`${file} clears ${tag} when it writes`, () => {
      expect(code(file)).toContain(`revalidateTag(HOMEPAGE_TAGS.${tag})`);
    });
  }

  /**
   * Clearing a cache from a GET means every admin page view throws the cache
   * away, which is the cache doing nothing at all.
   */
  it("never clears a tag from a read handler", () => {
    for (const [file] of WRITERS) {
      let handler = "";
      for (const line of code(file).split("\n")) {
        const match = /export async function (\w+)\(/.exec(line);
        if (match) handler = match[1];
        if (line.includes("revalidateTag(HOMEPAGE_TAGS.")) {
          expect(handler, `${file} clears its tag inside ${handler}`).not.toBe("GET");
        }
      }
    }
  });
});
