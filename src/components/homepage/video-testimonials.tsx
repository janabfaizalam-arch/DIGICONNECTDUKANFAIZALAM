import Image from "next/image";
import { Quote, Star } from "lucide-react";

import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";
import {
  averageRating,
  toEmbedUrl,
  type HomepageTestimonial,
} from "@/lib/homepage/testimonials";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          aria-hidden="true"
          className={`h-3.5 w-3.5 ${
            value <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

function Initial({ name }: { name: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/**
 * Customer testimonials — video and text in one ordered rail.
 *
 * Renders nothing when there is no approved content: an empty testimonial
 * section reads worse than no section, and stock or invented reviews are not
 * an option.
 */
export function VideoTestimonials({ testimonials }: { testimonials?: HomepageTestimonial[] } = {}) {
  const items = testimonials ?? [];
  if (!items.length) return null;

  const videos = items.filter((item) => toEmbedUrl(item.video_url));
  const quotes = items.filter((item) => !toEmbedUrl(item.video_url));
  const average = averageRating(items);

  return (
    <HomepageSection id="testimonials">
      <HomepageSectionHeader
        eyebrow="Real customers"
        title="What people say after using DigiConnect"
        description={
          average !== null
            ? `Average ${average} out of 5 across ${items.length} verified ${items.length === 1 ? "review" : "reviews"}.`
            : "Reviews from customers who agreed to share their experience."
        }
      />

      {videos.length > 0 && (
        <div className="-mx-4 mb-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {videos.map((item) => {
            const embed = toEmbedUrl(item.video_url);
            return (
              <figure
                key={item.id}
                className="w-[280px] shrink-0 snap-start overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm sm:w-[320px]"
              >
                <div className="relative aspect-[9/12] bg-slate-900">
                  <iframe
                    src={embed ?? undefined}
                    title={`${item.customer_name} — customer testimonial`}
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </div>
                <figcaption className="flex items-center gap-3 p-4">
                  {item.photo_url ? (
                    <Image
                      src={item.photo_url}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <Initial name={item.customer_name} />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{item.customer_name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {[item.customer_location, item.service_label].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      {quotes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quotes.map((item) => (
            <figure
              key={item.id}
              className="group relative flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <Quote className="h-6 w-6 text-blue-200" aria-hidden="true" />
              <Stars rating={item.rating} />
              <blockquote className="flex-1 text-[15px] leading-relaxed text-slate-700">
                {item.review_text}
              </blockquote>
              <figcaption className="flex items-center gap-3 border-t border-slate-100 pt-3">
                {item.photo_url ? (
                  <Image
                    src={item.photo_url}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <Initial name={item.customer_name} />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{item.customer_name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[item.customer_location, item.service_label].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </HomepageSection>
  );
}
