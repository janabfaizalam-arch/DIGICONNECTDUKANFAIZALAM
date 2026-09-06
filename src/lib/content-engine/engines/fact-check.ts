import "server-only";

import { generateJson } from "@/lib/content-engine/ai/generate";
import type { FactCheck, VerificationStatus } from "@/lib/content-engine/types";

/**
 * Stage 04 — the one stage that is allowed to stop everything.
 *
 * A model that has been asked to write about a government scheme will supply
 * an amount whether or not it knows one, and it will supply it in the same
 * confident sentence as the parts it does know. That is the failure this
 * stage exists for: not "is the post good" but "which sentences in it are
 * assertions of fact, and which of those has a source".
 *
 * The check is deliberately structured to make the model's own confidence
 * irrelevant. It extracts claims and matches each against the sources it was
 * given. A claim with no matching source is UNVERIFIED, however sure the
 * model sounds, and an UNVERIFIED critical claim blocks publishing until a
 * person decides otherwise.
 */

const SYSTEM = `You are a fact checker for content about Indian government schemes and services.
Your job is NOT to write and NOT to be helpful about missing information. Your job is to separate
what is supported by the supplied sources from what is not.

Rules:
- A claim is VERIFIED only if one of the supplied sources states it. Your own knowledge does not
  verify anything and must never be cited as a source.
- A claim you believe is true but which no supplied source states is UNVERIFIED.
- A claim that contradicts a supplied source is REJECTED.
- A claim a source partly supports, or supports with different wording or an older date, is
  NEEDS_REVIEW.
- Mark a claim critical if a reader acting on it wrongly would lose money, miss a deadline, or make
  a wasted trip to a government office.
Return JSON only.`;

/**
 * The kinds of claim that must never go out unchecked.
 *
 * Used both to tell the model what to look for and, below, to force a claim
 * to critical when the model called it routine. The asymmetry is deliberate:
 * over-marking costs a click, under-marking costs a customer a wasted day.
 */
export const CRITICAL_CLAIM_KINDS = [
  "a scheme's benefit amount or subsidy",
  "who is eligible",
  "which documents are required",
  "a fee or charge",
  "a deadline or last date",
  "a legal or tax requirement",
  "a government rule or procedure",
];

const CRITICAL_MARKERS =
  /(₹|\brs\.?\b|rupees?|\b\d{1,3}(?:,\d{2,3})+\b|\b\d+\s*(lakh|crore|hazaar|thousand)\b|last date|deadline|aakhri tarikh|eligib|patrata|document|dastavez|fee|shulk|percent|%|\bage\b|umar|income limit|aay seema)/i;

export type SourceForCheck = { title: string; url: string; publisher: string; excerpt: string; official: boolean };

/**
 * The post-level verdict.
 *
 * Narrower than `VerificationStatus` on purpose. A single claim can be
 * UNVERIFIED; a post carrying one is NEEDS_REVIEW, because "unverified" is a
 * statement about a sentence and the post-level word has to be one the
 * approval screen and the publishing gate both understand.
 */
export type PostVerdict = "VERIFIED" | "NEEDS_REVIEW" | "REJECTED";

export type FactCheckResult = {
  checks: Omit<FactCheck, "id" | "contentPostId" | "checkedAt">[];
  status: PostVerdict;
  /** True when a critical claim has no source. Blocks automatic publishing. */
  blocking: boolean;
};

type RawCheck = Record<string, unknown>;

function parseChecks(value: unknown): RawCheck[] {
  if (Array.isArray(value)) return value as RawCheck[];
  if (value && typeof value === "object" && Array.isArray((value as { claims?: unknown }).claims)) {
    return (value as { claims: RawCheck[] }).claims;
  }
  throw new Error("Expected an array of claims.");
}

function asStatus(value: unknown): VerificationStatus {
  const upper = String(value ?? "").toUpperCase().replace(/[\s-]/g, "_");
  return (["VERIFIED", "NEEDS_REVIEW", "UNVERIFIED", "REJECTED"] as const).includes(upper as VerificationStatus)
    ? (upper as VerificationStatus)
    : "UNVERIFIED";
}

function asUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function checkFacts(input: {
  content: string;
  topic: string;
  sources: SourceForCheck[];
}): Promise<FactCheckResult> {
  const prompt = [
    `TOPIC: ${input.topic}`,
    "",
    "CONTENT TO CHECK:",
    input.content,
    "",
    input.sources.length ? "SOURCES YOU MAY USE (nothing else counts as a source):" : "NO SOURCES WERE SUPPLIED.",
    ...input.sources.map(
      (source, index) =>
        `[${index + 1}] ${source.title} — ${source.publisher}${source.official ? " (OFFICIAL)" : ""}\n` +
        `    ${source.url}\n    ${source.excerpt}`,
    ),
    input.sources.length
      ? ""
      : "Every factual claim in the content is therefore UNVERIFIED. Say so; do not verify from memory.",
    "",
    "Extract every factual claim in the content. Pay particular attention to:",
    ...CRITICAL_CLAIM_KINDS.map((kind) => `- ${kind}`),
    "",
    "For each claim return:",
    "- claim: the assertion, quoted or closely paraphrased from the content",
    "- verification_status: VERIFIED, NEEDS_REVIEW, UNVERIFIED or REJECTED",
    "- source: which supplied source supports it, by name, or empty if none does",
    "- source_url: that source's URL, or null",
    "- confidence: 0 to 1",
    "- notes: one sentence on what is or is not supported",
    "- critical: true if acting on this wrongly costs money, a deadline or a wasted trip",
    "",
    "Return a JSON array.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const raw = await generateJson<RawCheck[]>({
    task: "fact_check",
    system: SYSTEM,
    prompt,
    parse: parseChecks,
    fresh: true,
    temperature: 0.1,
  });

  const checks = raw
    .map((item) => {
      const claim = String(item.claim ?? "").trim();
      if (!claim) return null;

      const url = asUrl(item.source_url ?? item.sourceUrl);
      let status = asStatus(item.verification_status ?? item.verificationStatus);

      /*
        A claim called VERIFIED with no source is the exact failure this stage
        exists to catch: the model has verified it against itself. Demoted,
        not trusted.
      */
      const supported = Boolean(url) || input.sources.some((source) => source.title && String(item.source ?? "").includes(source.title));
      if (status === "VERIFIED" && !supported) status = "UNVERIFIED";

      const confidence = Number(item.confidence);

      return {
        claim: claim.slice(0, 600),
        source: String(item.source ?? "").trim().slice(0, 200),
        sourceUrl: url,
        verificationStatus: status,
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
        notes: String(item.notes ?? "").trim().slice(0, 600),
        // The model's judgement, widened by ours. Anything carrying a rupee
        // figure, a date or an eligibility word is critical whatever it said.
        critical: Boolean(item.critical) || CRITICAL_MARKERS.test(claim),
      };
    })
    .filter((check): check is NonNullable<typeof check> => check !== null);

  return { checks, ...verdict(checks) };
}

/**
 * The post-level verdict, computed rather than asked for.
 *
 * Asking a model to summarise its own findings invites it to round a set of
 * unverified claims up to "looks fine". These three lines are the rule, and
 * they are the same three lines the approval screen and the publishing gate
 * are reading.
 */
export function verdict(checks: { verificationStatus: VerificationStatus; critical: boolean }[]): {
  status: PostVerdict;
  blocking: boolean;
} {
  if (!checks.length) return { status: "VERIFIED", blocking: false };

  const criticalUnsupported = checks.some(
    (check) => check.critical && check.verificationStatus !== "VERIFIED",
  );
  if (checks.some((check) => check.verificationStatus === "REJECTED")) {
    return { status: "REJECTED", blocking: true };
  }
  if (criticalUnsupported) return { status: "NEEDS_REVIEW", blocking: true };
  if (checks.some((check) => check.verificationStatus !== "VERIFIED")) {
    // Non-critical gaps do not block, but they are not called verified either.
    return { status: "NEEDS_REVIEW", blocking: false };
  }
  return { status: "VERIFIED", blocking: false };
}

/** A government domain, which is what "official source" actually means here. */
export function isOfficialSource(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.endsWith(".gov.in") ||
      host.endsWith(".nic.in") ||
      host.endsWith(".gov") ||
      host.endsWith(".rbi.org.in") ||
      host.endsWith(".epfindia.gov.in")
    );
  } catch {
    return false;
  }
}
