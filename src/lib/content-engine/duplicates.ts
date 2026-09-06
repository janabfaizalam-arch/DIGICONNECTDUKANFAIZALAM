/**
 * Have we said this already?
 *
 * The mine engine runs every Monday against the same service catalogue and
 * the same government topics, so left alone it would propose "Labour Card ke
 * fayde" every week until the account looked like a stuck record. Two checks
 * stop that: ideas are compared against what has been published recently,
 * and hooks are compared against every hook already used.
 *
 * Deliberately not a model call. Similarity of short marketing text is a
 * problem a token comparison answers well enough, and it answers instantly
 * and for free — which matters when it runs across a few hundred rows on
 * every mine.
 */

/**
 * Words that carry no signal for this business.
 *
 * The English stop words are the usual ones. The Hindi and Hinglish ones are
 * the ones that show up in every second caption here — without them, "aapke
 * liye ye jaruri hai" matches "aapke liye ye zaruri hai" at 100% and two
 * genuinely different posts get called duplicates.
 */
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "is", "are", "was", "how", "what",
  "your", "you", "with", "this", "that", "from", "at", "by", "it", "be", "can", "will", "do",
  "ke", "ka", "ki", "ko", "se", "me", "mein", "hai", "hain", "ho", "ye", "yeh", "wo", "woh", "aur",
  "ek", "par", "ya", "kya", "aap", "aapke", "aapki", "apne", "liye", "kaise", "jo", "bhi", "nahi",
  "kar", "karna", "hoga", "hogi", "raha", "rahe", "gaya", "gayi",
]);

export function normalizeText(text: string): string {
  return (text ?? "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#@]\w+/g, " ")
    /*
      `\p{M}` matters here. Devanagari vowel signs and the virama are combining
      marks, not letters, so a class of letters and numbers alone deletes them
      — and "श्रमिक" becomes three fragments too short to survive the token
      filter. A Hindi post would then match every other Hindi post at zero,
      which is the opposite of what this module is for.
    */
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Overlap between two pieces of text, 0 to 1.
 *
 * Jaccard on meaningful tokens. Word order is ignored on purpose: "Labour
 * Card banwane ke documents" and "documents for Labour Card" are the same
 * post, and a measure that says otherwise is no use here.
 */
export function similarity(a: string, b: string): number {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (!left.size || !right.size) return 0;

  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / (left.size + right.size - shared);
}

/**
 * Where the line sits.
 *
 * 0.6 catches a rephrasing and lets a genuinely different angle on the same
 * scheme through, which is what you want: "Labour Card ke 5 fayde" and
 * "Labour Card renewal ki last date" are both about Labour Card and are not
 * the same post.
 */
export const DUPLICATE_THRESHOLD = 0.6;

/** A hook is judged more strictly. Two near-identical openers read as lazy. */
export const HOOK_DUPLICATE_THRESHOLD = 0.5;

export type DuplicateMatch<T> = { item: T; score: number };

export function findDuplicate<T>(
  candidate: string,
  existing: T[],
  textOf: (item: T) => string,
  threshold = DUPLICATE_THRESHOLD,
): DuplicateMatch<T> | null {
  let best: DuplicateMatch<T> | null = null;
  for (const item of existing) {
    const score = similarity(candidate, textOf(item));
    if (score >= threshold && (!best || score > best.score)) best = { item, score };
  }
  return best;
}

/** Drop anything too close to what already exists, or to a sibling in the batch. */
export function dedupe<T>(
  candidates: T[],
  existing: T[],
  textOf: (item: T) => string,
  threshold = DUPLICATE_THRESHOLD,
): { kept: T[]; dropped: DuplicateMatch<T>[] } {
  const kept: T[] = [];
  const dropped: DuplicateMatch<T>[] = [];

  for (const candidate of candidates) {
    const match =
      findDuplicate(textOf(candidate), existing, textOf, threshold) ??
      findDuplicate(textOf(candidate), kept, textOf, threshold);
    if (match) dropped.push({ item: candidate, score: match.score });
    else kept.push(candidate);
  }

  return { kept, dropped };
}

/**
 * How fresh a hook is against the ones already used, as a 0–10 score.
 *
 * The angle engine puts this on every hook it proposes, so the admin sees
 * "we have opened a post this way three times this month" rather than having
 * to remember it.
 */
export function freshnessAgainst(hook: string, usedHooks: string[]): number {
  if (!usedHooks.length) return 10;
  const closest = usedHooks.reduce((worst, used) => Math.max(worst, similarity(hook, used)), 0);
  return Math.round((1 - closest) * 10);
}
