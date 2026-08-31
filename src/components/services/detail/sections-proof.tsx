"use client";

import Image from "next/image";
import { Quote, Star, Trophy } from "lucide-react";

import { ServiceCard, ServiceSection } from "@/components/services/shell";
import type { ServiceDetail } from "@/lib/services/detail-blueprint";

/* ─────────────────────────────────────────────────────────────────────────
   13 — Reviews
   ───────────────────────────────────────────────────────────────────────── */

/**
 * What customers wrote.
 *
 * No reviews, no band. This used to render regardless, under five filled stars
 * on services nobody had reviewed — a rating no customer had given. An empty
 * reviews section is not a gap to fill with something; it is simply a service
 * that has not been reviewed yet.
 */
export function ServiceReviewsSection({ detail }: { detail: ServiceDetail }) {
  if (!detail.reviews.length) return null;

  return (
    <ServiceSection id="reviews" surface="sky" eyebrow="Reviews" title="What customers said">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {detail.reviews.slice(0, 6).map((review) => (
          <li key={`${review.name}-${review.text.slice(0, 24)}`}>
            <ServiceCard className="flex h-full flex-col p-5 sm:p-6">
              <Quote className="h-6 w-6 shrink-0 text-[var(--dc-flame)]/45" aria-hidden="true" />
              <p className="mt-3 grow text-[13px] font-medium leading-[1.65] text-[var(--dc-body)]">
                {review.text}
              </p>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--dc-ink)]/8 pt-3">
                <p className="min-w-0 text-[13px] font-extrabold text-[var(--dc-ink)]">
                  {review.name}
                  {review.location ? (
                    <span className="block text-[11.5px] font-semibold text-[var(--dc-body)]">
                      {review.location}
                    </span>
                  ) : null}
                </p>
                {/* Stars only where the customer actually gave one. */}
                {review.rating ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-extrabold text-[var(--dc-ink)]">
                    <Star className="h-4 w-4 fill-[var(--dc-amber)] text-[var(--dc-amber)]" aria-hidden="true" />
                    {review.rating}
                  </span>
                ) : null}
              </div>
            </ServiceCard>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   14 — Ratings / stats
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The average rating, and only where there is one to average.
 *
 * Both numbers here are counted from `service_testimonials` rows: the mean of
 * the ratings customers gave, and how many gave one. Nothing is rounded up,
 * nothing is padded, and a service with no rated reviews shows no band rather
 * than a default 4.8.
 */
export function ServiceRatingSection({ detail }: { detail: ServiceDetail }) {
  const rating = detail.rating;
  if (!rating) return null;

  const filled = Math.round(rating.average);

  return (
    <ServiceSection id="rating" surface="white" wash="none" className="!py-7 sm:!py-10">
      <ServiceCard className="mx-auto flex max-w-md flex-col items-center p-6 text-center sm:p-8">
        <p className="text-[2.4rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--dc-ink)]">
          {rating.average.toFixed(1)}
        </p>
        <div className="mt-2 flex items-center gap-0.5" role="img" aria-label={`${rating.average} out of 5`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-5 w-5 ${
                star <= filled ? "fill-[var(--dc-amber)] text-[var(--dc-amber)]" : "text-[var(--dc-ink)]/20"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
        <p className="mt-2.5 text-[12.5px] font-semibold text-[var(--dc-body)]">
          Averaged from {rating.count} {rating.count === 1 ? "rating" : "ratings"} left for this service.
        </p>
      </ServiceCard>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   15 — Photos
   ───────────────────────────────────────────────────────────────────────── */

export function ServicePhotosSection({ detail }: { detail: ServiceDetail }) {
  if (!detail.photos.length) return null;

  return (
    <ServiceSection id="photos" surface="sky" eyebrow="Gallery" title="Photos">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {detail.photos.slice(0, 9).map((photo) => (
          <li key={photo.src}>
            <figure className="lg-card relative aspect-[4/3] w-full overflow-hidden">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
            </figure>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   16 — Videos
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Embedded video.
 *
 * `loading="lazy"` on every frame: a service page with three YouTube embeds
 * that all initialise on load is a page that takes several seconds to become
 * interactive on a mid-range Android phone.
 */
export function ServiceVideosSection({ detail }: { detail: ServiceDetail }) {
  if (!detail.videos.length) return null;

  return (
    <ServiceSection id="videos" surface="white" eyebrow="Watch" title="Videos">
      <ul className={`grid gap-3 ${detail.videos.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {detail.videos.slice(0, 4).map((url) => (
          <li key={url}>
            <div className="lg-card overflow-hidden">
              <iframe
                src={url}
                title={`${detail.service.title} video`}
                className="aspect-video w-full border-0"
                loading="lazy"
                allowFullScreen
              />
            </div>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   17 — Success stories
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Longer than a review: a case somebody wrote up.
 *
 * Administrator-written only. There is no fallback and no seeded example,
 * because a "success story" that the business did not write is a fiction with
 * a customer's name on it.
 */
export function ServiceSuccessStoriesSection({ detail }: { detail: ServiceDetail }) {
  if (!detail.successStories.length) return null;

  return (
    <ServiceSection id="success-stories" surface="sky" eyebrow="Case notes" title="Success stories">
      <ul className="grid gap-3 sm:grid-cols-2">
        {detail.successStories.slice(0, 4).map((story) => (
          <li key={story.text.slice(0, 40)}>
            <ServiceCard className="h-full p-5 sm:p-6">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-[0.85rem] text-white"
                style={{ background: "var(--dc-grad-flame)" }}
              >
                <Trophy className="h-5 w-5" aria-hidden="true" />
              </span>
              {story.title ? (
                <h3 className="mt-3.5 text-[15px] font-extrabold text-[var(--dc-ink)] sm:text-[16.5px]">
                  {story.title}
                </h3>
              ) : null}
              <p className="mt-2 text-[13px] font-medium leading-[1.65] text-[var(--dc-body)]">{story.text}</p>
            </ServiceCard>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}
