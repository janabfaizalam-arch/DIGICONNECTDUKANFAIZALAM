/**
 * The homepage, as a list you can reorder.
 *
 * The page used to be twenty-two components written out in a fixed order in
 * `src/app/page.tsx`. Changing what appeared, or what came first, meant an
 * edit and a deploy — so "homepage customise karna" was never something the
 * shop could do, only something it could ask for.
 *
 * The order and the on/off switch live in the database now, and this file is
 * the catalogue of what can be switched. Each entry says, in the words a shop
 * owner would use, what the band is and where its actual content is edited —
 * because a section's copy lives in the screen that owns it (hero slides in
 * Hero Slides, questions in FAQ & Testimonials) and duplicating that here
 * would give the same content two masters.
 *
 * `id` is written to the database. Renaming one orphans a saved row, so the
 * ids are treated as permanent even where a label later changes.
 */

export type HomepageSectionId =
  | "hero"
  | "quick_actions"
  | "trust_chips"
  | "reels"
  | "trending"
  | "quick_services"
  | "featured_services"
  | "how_it_works"
  | "trust_strip"
  | "track_application"
  | "rewards"
  | "success_stories"
  | "google_reviews"
  | "video_testimonials"
  | "schemes"
  | "knowledge"
  | "faq"
  | "become_partner"
  | "support"
  | "about";

export type HomepageSectionSpec = {
  id: HomepageSectionId;
  /** What the shop owner would call this band. */
  label: string;
  /** One line: what a visitor sees here. */
  blurb: string;
  /**
   * Where its content is edited, when there is somewhere.
   *
   * `null` means the band is written in code and has nothing to fill in — it
   * can be moved or switched off, and that is all. Saying so is better than
   * offering an "Edit" that opens nothing.
   */
  editHref: string | null;
  /**
   * Bands that must stay put.
   *
   * The hero is the first thing on the page and the only thing above the fold;
   * moving it below anything else means a visitor lands on a page with no
   * heading and no search. It can be edited, never reordered or hidden.
   */
  locked?: boolean;
};

/** The page as it ships, top to bottom. A new install starts from this. */
export const HOMEPAGE_SECTIONS: HomepageSectionSpec[] = [
  {
    id: "hero",
    label: "Hero banner",
    blurb: "The big rotating images, the headline and the search box",
    editHref: "/admin/homepage-slides",
    locked: true,
  },
  {
    id: "quick_actions",
    label: "Quick actions",
    blurb: "The row of shortcuts under the hero",
    editHref: null,
  },
  {
    id: "trust_chips",
    label: "Trust chips",
    blurb: "The small reassurance line — secure, tracked, real people",
    editHref: null,
  },
  {
    id: "reels",
    label: "Reels rail",
    blurb: "Short videos scrolling sideways",
    editHref: "/admin/gallery",
  },
  {
    id: "trending",
    label: "Trending now",
    blurb: "The services people are asking for most",
    editHref: "/admin/services",
  },
  {
    id: "quick_services",
    label: "Service grid",
    blurb: "The grid of service tiles by category",
    editHref: "/admin/services",
  },
  {
    id: "featured_services",
    label: "Featured services",
    blurb: "The services you want pushed forward",
    editHref: "/admin/services",
  },
  {
    id: "how_it_works",
    label: "How it works",
    blurb: "The three or four steps of applying",
    editHref: null,
  },
  {
    id: "trust_strip",
    label: "Why trust us",
    blurb: "The band about how filings are handled",
    editHref: null,
  },
  {
    id: "track_application",
    label: "Track your application",
    blurb: "The strip inviting a customer to check their status",
    editHref: null,
  },
  {
    id: "rewards",
    label: "Rewards & cashback",
    blurb: "What a customer earns back on a filing",
    editHref: "/admin/coupons",
  },
  {
    id: "success_stories",
    label: "Success stories",
    blurb: "Recent filings that went through",
    editHref: "/admin/homepage/content",
  },
  {
    id: "google_reviews",
    label: "Google reviews",
    blurb: "Reviews pulled from your Google listing",
    editHref: "/admin/homepage/content",
  },
  {
    id: "video_testimonials",
    label: "Video testimonials",
    blurb: "Customers on camera",
    editHref: "/admin/homepage/content",
  },
  {
    id: "schemes",
    label: "Government schemes",
    blurb: "The schemes hub — PMEGP, Mudra, CM YUVA and the rest",
    editHref: "/admin/services",
  },
  {
    id: "knowledge",
    label: "Knowledge centre",
    blurb: "Guides and articles",
    editHref: "/admin/articles",
  },
  {
    id: "faq",
    label: "Questions",
    blurb: "The frequently asked questions accordion",
    editHref: "/admin/homepage/content",
  },
  {
    id: "become_partner",
    label: "Become a Digi Partner",
    blurb: "The pitch to people who want to sell your services",
    editHref: null,
  },
  {
    id: "support",
    label: "Support",
    blurb: "How to reach you — phone, WhatsApp, hours",
    editHref: "/admin/settings",
  },
  {
    id: "about",
    label: "About RNOS",
    blurb: "Who runs this and what the company is",
    editHref: "/admin/about-page-images",
  },
];

const BY_ID = new Map(HOMEPAGE_SECTIONS.map((section) => [section.id, section]));

export function homepageSection(id: string): HomepageSectionSpec | undefined {
  return BY_ID.get(id as HomepageSectionId);
}

/** One saved row: where a section sits and whether it shows. */
export type HomepageSectionState = {
  id: HomepageSectionId;
  position: number;
  enabled: boolean;
};

/** The default arrangement — every band on, in the order above. */
export function defaultHomepageLayout(): HomepageSectionState[] {
  return HOMEPAGE_SECTIONS.map((section, index) => ({
    id: section.id,
    position: index,
    enabled: true,
  }));
}

/**
 * Merge what the database holds with what the code knows.
 *
 * Deliberately forgiving in both directions, because the two drift: a saved
 * row for a band that has since been deleted is dropped, and a band added in
 * code that nobody has saved a row for appears in its default place rather
 * than vanishing. Neither case should ever produce a blank homepage.
 *
 * A locked band is pinned to its coded position and forced on whatever the
 * row says, so a bad save cannot leave the site with no hero.
 */
export function resolveHomepageLayout(rows: unknown): HomepageSectionState[] {
  const saved = new Map<string, { position: number; enabled: boolean }>();

  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const record = row as { section_id?: unknown; position?: unknown; enabled?: unknown };
      const id = typeof record.section_id === "string" ? record.section_id : "";
      if (!id || !BY_ID.has(id as HomepageSectionId)) continue;
      saved.set(id, {
        position: Number.isFinite(Number(record.position)) ? Number(record.position) : 999,
        enabled: record.enabled !== false,
      });
    }
  }

  return HOMEPAGE_SECTIONS.map((section, index) => {
    const row = saved.get(section.id);
    if (section.locked) return { id: section.id, position: index, enabled: true };
    return {
      id: section.id,
      position: row ? row.position : index,
      enabled: row ? row.enabled : true,
    };
  }).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}
