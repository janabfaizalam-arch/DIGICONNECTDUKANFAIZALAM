"use client";

import { useEffect, useState } from "react";

export function OfferCountdown() {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    // Target: End of current day in local time
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(23, 59, 59, 999);
      
      const difference = target.getTime() - now.getTime();
      
      if (difference <= 0) {
        return { hours: 0, minutes: 0, seconds: 0 };
      }
      
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      
      return { hours, minutes, seconds };
    };

    // Initialize
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) {
    // Render placeholder matching the layout size to prevent layout shifts (CLS < 0.05)
    return (
      <span className="inline-flex items-center gap-1.5 font-mono font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] animate-pulse">
        Offer ends soon
      </span>
    );
  }

  const padZero = (num: number) => String(num).padStart(2, "0");

  return (
    <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-amber-700 bg-amber-50 border border-amber-100/80 px-2.5 py-0.5 rounded-full text-[11.5px] shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
      <span>Offer ends in:</span>
      <span className="text-amber-800 tracking-wider">
        {padZero(timeLeft.hours)}h {padZero(timeLeft.minutes)}m {padZero(timeLeft.seconds)}s
      </span>
    </span>
  );
}
