import "server-only";

import { z } from "zod";

import { brandName } from "@/lib/marketing-agents/config";
import { generateImage, generateJson } from "@/lib/marketing-agents/llm";
import type { CreativeBrief } from "@/lib/marketing-agents/prompt-agent";
import type { ResearchBrief } from "@/lib/marketing-agents/research-agent";
import { serviceFacts } from "@/lib/marketing-agents/research-agent";
import type { ServiceItem } from "@/lib/services-data";

/**
 * Agent 3 — Post maker.
 *
 * Writes a native post for each platform from the creative brief, a full
 * blog article for the website, and draws the poster. The article matters as
 * much as the posts: a social post is seen for a day, but an article that
 * answers a question people search keeps bringing visitors from Google for
 * months.
 */

export const postsSchema = z.object({
  facebook: z.string().min(40),
  instagram: z.string().min(40),
  threads: z.string().min(20),
  x: z.string().min(20),
  linkedin: z.string().min(40),
  telegram: z.string().min(20),
  pinterestTitle: z.string().min(5),
  pinterestDescription: z.string().min(20),
  hashtags: z.array(z.string()).min(3).max(20),
  article: z.object({
    title: z.string().min(10).max(120),
    seoTitle: z.string().min(10).max(70),
    seoDescription: z.string().min(50).max(170),
    excerpt: z.string().min(30).max(300),
    content: z.string().min(800),
    keywords: z.array(z.string()).min(3).max(12),
  }),
});

export type GeneratedPosts = z.infer<typeof postsSchema>;

const SYSTEM = `You are the social media copywriter for {brand}, a trusted Indian digital
service centre. You write in natural Hinglish (Roman script) unless told otherwise.

Every post:
- Opens with the hook.
- Uses short lines and 2–4 fitting emojis, not more.
- Gives real value (a tip, a document list, a mistake to avoid) so people save and share it.
- Ends with the call to action to visit the website. Do NOT write any URL — the link is added automatically.
- Do NOT write hashtags inside the posts — they are added automatically.
- Is honest: we are a private service centre that helps people apply; never claim to be the
  government, never guarantee approval, only use facts from the research.

Respond with ONLY a JSON object.`;

export async function runPostAgent(input: {
  service: ServiceItem;
  research: ResearchBrief;
  creative: CreativeBrief;
}): Promise<GeneratedPosts> {
  const prompt = `Service facts:
${serviceFacts(input.service)}

Research (only use these facts):
${JSON.stringify({ painPoints: input.research.painPoints, currentFacts: input.research.currentFacts, searchQuestions: input.research.searchQuestions, urgency: input.research.urgency }, null, 2)}

Creative brief:
${JSON.stringify(input.creative, null, 2)}

Copywriter instructions from the creative director:
${input.creative.copyPrompt}

Write today's content and return JSON:
{
  "facebook": "150-250 words, storytelling, value + CTA",
  "instagram": "120-200 words, very scannable with line breaks, end with 'Link bio mein / website par jaayein'",
  "threads": "under 350 characters, conversational",
  "x": "under 200 characters, punchy",
  "linkedin": "120-200 words in simple professional English, for small business owners",
  "telegram": "under 700 characters, a quick useful update",
  "pinterestTitle": "under 90 characters, keyword rich",
  "pinterestDescription": "under 400 characters, keyword rich",
  "hashtags": ["12-15 relevant hashtags without #, mix of Hindi-belt and English, include the brand"],
  "article": {
    "title": "a blog headline that matches what people search on Google",
    "seoTitle": "under 60 characters",
    "seoDescription": "140-160 characters",
    "excerpt": "2 sentences",
    "content": "900-1400 words in simple Hinglish. Plain text only — no markdown symbols. Put each heading on its own line. Cover: what it is, who needs it, documents list, step-by-step process, common mistakes, answers to the searched questions, and finish with how ${brandName()} can do it for them with a line inviting them to apply on our website.",
    "keywords": ["SEO keywords"]
  }
}`;

  const { data } = await generateJson({
    agent: "post",
    system: SYSTEM.replace("{brand}", brandName()),
    prompt,
    schema: postsSchema,
    temperature: 0.85,
  });
  return data;
}

export async function runPosterAgent(creative: CreativeBrief) {
  const prompt = `${creative.imagePrompt}

Print this headline on the poster in large, bold, perfectly spelled letters: "${creative.imageHeadline}".
Print "${brandName()}" small at the bottom.
Square 1:1 format, high contrast, easy to read on a phone. No other text, no watermarks,
no government emblems, no bank logos, no readable ID numbers.`;
  return generateImage(prompt);
}
