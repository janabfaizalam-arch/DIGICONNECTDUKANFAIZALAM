"use client";

import { ArrowRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";
import { resolveReelSource, safeReelHref, type HomepageReel } from "@/lib/homepage/reels";

/**
 * One reel card.
 *
 * Direct video files autoplay muted while on screen and pause when scrolled
 * away, which is what makes the rail read as reels rather than a video list.
 * Autoplay is muted because every mobile browser blocks sound-on autoplay, and
 * data is only fetched once a card is near the viewport.
 */
function ReelCard({ reel }: { reel: HomepageReel }) {
  const source = resolveReelSource(reel.video_url);
  const href = safeReelHref(reel.cta_href);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio > 0.6),
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || source.kind !== "file") return;

    if (visible) {
      // A rejected play() is normal (reduced-motion, data saver, background
      // tab) and must not surface as an unhandled rejection.
      void video.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    } else {
      video.pause();
      setPlaying(false);
    }
  }, [visible, source.kind]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  return (
    <article
      ref={containerRef}
      className="group relative w-[190px] shrink-0 snap-start overflow-hidden rounded-[22px] bg-[var(--dc-blue-deep)] shadow-[0_16px_36px_-18px_rgba(0,29,95,0.8)] ring-1 ring-white/10 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:shadow-[0_26px_52px_-20px_rgba(0,29,95,0.9)] sm:w-[220px]"
    >
      <div className="relative aspect-[9/16]">
        {source.kind === "file" ? (
          <>
            <video
              ref={videoRef}
              src={source.src}
              poster={reel.poster_url ?? undefined}
              muted={muted}
              loop
              playsInline
              preload="none"
              aria-label={reel.title}
              className="h-full w-full object-cover"
            />

            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause video" : "Play video"}
              className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
            >
              <span className="lg-pill-dark p-3">
                {playing ? (
                  <Pause className="h-5 w-5 text-white" aria-hidden="true" />
                ) : (
                  <Play className="h-5 w-5 text-white" aria-hidden="true" />
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              aria-label={muted ? "Unmute video" : "Mute video"}
              className="lg-pill-dark lg-raise-dark absolute right-2.5 top-2.5 p-2 text-white"
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </>
        ) : source.kind === "embed" ? (
          <iframe
            src={source.src}
            title={reel.title}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : null}

        {/* Legibility scrim — the caption sits over arbitrary user footage. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-white">{reel.title}</h3>
          {reel.caption ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/75">{reel.caption}</p>
          ) : null}

          {href && reel.cta_label ? (
            <Link
              href={href}
              className="pointer-events-auto mt-2 inline-flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[11px] font-bold text-[var(--dc-blue-deep)] transition duration-300 hover:bg-white/90"
            >
              {reel.cta_label}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/**
 * Short vertical videos in a horizontal snap rail.
 *
 * Hidden entirely when there is nothing to show, so an unpopulated CMS leaves
 * no empty band on the homepage.
 */
export function ReelsRail({ reels }: { reels: HomepageReel[] }) {
  if (!reels.length) return null;

  return (
    <HomepageSection id="reels" surface="white">
      <HomepageSectionHeader
        eyebrow="Watch"
        title="Real stories, in 30 seconds"
        description="Short clips from our counters and customers — how a filing actually gets done."
      />

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden">
        {reels.map((reel) => (
          <ReelCard key={reel.id} reel={reel} />
        ))}
      </div>
    </HomepageSection>
  );
}
