import "server-only";

import { GoogleGenAI } from "@google/genai";

import {
  ExternalError,
  callExternal,
  classifyExternal,
  redact,
} from "@/lib/content-engine/errors";
import {
  MAX_ATTEMPTS,
  TIMEOUT_MS,
  cacheKey,
  modelFor,
  readCache,
  tierFor,
  writeCache,
  type AiTask,
} from "@/lib/content-engine/model-router";

/**
 * Where the content engine talks to a model, and nowhere else.
 *
 * `src/lib/ai/gemini.ts` is the other one, and the split is deliberate: that
 * file edits a customer's photograph and returns an image, this one asks for
 * structured text and returns parsed JSON. Sharing a module would mean the
 * image path carrying JSON-schema machinery it has no use for, and the text
 * path carrying an identity-preservation rule about faces.
 *
 * What they share is the important part. The key is read here, at call time,
 * from `process.env` and is never returned, logged, or put in a response
 * body. `server-only` above turns an accidental import from a client
 * component into a build error rather than an API key in a JavaScript bundle
 * that anybody can read with View Source.
 */

const SERVICE = "gemini";

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * A model was asked for something and did not give it.
 *
 * Separate from `ExternalError` because the fix is different: an outage is
 * waited out, a malformed answer is re-prompted or shown to the admin as
 * "the model returned something unusable" rather than "Instagram is down".
 */
export class AiFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiFormatError";
  }
}

/**
 * Pull the JSON out of whatever came back.
 *
 * Even with a response schema set, models wrap output in a fenced code block
 * often enough that parsing the raw text fails in production and never in a
 * test. Three passes: as-is, unfenced, then the outermost brace-to-brace
 * span.
 */
export function extractJson(text: string): unknown {
  const raw = (text ?? "").trim();
  if (!raw) throw new AiFormatError("The model returned nothing.");

  const attempts = [raw];

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) attempts.push(fenced[1].trim());

  const firstBrace = raw.search(/[[{]/);
  const lastBrace = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  if (firstBrace >= 0 && lastBrace > firstBrace) attempts.push(raw.slice(firstBrace, lastBrace + 1));

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      continue;
    }
  }

  throw new AiFormatError("The model did not return usable JSON.");
}

export type GenerateOptions<T> = {
  task: AiTask;
  /** The system-level framing: who is writing and under what rules. */
  system: string;
  /** The request itself. */
  prompt: string;
  /** Turns the parsed JSON into the shape the caller wants, or throws. */
  parse: (value: unknown) => T;
  /**
   * Skip the cache for a call whose answer should be different every time.
   *
   * "Generate more ideas" pressed twice must not return the same ten ideas
   * out of a cache; a design specification for an unchanged post should.
   */
  fresh?: boolean;
  /** 0–1. Low for scoring and classification, higher for writing. */
  temperature?: number;
};

/**
 * Ask for structured output, get a typed value or a classified failure.
 *
 * Caching, model choice, timeout and retry all come from the router, so the
 * decision about what a task costs is made in one file and honoured here.
 */
export async function generateJson<T>(options: GenerateOptions<T>): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Deliberately not "GEMINI_API_KEY is unset" in anything a browser sees.
    throw new ExternalError(SERVICE, "not_configured", "No model is configured on this deployment.");
  }

  const model = modelFor(options.task);
  const tier = tierFor(options.task);
  const key = cacheKey(options.task, `${model}|${options.system}|${options.prompt}`);

  if (!options.fresh) {
    const hit = readCache<T>(key);
    if (hit !== null) return hit;
  }

  const ai = new GoogleGenAI({ apiKey });

  const text = await callExternal(
    async (signal) => {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: options.prompt }] }],
        config: {
          abortSignal: signal,
          systemInstruction: options.system,
          responseMimeType: "application/json",
          temperature: options.temperature ?? (tier === "fast" ? 0.2 : 0.7),
        },
      });

      const blocked = response.promptFeedback?.blockReason;
      if (blocked) {
        throw new ExternalError(SERVICE, "invalid_content", `Prompt blocked: ${blocked}`);
      }

      const candidate = response.candidates?.[0];
      const finish = candidate?.finishReason;
      if (finish && !["STOP", "FINISH_REASON_UNSPECIFIED"].includes(finish)) {
        throw new ExternalError(
          SERVICE,
          finish === "SAFETY" || finish === "PROHIBITED_CONTENT" ? "invalid_content" : "upstream",
          `Generation stopped: ${finish}`,
        );
      }

      const out = response.text ?? "";
      if (!out.trim()) throw new ExternalError(SERVICE, "upstream", "The model returned an empty answer.");
      return out;
    },
    {
      service: SERVICE,
      operation: options.task,
      timeoutMs: TIMEOUT_MS[tier],
      maxAttempts: MAX_ATTEMPTS[tier],
    },
  );

  let parsed: T;
  try {
    parsed = options.parse(extractJson(text));
  } catch (caught) {
    // The model's raw text can contain anything, including something that
    // looks like a key it hallucinated. Redact before it reaches a log.
    console.warn("[content-engine] unusable model output", {
      task: options.task,
      model,
      detail: redact(caught instanceof Error ? caught.message : String(caught)),
    });
    throw caught instanceof AiFormatError
      ? caught
      : new AiFormatError("The model's answer did not match what this step needs.");
  }

  if (!options.fresh) writeCache(key, parsed);
  return parsed;
}

/** Turn any thrown value into something an API route can safely return. */
export function describeAiFailure(caught: unknown): { failure: string; message: string } {
  if (caught instanceof AiFormatError) {
    return { failure: "invalid_content", message: "The model returned something unusable. Try again." };
  }
  return classifyExternal(caught, SERVICE).toPublic();
}
