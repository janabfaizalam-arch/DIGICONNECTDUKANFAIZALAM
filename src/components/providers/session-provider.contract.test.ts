import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function code(rel: string) {
  return readFileSync(join(root, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

const header = code("src/components/site-header.tsx");
const nav = code("src/components/bottom-nav.tsx");
const layout = code("src/app/layout.tsx");
const provider = code("src/components/providers/session-provider.tsx");
const browserClient = code("src/lib/supabase/browser.ts");

/**
 * The site header and the bottom navigation are both mounted by the root
 * layout, on every page. Each of them used to answer "who is signed in, and
 * what are they?" independently — a `getUser()` round trip plus a `profiles`
 * read plus sometimes a `users` read, doubled. That was the largest avoidable
 * cost on every navigation in the app, and it is the kind of duplication that
 * creeps back one component at a time.
 */
describe("the signed-in user is resolved once per page", () => {
  it("is provided from the root layout", () => {
    expect(layout).toContain("SessionProvider");
  });

  for (const [name, source] of [
    ["the site header", header],
    ["the bottom navigation", nav],
  ] as const) {
    it(`${name} reads the shared session rather than its own`, () => {
      expect(source).toContain("useAppSession");
      expect(source, `${name} still calls the auth server itself`).not.toMatch(
        /auth\.(getUser|getSession)\(/,
      );
      expect(source, `${name} still subscribes to auth changes itself`).not.toContain(
        "onAuthStateChange",
      );
      expect(source, `${name} still looks the role up itself`).not.toMatch(
        /from\("(profiles|users)"\)/,
      );
    });
  }

  it("caches the role, which cannot change between two page views", () => {
    expect(provider).toContain("sessionStorage");
  });

  /**
   * Every `createClient()` used to build a new browser client, each with its
   * own auth listener and its own token-refresh timer against the same
   * session.
   */
  it("hands out one browser client per tab", () => {
    expect(browserClient).toMatch(/if \(client\) return client;/);
  });
});
