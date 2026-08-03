"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Pause, Play, X } from "lucide-react";

const STORAGE_KEY = "homepage-notice-dismissed-v1";

/** Client controls for announcement bar: dismiss + pause for reduced distraction. */
export function HomepageNoticeControls({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  if (!ready || dismissed) return null;

  return (
    <div className="relative" data-notice-paused={paused ? "true" : "false"}>
      <div className={paused ? "[&_.marquee-track]:![animation-play-state:paused]" : undefined}>{children}</div>
      <div className="absolute right-2 top-1/2 z-30 flex -translate-y-1/2 items-center gap-1">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label={paused ? "Play announcements" : "Pause announcements"}
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(STORAGE_KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Dismiss announcements"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
