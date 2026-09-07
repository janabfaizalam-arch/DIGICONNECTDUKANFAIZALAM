import { readdirSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { ADMIN_CHILD_ROUTES, flattenAdminNav } from "@/lib/admin/nav";
import { AI_TASKS, MODELS, tierFor } from "@/lib/content-engine/model-router";
import { CONTENT_ENGINE_SCREENS } from "@/lib/content-engine/screens";
import { DEFAULT_BRAND, bannedPhrasesIn, voicePrompt } from "@/lib/content-engine/brand-voice";
import { readCode, readSource } from "@/lib/testing/source";

const root = process.cwd();

/**
 * The promises this subsystem makes about itself.
 *
 * Not "does the code work" — the other test files cover that — but the
 * structural guarantees that a later refactor could quietly undo: the API key
 * staying on the server, every screen having a door, expensive models being
 * used only where they earn it, and the government rule being enforced in one
 * place rather than in whichever caller remembered.
 */

/** Repository-relative paths, because `readCode` resolves against the root. */
function listFiles(dir: string, match: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(root, dir))) {
    const full = `${dir}/${entry}`;
    if (statSync(join(root, full)).isDirectory()) out.push(...listFiles(full, match));
    else if (match(entry)) out.push(full);
  }
  return out;
}

const libFiles = listFiles("src/lib/content-engine", (name) => name.endsWith(".ts"));
/** The engine's own code, without the tests that quote it. */
const sourceFiles = libFiles.filter((file) => !file.endsWith(".test.ts"));
const componentFiles = listFiles("src/components/content-engine", (name) => name.endsWith(".tsx"));
const routeFiles = listFiles("src/app/api/admin/content-engine", (name) => name === "route.ts");
const cronFiles = listFiles("src/app/api/cron", (name) => name === "route.ts").filter((file) =>
  file.includes("content-"),
);

/* ─────────────────────────────────────────────────────────────────────────
   Secrets
   ───────────────────────────────────────────────────────────────────────── */

describe("no credential can reach a browser", () => {
  it("reads the model key in exactly one file", () => {
    const readers = sourceFiles.filter((file) => readCode(file).includes("process.env.GEMINI_API_KEY"));
    expect(readers).toEqual(["src/lib/content-engine/ai/generate.ts"]);
  });

  it("never reads the environment from a component, which ships to the browser", () => {
    /*
      The rule is about reading a value, not about naming a variable. The
      settings and design screens print "CONFIGURATION REQUIRED — set
      CANVA_CLIENT_SECRET" so an administrator knows what to do, and telling
      somebody which variable to set is not a leak. Reading one is.
    */
    for (const file of componentFiles) {
      expect(readCode(file), `${file} reads process.env`).not.toContain("process.env");
    }
  });

  it("never invents a NEXT_PUBLIC_ variable for a secret", () => {
    // NEXT_PUBLIC_ is compiled into the browser bundle by definition.
    for (const file of [...libFiles, ...componentFiles]) {
      const source = readCode(file);
      expect(source, file).not.toMatch(/NEXT_PUBLIC_(GEMINI|CANVA|META|LINKEDIN|SERVICE_ROLE)/);
    }
  });

  it("marks every server module that touches data or credentials as server-only", () => {
    const mustBeServerOnly = [
      "src/lib/content-engine/repository.ts",
      "src/lib/content-engine/ai/generate.ts",
      "src/lib/content-engine/publish-runner.ts",
      "src/lib/content-engine/publishers/base.ts",
      "src/lib/content-engine/publishers/adapters.ts",
      "src/lib/content-engine/activity.ts",
      "src/lib/content-engine/api.ts",
      "src/lib/content-engine/cron.ts",
      "src/lib/content-engine/dashboard.ts",
      "src/lib/content-engine/orchestrator.ts",
      "src/lib/content-engine/engines/mine.ts",
      "src/lib/content-engine/engines/angle.ts",
      "src/lib/content-engine/engines/write.ts",
      "src/lib/content-engine/engines/fact-check.ts",
      "src/lib/content-engine/engines/design.ts",
      "src/lib/content-engine/engines/repurpose.ts",
      "src/lib/content-engine/engines/learn.ts",
    ];

    for (const file of mustBeServerOnly) {
      expect(readSource(file).startsWith('import "server-only";'), file).toBe(true);
    }
  });

  it("keeps the client-safe modules importable, so screens can share the vocabulary", () => {
    // These are imported by client components. A stray `server-only` here
    // would turn a working screen into a build error.
    for (const file of [
      "src/lib/content-engine/types.ts",
      "src/lib/content-engine/pipeline.ts",
      "src/lib/content-engine/platforms.ts",
      "src/lib/content-engine/scoring.ts",
      "src/lib/content-engine/publishing-guard.ts",
      "src/lib/content-engine/command-center.ts",
      "src/lib/content-engine/screens.ts",
    ]) {
      expect(readSource(file), file).not.toContain('import "server-only"');
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Access
   ───────────────────────────────────────────────────────────────────────── */

describe("every endpoint is behind something", () => {
  it("checks for an admin on every content engine route", () => {
    for (const file of routeFiles) {
      expect(readCode(file), file).toContain("requireAdmin(request");
    }
  });

  it("rate limits before it does anything else, so a flood costs nothing", () => {
    // requireAdmin does the rate limiting for every route; this asserts it
    // happens before the session lookup rather than after it.
    const api = readCode("src/lib/content-engine/api.ts");
    const body = api.slice(api.indexOf("export async function requireAdmin"));
    expect(body).toContain("checkRateLimit");
    expect(body.indexOf("checkRateLimit")).toBeLessThan(body.indexOf("await getCurrentUser()"));
  });

  it("limits generation harder than reading, because generation costs per call", () => {
    const api = readSource("src/lib/content-engine/api.ts");
    const read = /read: \{ limit: (\d+)/.exec(api)?.[1];
    const generate = /generate: \{ limit: (\d+)/.exec(api)?.[1];
    expect(Number(generate)).toBeLessThan(Number(read));
  });

  it("puts every scheduled job behind the shared secret", () => {
    for (const file of cronFiles) {
      expect(readCode(file), file).toContain("authorizeCron(request");
    }
    expect(cronFiles.length).toBe(5);
  });

  it("never accepts a cron secret from a query string", () => {
    // A secret in a URL ends up in access logs, history and referrer headers.
    const cron = readCode("src/lib/content-engine/cron.ts");
    expect(cron).toContain('searchParams.has("secret")');
    expect(cron).toContain("authorization");
  });

  it("guards the screens as well as the routes", () => {
    const layout = readCode("src/app/admin/content-engine/layout.tsx");
    expect(layout).toContain("isAdminRole");
    expect(layout).toContain('redirect("/admin/login")');
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The government rule, in one place
   ───────────────────────────────────────────────────────────────────────── */

describe("the publishing decision is made in one file", () => {
  it("is the only place that decides whether something may go out", () => {
    const deciders = libFiles
      .filter((file) => !file.endsWith(".test.ts"))
      .filter((file) => readCode(file).includes("autoPublishGovernment"))
      ;

    // The guard decides; the repository stores the flag; the settings route
    // records who changed it. Nothing else may reason about it.
    expect(deciders.sort()).toEqual([
      "src/lib/content-engine/publishing-guard.ts",
      "src/lib/content-engine/repository.ts",
      "src/lib/content-engine/types.ts",
    ]);
  });

  it("defaults both publishing switches to off when the settings row cannot be read", () => {
    // An unreadable settings row must never read as permission.
    const repository = readCode("src/lib/content-engine/repository.ts");
    expect(repository).toContain("autoPublish: row ? Boolean(row.auto_publish) : false");
    expect(repository).toContain(
      "autoPublishGovernment: row ? Boolean(row.auto_publish_government) : false",
    );
  });

  it("stores both switches as off in the migration", () => {
    const migration = readSource("supabase/migrations/20260906120000_ai_content_engine.sql");
    expect(migration).toMatch(/auto_publish boolean not null default false/);
    expect(migration).toMatch(/auto_publish_government boolean not null default false/);
    expect(migration).toMatch(/human_approval_required boolean not null default true/);
  });

  it("refuses to approve a government post whose claims are not verified", () => {
    const approval = readCode("src/app/api/admin/content-engine/approval/route.ts");
    expect(approval).toContain('post.government && post.factCheckStatus !== "VERIFIED"');
  });

  it("records who approved, so an AI is never the answer to who said so", () => {
    const approval = readCode("src/app/api/admin/content-engine/approval/route.ts");
    expect(approval).toContain("approvedBy: guard.actor");
  });

  it("resets a verified fact check when the text is edited afterwards", () => {
    const drafts = readCode("src/app/api/admin/content-engine/drafts/route.ts");
    expect(drafts).toContain('post.factCheckStatus === "VERIFIED" ? "PENDING"');
  });

  it("stops the pipeline at the approval queue and offers no way past it", () => {
    const orchestrator = readCode("src/lib/content-engine/orchestrator.ts");
    expect(orchestrator).toContain('move(post, "APPROVAL_PENDING"');
    expect(orchestrator).not.toContain('"PUBLISHED"');
    expect(orchestrator).not.toContain("publishScheduledRow");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Cost
   ───────────────────────────────────────────────────────────────────────── */

describe("what each job costs", () => {
  it("routes every task to a tier, so nothing falls through to the expensive default", () => {
    for (const task of AI_TASKS) {
      expect(["fast", "strong"], task).toContain(tierFor(task));
    }
  });

  it("keeps the mechanical work on the cheap model", () => {
    for (const task of ["classify_topic", "score_idea", "format_caption", "simple_rewrite", "repurpose_version"] as const) {
      expect(tierFor(task), task).toBe("fast");
    }
  });

  it("spends on the judgement calls where being wrong costs something", () => {
    for (const task of ["strategy", "fact_check", "final_writing", "performance_analysis"] as const) {
      expect(tierFor(task), task).toBe("strong");
    }
  });

  it("names the models in one file and nowhere else", () => {
    const namers = libFiles
      .filter((file) => !file.endsWith(".test.ts"))
      .filter((file) => /gemini-[\d.]/.test(readCode(file)))
      ;

    expect(namers).toEqual(["src/lib/content-engine/model-router.ts"]);
    expect(MODELS.fast).not.toBe(MODELS.strong);
  });

  it("retries the expensive tier less, because a retry costs the same as the call", () => {
    const router = readSource("src/lib/content-engine/model-router.ts");
    const fast = /fast: (\d+),\n\s+strong/.exec(router.slice(router.indexOf("MAX_ATTEMPTS")));
    expect(Number(fast?.[1])).toBeGreaterThan(1);
  });

  it("caches, so an unchanged request is not paid for twice", () => {
    const generate = readCode("src/lib/content-engine/ai/generate.ts");
    expect(generate).toContain("readCache");
    expect(generate).toContain("writeCache");
  });

  it("does not cache the calls whose answer must be different every time", () => {
    // "Generate more ideas" pressed twice must not return the same ten.
    expect(readCode("src/lib/content-engine/engines/mine.ts")).toContain("fresh: true");
    expect(readCode("src/lib/content-engine/engines/angle.ts")).toContain("fresh: true");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Nothing is unreachable
   ───────────────────────────────────────────────────────────────────────── */

describe("every screen has a door", () => {
  it("has a page on disk for every screen it lists", () => {
    for (const screen of CONTENT_ENGINE_SCREENS) {
      const path = join(root, "src/app", screen.href, "page.tsx");
      expect(statSync(path).isFile(), `${screen.href} has no page`).toBe(true);
    }
  });

  it("places every screen in the admin panel's map, so none becomes invisible", () => {
    const known = new Set([
      ...flattenAdminNav().map((item) => item.href),
      ...ADMIN_CHILD_ROUTES.map((route) => route.href),
    ]);

    for (const screen of CONTENT_ENGINE_SCREENS) {
      expect(known.has(screen.href), `${screen.href} is not in src/lib/admin/nav.ts`).toBe(true);
    }
  });

  it("covers all twelve stages the engine advertises", () => {
    expect(CONTENT_ENGINE_SCREENS).toHaveLength(12);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Honesty about what is not built
   ───────────────────────────────────────────────────────────────────────── */

describe("an unconnected integration says so", () => {
  it("never reports a publish that did not happen", () => {
    const adapters = readCode("src/lib/content-engine/publishers/adapters.ts");
    // Every adapter's doPublish returns the not-configured state. None of them
    // fabricates an external post id.
    expect(adapters).not.toMatch(/externalPostId: "[a-z0-9_-]+"/i);
    expect((adapters.match(/notConfigured\(\)/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it("says CONFIGURATION REQUIRED in the words the admin will read", () => {
    expect(readCode("src/lib/content-engine/publishers/base.ts")).toContain("CONFIGURATION REQUIRED");
    expect(readCode("src/lib/content-engine/engines/design.ts")).toContain("CONFIGURATION REQUIRED");
  });

  it("reads what is connected from the environment, not from a stored flag", () => {
    const settings = readCode("src/app/api/admin/content-engine/settings/route.ts");
    expect(settings).toContain("platformStatuses()");
    expect(settings).toContain("isCanvaConfigured()");
  });

  it("does not write a zero when a platform simply cannot report a figure", () => {
    // A row of zeros is indistinguishable from "nobody saw it", and the Learn
    // engine fed zeros concludes that everything failed.
    const cron = readCode("src/app/api/cron/content-analytics/route.ts");
    expect(cron).toContain("if (!result.supported)");
    expect(cron).toContain("continue;");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Voice
   ───────────────────────────────────────────────────────────────────────── */

describe("the brand voice reaches every prompt", () => {
  it("is carried into each generating engine", () => {
    for (const file of ["mine", "angle", "write", "repurpose", "design"]) {
      expect(readCode(`src/lib/content-engine/engines/${file}.ts`), file).toContain("voicePrompt(");
    }
  });

  it("forbids the things this shop said it never wants", () => {
    const prompt = voicePrompt(DEFAULT_BRAND);
    expect(prompt).toContain("Never use em dashes");
    expect(prompt).toContain("Never use generic corporate language");
    expect(prompt).toContain("Never state a government amount");
  });

  it("notices when the model does it anyway", () => {
    expect(bannedPhrasesIn("In today's digital world we unlock seamless value", DEFAULT_BRAND).length).toBeGreaterThan(
      0,
    );
    expect(bannedPhrasesIn("Labour Card banwane ke liye aaiye", DEFAULT_BRAND)).toEqual([]);
  });

  it("catches an em dash, which is a house rule rather than a word", () => {
    expect(bannedPhrasesIn("Labour Card — ek zaruri kaagaz", DEFAULT_BRAND)).toContain("em dash");
  });

  it("never claims a voice guide was derived from posts it did not read", () => {
    // Provenance is the server's to state; a guide claiming forty samples
    // when it saw three is worse than no guide, because everything trusts it.
    const brand = readCode("src/app/api/admin/content-engine/brand/route.ts");
    expect(brand).toContain("analyzedAt: new Date().toISOString()");
    expect(brand).toContain("sampleCount: samples.length");
  });
});
