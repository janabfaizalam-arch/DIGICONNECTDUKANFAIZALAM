"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Compass } from "lucide-react";

/**
 * Scroll reveal for every `[data-reveal]` under the homepage root.
 *
 * Only elements that start below the fold are hidden, and only after this has
 * run — so the first screen never waits for script, the page is complete with
 * JavaScript off, and a reveal can never leave content invisible. One shared
 * observer for the whole page rather than one per element.
 */
export function RevealController() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".rl [data-reveal]"));
    const fold = window.innerHeight;
    const pending = nodes.filter((node) => node.getBoundingClientRect().top > fold * 0.92);
    pending.forEach((node) => node.classList.add("rl-pending"));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.remove("rl-pending");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );
    pending.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      pending.forEach((node) => node.classList.remove("rl-pending"));
    };
  }, []);

  return null;
}

type TiltState = "unavailable" | "available" | "on" | "denied";

type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

/**
 * The hero's interactive stage.
 *
 * Pointer position is written to two CSS variables on animation frames, and
 * every layer derives its own offset from them in CSS — so moving the mouse
 * never re-renders React and never touches layout. Motion stops while the
 * stage is off screen or the tab is hidden, and is skipped entirely for
 * reduced-motion visitors. On touch devices tilt is offered, never assumed:
 * it starts only after the visitor taps the button, and iOS's permission
 * prompt is asked from that tap.
 */
export function HeroStage({ children, layers }: { children?: ReactNode; layers: { depth: number; node: ReactNode }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<TiltState>("unavailable");
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setAnimate(!reduce);
    if (reduce) return;

    let frame = 0;
    let tx = 0;
    let ty = 0;
    const write = () => {
      frame = 0;
      el.style.setProperty("--px", tx.toFixed(3));
      el.style.setProperty("--py", ty.toFixed(3));
    };
    const queue = (x: number, y: number) => {
      tx = Math.max(-1, Math.min(1, x));
      ty = Math.max(-1, Math.min(1, y));
      if (!frame) frame = requestAnimationFrame(write);
    };

    const stage = el.closest<HTMLElement>("[data-hero]") ?? el;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch" && !el.contains(event.target as Node)) return;
      const rect = el.getBoundingClientRect();
      queue(((event.clientX - rect.left) / rect.width - 0.5) * 2, ((event.clientY - rect.top) / rect.height - 0.5) * 2);
    };
    const onLeave = () => queue(0, 0);
    stage.addEventListener("pointermove", onPointer, { passive: true });
    stage.addEventListener("pointerleave", onLeave);

    if (!fine && "DeviceOrientationEvent" in window) setTilt("available");

    const visibility = new IntersectionObserver(([entry]) => {
      el.dataset.paused = entry.isIntersecting && !document.hidden ? "false" : "true";
    });
    visibility.observe(el);
    const onHidden = () => {
      el.dataset.paused = document.hidden ? "true" : "false";
    };
    document.addEventListener("visibilitychange", onHidden);

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (el.dataset.tilt !== "on" || el.dataset.paused === "true") return;
      // ±18° of natural hand movement maps to the full range, gently.
      queue(((event.gamma ?? 0) / 18) * 0.7, (((event.beta ?? 45) - 45) / 18) * 0.7);
    };
    window.addEventListener("deviceorientation", onOrientation);

    return () => {
      cancelAnimationFrame(frame);
      stage.removeEventListener("pointermove", onPointer);
      stage.removeEventListener("pointerleave", onLeave);
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, []);

  const enableTilt = async () => {
    const el = ref.current;
    if (!el) return;
    if (tilt === "on") {
      el.dataset.tilt = "off";
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
      setTilt("available");
      return;
    }
    const ctor = window.DeviceOrientationEvent as OrientationCtor;
    try {
      if (typeof ctor.requestPermission === "function") {
        const answer = await ctor.requestPermission();
        if (answer !== "granted") {
          setTilt("denied");
          return;
        }
      }
      el.dataset.tilt = "on";
      setTilt("on");
    } catch {
      setTilt("denied");
    }
  };

  return (
    <div ref={ref} className="rl-scene" data-animate={animate ? "true" : "false"} data-paused="false">
      <div className="rl-scene__tilt">
        {layers.map((layer, index) => (
          <div key={index} className="rl-scene__layer" style={{ "--depth": layer.depth } as CSSProperties}>
            {layer.node}
          </div>
        ))}
      </div>
      {children}
      {tilt !== "unavailable" ? (
        <button type="button" className="rl-btn rl-btn--ghost rl-btn--sm rl-motion-toggle" onClick={enableTilt} aria-pressed={tilt === "on"}>
          <Compass aria-hidden="true" />
          {tilt === "on" ? "Stop tilt" : tilt === "denied" ? "Tilt not allowed" : "Tilt to explore"}
        </button>
      ) : null}
    </div>
  );
}

/**
 * A short, silent, decorative loop.
 *
 * Nothing loads until the video is near the viewport, it plays only while it
 * is on screen, and reduced-motion visitors get the poster frame instead —
 * the words beside it carry the meaning, so the film is never needed.
 */
export function LoopVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (video.preload !== "auto") {
            video.preload = "auto";
            video.load();
          }
          void video.play().catch(() => {
            // Autoplay refused (data saver, low power): the poster stays.
          });
        } else {
          video.pause();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video ref={ref} className="rl-film" muted loop playsInline preload="none" poster={poster} aria-hidden="true" tabIndex={-1}>
      <source src={src.replace(/\.mp4$/, ".webm")} type="video/webm" />
      <source src={src} type="video/mp4" />
    </video>
  );
}
