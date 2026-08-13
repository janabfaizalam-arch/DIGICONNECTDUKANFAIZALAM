"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // delay in milliseconds
}

export function ScrollReveal({ children, className = "", delay = 0 }: ScrollRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => {
              setIsRevealed(true);
            }, delay);
          } else {
            setIsRevealed(true);
          }
          // Stop observing once animation triggers to conserve CPU
          observer.unobserve(currentRef);
        }
      },
      {
        threshold: 0.05,
        rootMargin: "0px 0px -40px 0px", // Trigger when element is close to viewport
      }
    );

    observer.observe(currentRef);

    return () => {
      observer.disconnect();
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      /*
        Transform and opacity only. The reveal used to animate a 3px blur as
        well, which forces the compositor to re-rasterise the whole section on
        every frame — the most expensive thing on the page, on the cheapest
        phones, seventeen times per scroll. Shorter and shallower too: 700ms
        with an 8px lift reads as sluggish once every band does it.
      */
      className={`motion-safe:transition-[opacity,transform] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[transform,opacity] ${
        isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5 motion-reduce:opacity-100 motion-reduce:translate-y-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
