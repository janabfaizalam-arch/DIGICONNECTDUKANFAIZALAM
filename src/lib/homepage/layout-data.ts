import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  defaultHomepageLayout,
  resolveHomepageLayout,
  type HomepageSectionState,
} from "@/lib/homepage/sections";

/**
 * The saved homepage arrangement.
 *
 * Every failure resolves to the page as it ships — an unreachable database, a
 * table that does not exist yet, a malformed row. The homepage is the first
 * thing a customer sees; it must never depend on this read succeeding.
 */
export async function getHomepageLayout(): Promise<HomepageSectionState[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return defaultHomepageLayout();

  try {
    const { data, error } = await supabase
      .from("homepage_sections")
      .select("section_id, position, enabled")
      .order("position", { ascending: true });

    if (error || !data) return defaultHomepageLayout();
    return resolveHomepageLayout(data);
  } catch {
    return defaultHomepageLayout();
  }
}

/** The set of ids currently switched on, for a quick `has()` at render time. */
export function enabledSectionIds(layout: HomepageSectionState[]): Set<string> {
  return new Set(layout.filter((section) => section.enabled).map((section) => section.id));
}

/**
 * Replace the whole arrangement in one write.
 *
 * A full replace rather than a diff: the editor always sends the complete
 * list, and a partial update is how an ordering ends up with two sections
 * claiming the same position.
 */
export async function saveHomepageLayout(sections: HomepageSectionState[]): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from("homepage_sections").upsert(
      sections.map((section, index) => ({
        section_id: section.id,
        position: index,
        enabled: section.enabled,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "section_id" },
    );
    return !error;
  } catch {
    return false;
  }
}
