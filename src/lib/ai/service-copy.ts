import "server-only";

import { GoogleGenAI, Type } from "@google/genai";

import { GeminiError } from "@/lib/ai/gemini";
import { FALLBACK_TEXT_MODEL, pickLatestModel, pinnedTextModel } from "@/lib/marketing-agents/config";

/**
 * Drafting the words for a partner service.
 *
 * Adding a service to the partner catalogue is mostly typing: a description,
 * who is eligible, which documents to collect, how long it takes, and the
 * four questions every partner asks on WhatsApp anyway. None of that is hard
 * to write and all of it is slow, which is why half the catalogue ends up
 * with a one-line description and an empty documents field.
 *
 * So this drafts it from the service name. What comes back is a draft and is
 * treated as one: the admin sees every field filled in the form, edits what is
 * wrong, and saves. Nothing here writes to the database.
 *
 * The key is read at call time from the environment, on the server, and is
 * never returned or logged -- `server-only` above makes an accidental client
 * import a build error rather than a key in a bundle. Error plumbing
 * (`GeminiError`, `classify`, `redactSecrets`) is shared with the photo
 * endpoint; only the model and the prompt differ.
 */

/**
 * Which text model to call.
 *
 * Not a constant. `gemini-2.5-flash` was hard-coded here until the marketing
 * agents hit it in production: Google had retired it for new keys, and every
 * call came back 404. So this asks the key which models it can actually see
 * and takes the newest stable Flash, exactly as those agents do -- the same
 * picker, so a retirement is handled once rather than in two places. The
 * lookup happens once per server instance; a failed lookup falls back to the
 * newest name known at the time of writing.
 *
 * `MARKETING_AGENTS_TEXT_MODEL` pins it, because a deployment that has pinned
 * a model wants that model everywhere, not just in the agents.
 */
let resolvedModel: Promise<string> | null = null;

async function textModel(apiKey: string): Promise<string> {
  const pinned = pinnedTextModel();
  if (pinned) return pinned;

  resolvedModel ??= (async () => {
    const names: string[] = [];
    try {
      const pager = await new GoogleGenAI({ apiKey }).models.list({ config: { pageSize: 200 } });
      for await (const model of pager) {
        if (model.name && (model.supportedActions ?? ["generateContent"]).includes("generateContent")) {
          names.push(model.name);
        }
      }
    } catch {
      // Listing is a convenience, not the job. A key that cannot list can
      // still generate, so fall through to the known name rather than fail.
    }
    return pickLatestModel(names, "text") ?? FALLBACK_TEXT_MODEL;
  })().catch(() => FALLBACK_TEXT_MODEL);

  return resolvedModel;
}

/**
 * How long to wait before giving up.
 *
 * Shorter than the photo timeout because nobody is standing at a counter for
 * this one -- an admin is filling a form and would rather type it themselves
 * than watch a spinner for a minute.
 */
const TIMEOUT_MS = 30_000;

/** Caps, so one call cannot return a page of text into a form field. */
const MAX_TITLE = 120;
const MAX_CATEGORY = 60;
const MAX_FAQ = 5;

/**
 * What the model is told it is doing.
 *
 * Three things matter and all three come from what this catalogue is for. It
 * is read by DC Partners at a counter in India, so the register is plain and
 * the examples are Indian. It is about government and financial filings, where
 * an invented fee or an invented eligibility rule costs a customer a rejected
 * application and a wasted trip -- so the instruction is to leave a field out
 * rather than guess it. And the fee is the shop's to set, never the model's.
 */
const SYSTEM_RULES = `
You write catalogue copy for DigiConnect Dukan, an Indian digital-services
shop. The reader is a DC Partner: a shopkeeper who sells these services to
walk-in customers and needs to know what to collect and what to promise.

Write in plain Indian English, the way a service counter explains things. Short
sentences. No marketing language, no exclamation marks, no "unlock", "seamless"
or "hassle-free". Hindi words that are normal in this context (Aadhaar, PAN,
challan, tehsil) are fine; do not write whole sentences in Hindi.

Accuracy matters more than completeness. These are government and financial
filings, and a wrong eligibility rule or an invented government fee costs a
customer a rejected application. If you are not confident about a specific
number, deadline, fee or legal condition, leave it out and write the general
practice instead. Never state a government fee, a statutory deadline or a
penalty amount as fact unless it is well established and stable.

Never invent the shop's own price. The price is set by the shop and given to
you only as context; do not repeat it as if you decided it, and do not mention
any other rupee amount you are not sure of.
`.trim();

/** The fields this can draft. Everything else on the form is the shop's. */
export type ServiceCopyDraft = {
  description: string;
  eligibility: string;
  required_documents: string;
  processing_time: string;
  instructions: string;
  faq: { question: string; answer: string }[];
};

/**
 * A schema rather than "reply in JSON".
 *
 * Asking a model for JSON in prose gets JSON most of the time; the rest of the
 * time it gets a code fence, an apology, or a trailing comma, and the form is
 * left half-filled with no way to say why.
 */
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description: "Two or three sentences: what the service is and who it is for.",
    },
    eligibility: {
      type: Type.STRING,
      description: "Who can apply. One short line per condition, newline separated.",
    },
    required_documents: {
      type: Type.STRING,
      description: "Documents to collect from the customer, one per line.",
    },
    processing_time: {
      type: Type.STRING,
      description: "A realistic range, e.g. '7 to 15 working days'. Empty if unsure.",
    },
    instructions: {
      type: Type.STRING,
      description: "Notes for the partner at the counter: what to check, what goes wrong.",
    },
    faq: {
      type: Type.ARRAY,
      description: "Up to five questions a customer actually asks.",
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          answer: { type: Type.STRING },
        },
        required: ["question", "answer"],
      },
    },
  },
  required: ["description", "eligibility", "required_documents", "processing_time", "instructions", "faq"],
} as const;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Turn whatever came back into the shape the form expects.
 *
 * The schema makes the response well formed, not sensible: a field can still
 * come back empty, and `faq` can come back longer than asked for. An empty
 * field is a fine answer here -- it means the model declined to guess, which
 * is what it was told to do -- so it is passed through rather than retried.
 */
export function normalizeServiceCopy(raw: unknown): ServiceCopyDraft {
  const row = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const faqRaw = Array.isArray(row.faq) ? row.faq : [];

  return {
    description: text(row.description),
    eligibility: text(row.eligibility),
    required_documents: text(row.required_documents),
    processing_time: text(row.processing_time),
    instructions: text(row.instructions),
    faq: faqRaw
      .map((entry) => {
        const item = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
        return { question: text(item.question), answer: text(item.answer) };
      })
      .filter((entry) => entry.question && entry.answer)
      .slice(0, MAX_FAQ),
  };
}

export type ServiceCopyRequest = {
  title: string;
  category?: string | null;
  /** The shop's price, as context only -- see `SYSTEM_RULES`. */
  customerFee?: number | null;
};

function buildPrompt({ title, category, customerFee }: ServiceCopyRequest): string {
  const lines = [`Service name: ${title.slice(0, MAX_TITLE)}`];
  const cleanCategory = text(category).slice(0, MAX_CATEGORY);
  if (cleanCategory) lines.push(`Category: ${cleanCategory}`);
  if (typeof customerFee === "number" && Number.isFinite(customerFee) && customerFee > 0) {
    lines.push(`The shop charges the customer ₹${Math.round(customerFee)} for this. Context only.`);
  }
  lines.push("", "Draft the catalogue entry for this service.");
  return lines.join("\n");
}

/**
 * Draft the copy for one service.
 *
 * Throws `GeminiError` with a failure code; the route turns that into a
 * sentence. Nothing from the upstream error reaches the caller un-redacted.
 */
export async function draftServiceCopy(request: ServiceCopyRequest): Promise<ServiceCopyDraft> {
  const title = text(request.title);
  if (!title) throw new GeminiError("upstream", "A service name is required.");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Deliberately not "GEMINI_API_KEY is unset" in anything a browser sees.
    throw new GeminiError("not_configured", "AI drafting is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = await textModel(apiKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: buildPrompt({ ...request, title }),
      config: {
        systemInstruction: SYSTEM_RULES,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        // Low, because this is reference copy for a counter, not a creative
        // brief -- the same service name should draft much the same entry.
        temperature: 0.4,
        abortSignal: controller.signal,
      },
    });

    const blocked = response.promptFeedback?.blockReason;
    if (blocked) throw new GeminiError("blocked", `Prompt blocked: ${blocked}`);

    const candidate = response.candidates?.[0];
    if (candidate?.finishReason && !["STOP", "FINISH_REASON_UNSPECIFIED"].includes(candidate.finishReason)) {
      const reason = candidate.finishReason;
      throw new GeminiError(
        reason === "SAFETY" || reason === "PROHIBITED_CONTENT" ? "blocked" : "upstream",
        `Generation stopped: ${reason}`,
      );
    }

    const body = response.text;
    if (!body) throw new GeminiError("blocked", "Gemini returned no text.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new GeminiError("upstream", "Gemini returned something that is not JSON.");
    }

    const draft = normalizeServiceCopy(parsed);
    /* An empty field is a fine answer; an empty draft is not -- the form would
       be left exactly as it was with a success message on top of it. */
    if (!draft.description) throw new GeminiError("blocked", "Gemini returned no description.");
    return draft;
  } finally {
    /* Anything else thrown here travels to the route untouched, which calls
       `classify` on it -- rewrapping it as "upstream" would throw away the
       difference between a bad key, a quota and a timeout. */
    clearTimeout(timer);
  }
}
