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
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity,filter] ${
        isRevealed
          ? "opacity-100 translate-y-0 blur-0"
          : "opacity-0 translate-y-8 blur-[3px]"
      } ${className}`}
    >
      {children}
    </div>
  );
}
