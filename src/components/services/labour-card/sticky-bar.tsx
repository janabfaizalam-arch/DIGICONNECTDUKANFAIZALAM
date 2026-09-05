"use client";

import { MessageCircle, Phone } from "lucide-react";

import { useChromeHiddenOnScroll } from "@/lib/ui/use-chrome-visibility";

/**
 * The always-visible eligibility bar, on phones.
 *
 * Two things about where this sits:
 *
 * 1. It stacks *above* the site's tab bar rather than on top of it. Both are
 *    fixed to the bottom edge and both are phone-only, so pinned to the same
 *    edge this one covered Home, Services and Apply outright — which is what
 *    it was doing. The offset is `--bottom-nav-height`, the tab bar's own
 *    token, so the two stay in step if that bar is ever resized.
 *
 * 2. It rides the same scroll behaviour as the rest of the chrome. When the
 *    header and tab bar slide away for reading this goes with them and comes
 *    back with them, rather than being the one element that never leaves — and
 *    rather than being left hovering over a gap where the tab bar used to be.
 */
export function LabourStickyBar({ whatsapp, phone }: { whatsapp: string; phone: string }) {
  const hidden = useChromeHiddenOnScroll();

  return (
    <div
      role="region"
      aria-label="लेबर कार्ड पात्रता"
      data-hidden={hidden ? "true" : undefined}
      className="dc-chrome-slide-down fixed inset-x-0 bottom-0 z-[49] px-3 print:hidden lg:hidden"
      style={{ paddingBottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 0.5rem)" }}
    >
      <div
        className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border bg-white/95 p-2 backdrop-blur-xl"
        style={{ borderColor: "var(--lc-border)", boxShadow: "var(--lc-shadow-3)" }}
      >
        <a
          href="#eligibility"
          className="inline-flex h-12 flex-1 items-center justify-center rounded-xl text-[14px] font-bold text-white"
          style={{
            background: "linear-gradient(135deg, var(--lc-saffron), var(--lc-saffron-deep))",
            boxShadow: "0 10px 24px -12px rgba(234,88,12,0.95)",
          }}
        >
          पात्रता चेक करें
        </a>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="व्हाट्सएप पर सहायता"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: "var(--lc-emerald)" }}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </a>
        <a
          href={phone}
          aria-label="फ़ोन पर बात करें"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white"
          style={{ borderColor: "var(--lc-border)", color: "var(--lc-navy)" }}
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
