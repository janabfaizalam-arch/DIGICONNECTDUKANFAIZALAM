import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type HomepageFaq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: boolean;
};

const SELECT = "id, question, answer, category, sort_order, is_active";

/** A missing table means the migration has not been applied yet. */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "");
}

/**
 * Published FAQs for the homepage.
 *
 * Returns an empty list rather than throwing when the table is absent, so the
 * homepage falls back to its built-in questions instead of 500-ing on a
 * deployment where the migration has not been run.
 */
export async function getHomepageFaqs(): Promise<HomepageFaq[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("homepage_faqs")
    .select(SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (!isMissingTable(error)) {
      console.error("[homepage-faqs] load_failed", { code: error.code, error: error.message });
    }
    return [];
  }

  return (data ?? []) as HomepageFaq[];
}

/** All FAQs including inactive ones — admin only. */
export async function listHomepageFaqsForAdmin(): Promise<{ rows: HomepageFaq[]; tableMissing: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { rows: [], tableMissing: false };

  const { data, error } = await supabase
    .from("homepage_faqs")
    .select(SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return { rows: [], tableMissing: isMissingTable(error) };
  }

  return { rows: (data ?? []) as HomepageFaq[], tableMissing: false };
}

/**
 * Group FAQs under their category heading, preserving the order the rows
 * arrived in so `sort_order` drives both the groups and the questions.
 */
export function groupFaqsByCategory(faqs: HomepageFaq[]): Array<{ category: string; items: HomepageFaq[] }> {
  const groups: Array<{ category: string; items: HomepageFaq[] }> = [];

  for (const faq of faqs) {
    const category = faq.category?.trim() || "General";
    const existing = groups.find((group) => group.category === category);
    if (existing) existing.items.push(faq);
    else groups.push({ category, items: [faq] });
  }

  return groups;
}

/**
 * FAQPage structured data.
 *
 * Google only renders the FAQ rich result when every entry has a non-empty
 * question and answer, so incomplete rows are dropped rather than emitted as
 * blanks that would invalidate the whole block.
 */
export function buildFaqJsonLd(faqs: HomepageFaq[]): Record<string, unknown> | null {
  const usable = faqs.filter((faq) => faq.question?.trim() && faq.answer?.trim());
  if (!usable.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: usable.map((faq) => ({
      "@type": "Question",
      name: faq.question.trim(),
      acceptedAnswer: { "@type": "Answer", text: faq.answer.trim() },
    })),
  };
}

