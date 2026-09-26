/**
 * Which service today's post is about.
 *
 * Posting about the same popular service every day teaches followers to
 * scroll past; posting about a random one wastes days on services nobody
 * searches for. The rule: the service that has gone longest without a post
 * wins, featured services count as a few days "older" so they come round
 * more often, and a service never posted about beats everything.
 */

export type ServiceCandidate = {
  slug: string;
  featured: boolean;
};

const FEATURED_HEAD_START_DAYS = 3;
const DAY_MS = 86_400_000;

export function pickServiceForToday(
  candidates: ServiceCandidate[],
  lastPostedAt: Record<string, string | undefined>,
  today: string,
): ServiceCandidate | null {
  if (candidates.length === 0) return null;
  const todayMs = Date.parse(`${today}T00:00:00Z`);

  let best: ServiceCandidate | null = null;
  let bestScore = -Infinity;

  candidates.forEach((candidate, index) => {
    const last = lastPostedAt[candidate.slug];
    const idleDays = last ? Math.max(0, (todayMs - Date.parse(`${last.slice(0, 10)}T00:00:00Z`)) / DAY_MS) : 10_000;
    // The index term only breaks ties, so the catalogue order decides between equals.
    const score = idleDays + (candidate.featured ? FEATURED_HEAD_START_DAYS : 0) - index / 1000;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });

  return best;
}
