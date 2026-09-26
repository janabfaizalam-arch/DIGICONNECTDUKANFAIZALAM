import "server-only";

import { z } from "zod";

import { brandName } from "@/lib/marketing-agents/config";
import { generateJson } from "@/lib/marketing-agents/llm";
import type { ResearchBrief } from "@/lib/marketing-agents/research-agent";
import { serviceFacts } from "@/lib/marketing-agents/research-agent";
import type { ServiceItem } from "@/lib/services-data";

/**
 * Agent 2 — Prompt writer.
 *
 * Reads the research and decides what today's post is: one angle, one hook,
 * one call to action. Then it writes the two prompts the post agent works
 * from — one for the words and one for the picture. Separating "what to say"
 * from "how to say it on each platform" is what keeps seven posts about the
 * same thing sounding like one campaign rather than seven guesses.
 */

export const creativeSchema = z.object({
  angle: z.string().min(5),
  hook: z.string().min(5),
  keyMessage: z.string().min(5),
  callToAction: z.string().min(3),
  tone: z.string().min(3),
  copyPrompt: z.string().min(40),
  imagePrompt: z.string().min(40),
  imageHeadline: z.string().min(2).max(60),
});

export type CreativeBrief = z.infer<typeof creativeSchema>;

const SYSTEM = `You are the creative director for {brand}, a trusted local digital
service centre in India. You write briefs that turn research into posts that get
clicks from ordinary Indians on their phones.

What works for this audience:
- Hinglish (Hindi in Roman script mixed with simple English), warm and respectful.
- A hook in the first line that names their problem or a real deadline.
- One clear benefit: saves a trip, saves time, done from home or at our counter, expert help.
- One clear action: visit the website link to apply or check documents.
- Honest: we are a private service provider that helps people apply — never imply we are
  the government, never promise approval, never invent deadlines or amounts.

Respond with ONLY a JSON object.`;

export async function runPromptAgent(input: {
  service: ServiceItem;
  research: ResearchBrief;
  recentAngles: string[];
}): Promise<CreativeBrief> {
  const prompt = `Service facts:
${serviceFacts(input.service)}

Research brief:
${JSON.stringify({ ...input.research, sources: undefined }, null, 2)}

Angles already used recently (choose something different):
${input.recentAngles.length ? input.recentAngles.map((a) => `- ${a}`).join("\n") : "- none"}

Pick the single strongest angle for today and return JSON:
{
  "angle": "the idea of today's post in one line",
  "hook": "the scroll-stopping first line, Hinglish, max 12 words",
  "keyMessage": "what the reader must understand",
  "callToAction": "the action, e.g. 'Abhi website par apply karein'",
  "tone": "e.g. helpful, urgent, reassuring",
  "copyPrompt": "detailed instructions for a copywriter writing today's posts: structure, points to cover (only sourced facts), words to use, what to avoid",
  "imagePrompt": "detailed prompt for an AI image model: a clean, bright, modern square social media poster for an Indian audience about this service. Describe scene, people (Indian, everyday), colours (orange #F97316 and deep teal as brand colours, white background areas), layout with space for the headline. No logos of government or banks, no official emblems, no fake documents with readable numbers.",
  "imageHeadline": "max 6 words to print on the poster, Hinglish or English"
}`;

  const { data } = await generateJson({
    agent: "prompt",
    system: SYSTEM.replace("{brand}", brandName()),
    prompt,
    schema: creativeSchema,
    temperature: 0.9,
  });
  return data;
}
