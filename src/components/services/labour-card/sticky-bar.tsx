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
      aria-label="Labour Card eligibility"
      data-hidden={hidden ? "true" : undefined}
      className="dc-chrome-slide-down fixed inset-x-0 bottom-0 z-[49] px-3 print:hidden lg:hidden"
      style={{ paddingBottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 0.5rem)" }}
    >
      <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-[var(--dc-ink)]/8 bg-white/95 p-2 shadow-[0_10px_36px_-14px_rgba(15,32,73,0.5)] backdrop-blur-xl">
        <a
          href="#eligibility"
          className="inline-flex h-11 flex-1 items-center justify-center rounded-xl text-[13.5px] font-extrabold text-white shadow-[0_10px_24px_-12px_rgba(15,93,184,0.9)]"
          style={{ background: "var(--dc-grad-blue)" }}
        >
          Eligibility check
        </a>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25d366] text-white"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </a>
        <a
          href={phone}
          aria-label="Call"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--dc-ink)]/12 bg-white text-[var(--dc-ink)]"
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
