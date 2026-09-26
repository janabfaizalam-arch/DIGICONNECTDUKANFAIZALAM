import "server-only";

import { z } from "zod";

import { brandName } from "@/lib/marketing-agents/config";
import { generateJson, type GroundingSource } from "@/lib/marketing-agents/llm";
import type { ServiceItem } from "@/lib/services-data";

/**
 * Agent 1 — Research.
 *
 * Searches Google for what is happening around today's service right now —
 * deadlines, rule changes, scheme news, the questions people are actually
 * typing — and turns it into a brief. The posts are only as good as this:
 * a post that answers something people are searching for today is the one
 * that gets shared and clicked.
 */

export const researchSchema = z.object({
  audience: z.string().min(3),
  painPoints: z.array(z.string()).min(1).max(8),
  currentFacts: z
    .array(z.object({ fact: z.string(), source: z.string().optional().default("") }))
    .max(8)
    .default([]),
  searchQuestions: z.array(z.string()).min(1).max(10),
  angles: z.array(z.string()).min(1).max(6),
  keywords: z.array(z.string()).min(3).max(15),
  hashtags: z.array(z.string()).min(3).max(20),
  urgency: z.string().optional().default(""),
});

export type ResearchBrief = z.infer<typeof researchSchema> & { sources: GroundingSource[] };

export function serviceFacts(service: ServiceItem) {
  return [
    `Service: ${service.title}`,
    `Category: ${service.category}`,
    `What it is: ${service.shortDescription}`,
    service.overview ? `Overview: ${service.overview.slice(0, 800)}` : "",
    service.benefits.length ? `Benefits: ${service.benefits.slice(0, 6).join("; ")}` : "",
    service.documents.length ? `Documents needed: ${service.documents.slice(0, 8).join("; ")}` : "",
    service.process.length ? `Process: ${service.process.slice(0, 6).join(" → ")}` : "",
    service.amount > 0 ? `Our fee: ₹${service.amount}` : `Our fee: ${service.priceLabel}`,
    service.faqs.length ? `FAQs: ${service.faqs.slice(0, 4).map((f) => f.question).join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM = `You are a market researcher for {brand}, an Indian digital seva kendra
(online service centre) that helps ordinary people — shopkeepers, farmers, workers,
students, small business owners — complete government and financial paperwork
online: PAN, GST, ITR, labour card, loans, insurance, certificates and similar.

Research using Google Search. Focus on India and on what is true today.
Rules:
- Only state a date, deadline, fee, rule or scheme amount if a search result supports it,
  and give that result's site as its source. If you are not sure, leave it out.
- Never invent statistics, government announcements or deadlines.
- Think about the real person: what worries them, what they search, in simple words.
- Respond with ONLY a JSON object, no other text.`;

export async function runResearchAgent(input: { service: ServiceItem; today: string }): Promise<ResearchBrief> {
  const prompt = `Today is ${input.today}.

Research this service for a social media post today:
${serviceFacts(input.service)}

Find:
1. Any news, deadline, rule change or government update about this in India in the last 60 days.
2. The questions people are searching on Google about it right now (in Hindi/Hinglish/English).
3. The biggest worries or mistakes people make with it.
4. Fresh angles for a post that would make someone stop scrolling and visit our website.

Return JSON with exactly these keys:
{
  "audience": "who needs this most, in one line",
  "painPoints": ["..."],
  "currentFacts": [{"fact": "...", "source": "website name"}],
  "searchQuestions": ["..."],
  "angles": ["..."],
  "keywords": ["SEO keywords people search, Hindi and English"],
  "hashtags": ["without the # sign"],
  "urgency": "a real, sourced reason to act now, or empty string"
}`;

  const { data, sources } = await generateJson({
    agent: "research",
    system: SYSTEM.replace("{brand}", brandName()),
    prompt,
    schema: researchSchema,
    search: true,
    temperature: 0.4,
  });

  return { ...data, sources };
}
