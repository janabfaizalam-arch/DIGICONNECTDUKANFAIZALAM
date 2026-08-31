import type { Article } from "@/lib/articles";
import type {
  DbService,
  DbServiceComparison,
  DbServiceSection,
  DbServiceVariant,
} from "@/lib/services";
import type { ServiceItem } from "@/lib/services-data";

/**
 * The shape of a service page.
 *
 * Every service used to render whatever `service_sections` happened to hold,
 * in whatever order `sort_order` happened to say. Two services in the same
 * category could put pricing before the documents on one page and after the
 * reviews on the next, and a service with no sections at all fell back to a
 * seven-band legacy list that skipped most of what a customer wants to know
 * before paying.
 *
 * So the order is fixed here instead, in one list, and it is the same list for
 * every service. What varies between two services is which slots have content,
 * never where a slot appears — somebody who has read one service page can read
 * any of them.
 *
 * The order is deliberate rather than alphabetical: it answers the questions a
 * customer asks in the order they ask them. What is this, is it for me, what
 * do I get, why you, how does it work, am I eligible, what do I bring, what
 * does it cost — and only then the proof, the reading and the ask.
 */
export const SERVICE_PAGE_BLUEPRINT = [
  "hero",
  "trustBar",
  "quickFacts",
  "overview",
  "whoIsItFor",
  "benefits",
  "whyUs",
  "howItWorks",
  "eligibility",
  "documents",
  "pricing",
  "comparison",
  "reviews",
  "stats",
  "photos",
  "videos",
  "successStories",
  "importantInfo",
  "faqs",
  "relatedBlogs",
  "relatedServices",
  "finalCta",
  "disclaimer",
] as const;

export type ServicePageSlot = (typeof SERVICE_PAGE_BLUEPRINT)[number];

/**
 * The slots that are always on the page.
 *
 * Everything else appears only when there is something real to put in it. A
 * band with a heading and nothing under it reads as a broken page, and filling
 * it with invented copy is worse — so an empty slot is simply absent.
 */
export const ALWAYS_RENDERED: ReadonlySet<ServicePageSlot> = new Set([
  "hero",
  "trustBar",
  "quickFacts",
  "whyUs",
  "pricing",
  "finalCta",
  "disclaimer",
]);

/* ─────────────────────────────────────────────────────────────────────────
   What fills each slot
   ───────────────────────────────────────────────────────────────────────── */

export type ServiceFact = { label: string; value: string };

/**
 * What the service costs, or that it does not say.
 *
 * `priceLabel` falls back to the literal string "Enquiry Now" for anything
 * quoted case by case — a loan file, a consultation — and the hero rendered
 * that at the size of a price, under a caption about government fees being
 * extra. A service that publishes no figure has to say so in words instead of
 * dressing a call to action up as an amount.
 */
export type ServicePriceDisplay = {
  /** Whether the service publishes an actual figure. */
  quoted: boolean;
  display: string;
  strikethrough?: string;
};
export type ServiceReviewCard = { name: string; location?: string; text: string; rating?: number };
export type ServicePhoto = { src: string; alt: string };
export type ServiceStory = { title: string; text: string };
export type ServiceBlogCard = {
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  imageUrl: string | null;
};
export type ServiceLinkCard = {
  title: string;
  slug: string;
  description: string;
  priceLabel: string;
};

export type ServiceDetail = {
  service: ServiceItem;
  heroImage: string | null;
  applyHref: string;
  whatsappHref: string;
  facts: ServiceFact[];
  price: ServicePriceDisplay;
  overview: { title: string; text: string } | null;
  whoIsItFor: { title: string; items: string[] } | null;
  benefits: { title: string; items: string[] } | null;
  howItWorks: { title: string; items: string[] } | null;
  eligibility: { title: string; items: string[] } | null;
  documents: { title: string; items: string[] } | null;
  comparison: DbServiceComparison | null;
  variants: DbServiceVariant[];
  reviews: ServiceReviewCard[];
  /** Only present when real, rated testimonials exist to average. */
  rating: { average: number; count: number } | null;
  photos: ServicePhoto[];
  videos: string[];
  successStories: ServiceStory[];
  importantInfo: { title: string; text: string } | null;
  faqs: { question: string; answer: string }[];
  blogs: ServiceBlogCard[];
  related: ServiceLinkCard[];
};

/* ─────────────────────────────────────────────────────────────────────────
   Reading the CMS
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A JSON column that may not be an array.
 *
 * `jsonb` hands these back as arrays and `text` hands them back as strings,
 * depending on how the column was created. Calling `.map` on the string throws
 * inside the server render and takes the whole page down — which is exactly
 * how the service pages went down once already.
 */
function asStrings(value: unknown): string[] {
  let raw: unknown = value;
  if (typeof raw === "string") {
    const text = raw;
    try {
      raw = JSON.parse(text);
    } catch {
      // Not JSON at all — treat a bare string as a one-item list.
      return text.trim() ? [text.trim()] : [];
    }
  }
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim())).filter(Boolean);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Active sections of a given type, in the administrator's order. */
function sectionsOfType(sections: DbServiceSection[], type: string) {
  return sections.filter((section) => section.is_active && section.section_type === type);
}

/**
 * A list slot, from the CMS if an administrator built one and from the
 * service's own column otherwise.
 *
 * The two are not merged. An administrator who has written a Benefits section
 * has said what the benefits are; quietly appending the seeded column
 * underneath would undo their edit.
 */
function listSlot(
  sections: DbServiceSection[],
  type: string,
  fallbackTitle: string,
  fallbackItems: string[],
) {
  for (const section of sectionsOfType(sections, type)) {
    const items = asStrings(section.content?.items);
    if (items.length) return { title: section.title?.trim() || fallbackTitle, items };
  }
  return fallbackItems.length ? { title: fallbackTitle, items: fallbackItems } : null;
}

function textSlot(
  sections: DbServiceSection[],
  type: string,
  fallbackTitle: string,
  fallbackText: string,
) {
  for (const section of sectionsOfType(sections, type)) {
    const text = asText(section.content?.text);
    if (text) return { title: section.title?.trim() || fallbackTitle, text };
  }
  return fallbackText.trim() ? { title: fallbackTitle, text: fallbackText.trim() } : null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Proof — and what counts as proof
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The rating shown beside the reviews.
 *
 * Averaged from `service_testimonials.rating` and from nothing else. The page
 * used to draw five filled stars above the reviews of a service nobody had
 * reviewed, which is the kind of detail that costs more trust than it buys —
 * so a service with no rated testimonials gets no rating, not a default one.
 */
function ratingFrom(reviews: ServiceReviewCard[]) {
  const rated = reviews.map((review) => review.rating).filter((n): n is number => typeof n === "number" && n > 0);
  if (!rated.length) return null;
  const average = rated.reduce((sum, n) => sum + n, 0) / rated.length;
  return { average: Math.round(average * 10) / 10, count: rated.length };
}

/** Articles worth putting under this service, matched on its own keywords. */
export function pickRelatedArticles(articles: Article[], service: ServiceItem, limit = 3): ServiceBlogCard[] {
  const terms = [
    service.title,
    service.category,
    ...service.seoKeywords,
    ...service.slug.split("-"),
  ]
    .map((term) => String(term ?? "").toLowerCase().trim())
    .filter((term) => term.length > 3);

  const scored = articles
    .map((article) => {
      const haystack = [
        article.title,
        article.excerpt ?? "",
        article.category ?? "",
        // A `text` keywords column arrives as a string, not an array.
        asStrings(article.keywords).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      const score = terms.reduce((total, term) => (haystack.includes(term) ? total + 1 : total), 0);
      return { article, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ article }) => ({
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    category: article.category,
    imageUrl: article.featured_image_url,
  }));
}

/** A label is a price only if there is a number in it. */
function priceFrom(service: ServiceItem): ServicePriceDisplay {
  const label = (service.offerPrice || service.priceLabel || "").trim();
  const quoted = /\d/.test(label);

  return {
    quoted,
    display: quoted ? label : "Price on enquiry",
    strikethrough: quoted && service.oldPrice && service.oldPrice !== label ? service.oldPrice : undefined,
  };
}

/**
 * Other services in this category, as the plain rows the page renders.
 *
 * A `ServiceItem` carries its Lucide `icon` as a React component, and handing
 * one of those to a client component fails serialization and takes the whole
 * page body down with it — silently, with a 200 and an empty `<main>`. So the
 * server narrows to plain data before anything crosses the boundary.
 */
export function toServiceLinkCards(services: ServiceItem[], excludeSlug: string, limit = 6): ServiceLinkCard[] {
  return services
    .filter((service) => service.slug !== excludeSlug)
    .slice(0, limit)
    .map((service) => ({
      title: service.title,
      slug: service.slug,
      description: service.shortDescription,
      priceLabel: service.offerPrice || service.priceLabel,
    }));
}

/* ─────────────────────────────────────────────────────────────────────────
   The resolver
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Gather every slot's content for one service.
 *
 * Pure, and defensive about every field it touches: the row comes from a
 * database an administrator edits, so a column can be null, a JSON array can
 * be a string, and a section can carry a type with nothing in it. Anything
 * unusable resolves to "this slot is empty" and the slot is skipped, because a
 * bad edit must not be able to take a service page off the internet.
 */
export function buildServiceDetail({
  row,
  service,
  blogs = [],
  related = [],
  applyHref,
  whatsappHref,
}: {
  row: DbService;
  service: ServiceItem;
  /** Already narrowed on the server — see `pickRelatedArticles`. */
  blogs?: ServiceBlogCard[];
  /** Already narrowed on the server — see `toServiceLinkCards`. */
  related?: ServiceLinkCard[];
  applyHref: string;
  whatsappHref: string;
}): ServiceDetail {
  const sections = (row.service_sections ?? []).filter((section) => section?.is_active);

  /* Documents and process have first-class tables as well as columns. */
  const documentRows = (row.service_documents_required ?? [])
    .map((doc) => doc?.document_name)
    .filter((name): name is string => Boolean(name));
  const processRows = [...(row.service_process_steps ?? [])]
    .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
    .map((step) => step?.step_title)
    .filter((title): title is string => Boolean(title));

  /* Reviews: the rated testimonials table first, then the service's own column. */
  const testimonials = (row.service_testimonials ?? [])
    .filter((testimonial) => testimonial?.is_active !== false && testimonial?.review_text)
    .map((testimonial) => ({
      name: testimonial.customer_name,
      text: testimonial.review_text,
      rating: typeof testimonial.rating === "number" ? testimonial.rating : undefined,
    }));
  const reviews: ServiceReviewCard[] = testimonials.length
    ? testimonials
    : service.reviews.map((review) => ({ name: review.name, location: review.location, text: review.text }));

  /* Media, split by what it is rather than where it was uploaded. */
  const media = [...(row.service_media ?? [])].sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0));
  const isVideo = (url: string, type: string | null) =>
    (type ?? "").toLowerCase().includes("video") || /\.(mp4|webm|mov)$/i.test(url) || /youtube|youtu\.be|vimeo/i.test(url);

  const photos: ServicePhoto[] = [
    ...media
      .filter((item) => item?.file_url && !isVideo(item.file_url, item.media_type))
      .map((item) => ({ src: item.file_url, alt: item.alt_text || service.title })),
    ...sectionsOfType(sections, "gallery").flatMap((section) =>
      asStrings(section.content?.images).map((src) => ({ src, alt: section.title || service.title })),
    ),
  ];

  const videos = [
    ...media.filter((item) => item?.file_url && isVideo(item.file_url, item.media_type)).map((item) => item.file_url),
    ...sectionsOfType(sections, "video").map((section) => asText(section.content?.url)),
  ].filter(Boolean);

  const successStories: ServiceStory[] = sectionsOfType(sections, "success_stories").flatMap((section) => {
    const raw = Array.isArray(section.content?.items) ? section.content.items : [];
    return raw
      .map((item) => {
        if (item && typeof item === "object") {
          const story = item as { title?: unknown; text?: unknown };
          return { title: asText(story.title), text: asText(story.text) };
        }
        return { title: "", text: asText(item) };
      })
      .filter((story) => story.text);
  });

  /* Facts a customer scans before reading anything. Only what is known. */
  const price = priceFrom(service);

  const facts: ServiceFact[] = [];
  facts.push(price.quoted ? { label: "Our fee", value: price.display } : { label: "Our fee", value: "On enquiry" });
  if (typeof row.tat_hours === "number" && row.tat_hours > 0) {
    facts.push({
      label: "Turnaround",
      value: row.tat_hours >= 24 ? `${Math.round(row.tat_hours / 24)} working days` : `${row.tat_hours} hours`,
    });
  }
  if (service.category) facts.push({ label: "Category", value: service.category });
  const documentSlot = listSlot(sections, "documents", "Documents required", documentRows.length ? documentRows : service.documents);
  if (documentSlot?.items.length) facts.push({ label: "Documents", value: `${documentSlot.items.length} needed` });
  facts.push({ label: "Mode", value: service.ctaType === "apply" ? "Apply online" : "Enquiry first" });

  return {
    service,
    heroImage: row.hero_image_url ?? null,
    applyHref,
    whatsappHref,
    facts,
    price,
    overview: textSlot(sections, "overview", "What this service is", service.overview),
    whoIsItFor: listSlot(sections, "who_is_it_for", "Who this is for", []),
    benefits: listSlot(sections, "benefits", "What you get", service.benefits),
    howItWorks: listSlot(sections, "process", "How it works", processRows.length ? processRows : service.process),
    eligibility: listSlot(sections, "eligibility", "Who can apply", []),
    documents: documentSlot,
    comparison: row.service_comparisons?.[0] ?? null,
    variants: (row.service_variants ?? []).filter((entry) => entry?.is_active !== false),
    reviews,
    rating: ratingFrom(reviews),
    photos,
    videos,
    successStories,
    importantInfo:
      textSlot(sections, "important_info", "Important information", "") ??
      textSlot(sections, "rich_text", `Complete guide to ${service.title}`, service.blogContent),
    faqs: service.faqs.filter((faq) => faq?.question && faq?.answer),
    blogs,
    related: related.filter((item) => item.slug !== service.slug).slice(0, 6),
  };
}
