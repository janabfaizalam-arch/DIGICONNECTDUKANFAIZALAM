import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";
import { draftServiceCopy, normalizeServiceCopy } from "@/lib/ai/service-copy";

const lib = readCode("src/lib/ai/service-copy.ts");
const route = readCode("src/app/api/admin/agent-services/ai-draft/route.ts");
const manager = readCode("src/components/admin/admin-agent-services-manager.tsx");

/* ─────────────────────────────────────────────────────────────────────────
   The key never reaches a browser
   ───────────────────────────────────────────────────────────────────────── */

describe("the API key stays on the server", () => {
  it("is read only inside the server-only module", () => {
    expect(lib).toContain('import "server-only"');
    expect(lib).toContain("process.env.GEMINI_API_KEY");

    for (const [name, file] of [
      ["the API route", route],
      ["the admin form", manager],
    ] as const) {
      expect(file, `${name} reads the key directly`).not.toContain("GEMINI_API_KEY");
    }
  });

  it("reaches Gemini through that module and nowhere else", () => {
    expect(route).toContain('from "@/lib/ai/service-copy"');
    for (const file of [route, manager]) {
      expect(file).not.toContain("GoogleGenAI");
      expect(file).not.toContain("generativelanguage.googleapis.com");
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Drafting is a draft, not a write
   ───────────────────────────────────────────────────────────────────────── */

describe("the endpoint suggests and never saves", () => {
  it("does not touch the database", () => {
    // A drafting endpoint that could write is a drafting endpoint that can
    // overwrite a live catalogue entry from a button press.
    expect(route).not.toContain("getSupabaseAdmin");
    expect(route).not.toContain("supabase");
  });

  it("is closed to anyone who is not an admin", () => {
    expect(route).toContain("isAdminRole");
    expect(route).toContain("status: 403");
  });

  it("is rate limited, so a stuck button cannot spend the quota", () => {
    expect(route).toContain("checkRateLimit");
    expect(route).toContain("rateLimitResponse");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   What the admin reads is never what the server saw
   ───────────────────────────────────────────────────────────────────────── */

describe("upstream errors are translated, not forwarded", () => {
  it("classifies the failure rather than flattening it", () => {
    // The library lets the raw error travel so the route can tell a bad key
    // from a quota from a timeout; rewrapping it in the library would lose
    // that, and every failure would read as "try again".
    expect(route).toContain("classify(caught)");
    expect(lib).not.toContain("catch (caught)");
  });

  it("redacts before logging and sends only the sentence", () => {
    expect(route).toContain("redactSecrets");
    const body = route.slice(route.indexOf("catch (caught)"));
    expect(body).toContain("MESSAGES[failure]");
    // The caught error itself must not be spread into the response body.
    expect(body).not.toMatch(/NextResponse\.json\(\s*\{[^}]*caught/);
  });

  it("has a message and a status for every failure code", () => {
    const codes = [
      "not_configured",
      "bad_key",
      "rate_limited",
      "model_unavailable",
      "timeout",
      "blocked",
      "no_image",
      "upstream",
    ];
    const messages = route.slice(route.indexOf("const MESSAGES"), route.indexOf("const STATUS"));
    const statuses = route.slice(route.indexOf("const STATUS"), route.indexOf("export async function POST"));
    for (const code of codes) {
      expect(messages, `${code} has no message`).toContain(`${code}:`);
      expect(statuses, `${code} has no status`).toContain(`${code}:`);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The model is told not to invent the things that cost a customer money
   ───────────────────────────────────────────────────────────────────────── */

describe("the prompt guards the facts that matter", () => {
  it("forbids inventing fees, deadlines and penalties", () => {
    const rules = lib.slice(lib.indexOf("const SYSTEM_RULES"), lib.indexOf("export type ServiceCopyDraft"));
    expect(rules).toMatch(/government fee/i);
    expect(rules).toMatch(/deadline/i);
    expect(rules).toMatch(/leave it out/i);
  });

  it("passes the shop's price as context, never as something to restate", () => {
    expect(lib).toContain("Context only.");
    const rules = lib.slice(lib.indexOf("const SYSTEM_RULES"), lib.indexOf("export type ServiceCopyDraft"));
    expect(rules).toMatch(/never invent the shop's own price/i);
  });

  it("asks for a schema rather than for JSON in prose", () => {
    expect(lib).toContain("responseSchema");
    expect(lib).toContain('responseMimeType: "application/json"');
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Normalising whatever came back
   ───────────────────────────────────────────────────────────────────────── */

describe("normalizeServiceCopy", () => {
  it("returns every field as a string, whatever arrived", () => {
    const draft = normalizeServiceCopy({ description: 42, eligibility: null });
    expect(draft.description).toBe("");
    expect(draft.eligibility).toBe("");
    expect(draft.required_documents).toBe("");
    expect(draft.faq).toEqual([]);
  });

  it("survives a non-object", () => {
    for (const input of [null, undefined, "text", 7, []]) {
      expect(() => normalizeServiceCopy(input)).not.toThrow();
      expect(normalizeServiceCopy(input).description).toBe("");
    }
  });

  it("trims, and drops half-written FAQ entries", () => {
    const draft = normalizeServiceCopy({
      description: "  A PAN card application.  ",
      faq: [
        { question: " How long? ", answer: " About a week. " },
        { question: "No answer" },
        { answer: "No question" },
        "not an object",
      ],
    });
    expect(draft.description).toBe("A PAN card application.");
    expect(draft.faq).toEqual([{ question: "How long?", answer: "About a week." }]);
  });

  it("caps the FAQ, so one response cannot fill the form with twenty rows", () => {
    const faq = Array.from({ length: 20 }, (_, i) => ({ question: `Q${i}`, answer: `A${i}` }));
    expect(normalizeServiceCopy({ description: "x", faq }).faq).toHaveLength(5);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The button in the form
   ───────────────────────────────────────────────────────────────────────── */

describe("the admin keeps what they typed", () => {
  it("fills blank fields only", () => {
    // The whole safety of the button is this condition: a field that already
    // has something in it is left alone, so pressing it out of curiosity on a
    // finished entry cannot destroy the wording.
    expect(manager).toContain("if (value && !next[key].trim())");
    expect(manager).toContain("if (suggestion.faq?.length && !next.faq.length)");
  });

  it("says so on the button, in the words the admin reads", () => {
    expect(manager).toContain("Sirf khaali fields bharta hai");
  });

  it("refuses to call without a service name", () => {
    expect(manager).toContain("Pehle service ka naam likhiye.");
    expect(manager).toContain("disabled={drafting || !draft.title.trim()}");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Without a key
   ───────────────────────────────────────────────────────────────────────── */

describe("a deployment with no key", () => {
  it("fails as not_configured, without naming the variable", async () => {
    const previous = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      await expect(draftServiceCopy({ title: "PAN Card" })).rejects.toMatchObject({
        failure: "not_configured",
      });
      // The admin is told the feature is off, not which environment variable
      // is missing -- that detail belongs in the server log.
      await draftServiceCopy({ title: "PAN Card" }).catch((error: unknown) => {
        expect(String((error as Error).message)).not.toContain("GEMINI_API_KEY");
      });
    } finally {
      if (previous === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = previous;
    }
  });

  it("refuses an empty service name before it reaches the network", async () => {
    await expect(draftServiceCopy({ title: "   " })).rejects.toThrow(/service name/i);
  });
});
