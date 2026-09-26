import "server-only";

import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";

import {
  FALLBACK_IMAGE_MODEL,
  FALLBACK_TEXT_MODEL,
  pickLatestModel,
  pinnedImageModel,
  pinnedTextModel,
  redact,
} from "@/lib/marketing-agents/config";

/**
 * The agents' two calls to Gemini: text that comes back as validated JSON,
 * and a picture. Uses the same `GEMINI_API_KEY` as Smart Print.
 */

const TEXT_TIMEOUT_MS = 90_000;
const IMAGE_TIMEOUT_MS = 120_000;

export class AgentError extends Error {
  readonly agent: string;
  constructor(agent: string, message: string) {
    super(redact(message));
    this.name = "AgentError";
    this.agent = agent;
  }
}

function client(agent: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AgentError(agent, "GEMINI_API_KEY is not set.");
  return new GoogleGenAI({ apiKey });
}

/**
 * The model names to use for this run: pinned in the environment, else the
 * newest Flash model the key can see. Looked up once per server instance.
 */
let resolved: Promise<{ text: string; image: string }> | null = null;

export function resolveModels(agent: string): Promise<{ text: string; image: string }> {
  const text = pinnedTextModel();
  const image = pinnedImageModel();
  if (text && image) return Promise.resolve({ text, image });

  resolved ??= (async () => {
    const names: string[] = [];
    try {
      const pager = await client(agent).models.list({ config: { pageSize: 200 } });
      for await (const model of pager) {
        if (model.name && (model.supportedActions ?? ["generateContent"]).includes("generateContent")) {
          names.push(model.name);
        }
      }
    } catch (caught) {
      console.error("[marketing-agents] model list failed", redact(caught instanceof Error ? caught.message : String(caught)));
    }
    return {
      text: pickLatestModel(names, "text") ?? FALLBACK_TEXT_MODEL,
      image: pickLatestModel(names, "image") ?? FALLBACK_IMAGE_MODEL,
    };
  })().catch(() => ({ text: FALLBACK_TEXT_MODEL, image: FALLBACK_IMAGE_MODEL }));

  return resolved.then((found) => ({ text: text ?? found.text, image: image ?? found.image }));
}

/**
 * When Google retires a model it says which one to use instead
 * ("…please update your code to use models/gemini-3.8-flash…"). Returns that
 * name so the call can be retried once rather than failing the whole day.
 */
export function suggestedReplacementModel(message: string): string | null {
  if (!/NOT_FOUND|no longer available|not found|404/i.test(message)) return null;
  return message.match(/use\s+(?:models\/)?(gemini-[\w.-]*\w)/i)?.[1] ?? null;
}

/**
 * Pull the first JSON object out of a model reply.
 *
 * Search grounding cannot be combined with Gemini's JSON response mode, so
 * the research agent's reply is prose that should contain JSON — sometimes
 * fenced, sometimes with a sentence before it. This finds the object.
 */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in the model reply.");
  return JSON.parse(candidate.slice(start, end + 1));
}

export type GroundingSource = { title: string; url: string };

export async function generateJson<T>(input: {
  agent: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  /** Let the model search Google first. */
  search?: boolean;
  temperature?: number;
}): Promise<{ data: T; sources: GroundingSource[] }> {
  const ai = client(input.agent);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEXT_TIMEOUT_MS);

  let model = (await resolveModels(input.agent)).text;
  let lastError = "";
  try {
    // One retry: a malformed JSON reply is usually fine the second time.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: input.prompt }] }],
          config: {
            abortSignal: controller.signal,
            systemInstruction: input.system,
            temperature: input.temperature ?? 0.8,
            ...(input.search
              ? { tools: [{ googleSearch: {} }] }
              : { responseMimeType: "application/json" }),
          },
        });

        const text = response.text ?? "";
        const parsed = input.schema.safeParse(extractJson(text));
        if (!parsed.success) {
          lastError = `Reply did not match the expected shape: ${parsed.error.issues
            .slice(0, 3)
            .map((issue) => `${issue.path.join(".")} ${issue.message}`)
            .join("; ")}`;
          continue;
        }

        const sources: GroundingSource[] = [];
        for (const chunk of response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) {
          if (chunk.web?.uri) sources.push({ title: chunk.web.title ?? chunk.web.uri, url: chunk.web.uri });
        }
        return { data: parsed.data, sources: sources.slice(0, 10) };
      } catch (caught) {
        if (controller.signal.aborted) throw new AgentError(input.agent, "Gemini timed out.");
        lastError = caught instanceof Error ? caught.message : String(caught);
        const replacement = suggestedReplacementModel(lastError);
        if (replacement && replacement !== model) model = replacement;
      }
    }
  } finally {
    clearTimeout(timer);
  }

  throw new AgentError(input.agent, lastError || "Gemini returned nothing usable.");
}

export async function generateImage(prompt: string): Promise<{ bytes: Buffer; mimeType: string }> {
  const ai = client("post");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  let model = (await resolveModels("post")).image;

  try {
    for (let attempt = 0; ; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            abortSignal: controller.signal,
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio: "1:1" },
          },
        });

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          const data = part.inlineData?.data;
          if (data) return { bytes: Buffer.from(data, "base64"), mimeType: part.inlineData?.mimeType ?? "image/png" };
        }
        throw new AgentError("post", "Gemini returned no image.");
      } catch (caught) {
        if (caught instanceof AgentError) throw caught;
        if (controller.signal.aborted) throw new AgentError("post", "Image generation timed out.");
        const message = caught instanceof Error ? caught.message : String(caught);
        const replacement = suggestedReplacementModel(message);
        if (attempt === 0 && replacement && replacement !== model) {
          model = replacement;
          continue;
        }
        throw new AgentError("post", message);
      }
    }
  } finally {
    clearTimeout(timer);
  }
}
