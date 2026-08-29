"use client";

import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

import { DPR_LAUNCH_PRICE } from "@/lib/dpr/constants";
import type { DprSection } from "@/lib/dpr/types";
import { useChromeHiddenOnScroll } from "@/lib/ui/use-chrome-visibility";
import { cn } from "@/lib/utils";
import { WhatsAppIcon, type DprSectionContext } from "./shared";

type Props = {
  section: DprSection;
  ctx: DprSectionContext;
  launchPrice?: number;
};

/**
 * The always-visible apply bar, on phones.
 *
 * Two things about where this sits:
 *
 * 1. It stacks *above* the site's tab bar rather than on top of it. Both are
 *    `fixed bottom-0` and both are phone-only, so pinned to the same edge this
 *    one covered Home, Dashboard and Apply completely. It is offset by
 *    `--bottom-nav-height`, the tab bar's own token, so the two stay in step
 *    if the bar is ever resized.
 *
 * 2. It rides the same scroll behaviour as the rest of the chrome. When the
 *    header and tab bar slide away for reading, this goes with them and comes
 *    back with them, instead of being the one element that never leaves.
 */
export function DprStickyCta({ section, ctx, launchPrice = DPR_LAUNCH_PRICE }: Props) {
  const hidden = useChromeHiddenOnScroll();

  const label = section.ctaLabel || "Apply now";
  const href = section.ctaUrl || ctx.applyUrl;

  return (
    <div
      data-hidden={hidden ? "true" : undefined}
      className={cn(
        "dc-chrome-slide-down fixed inset-x-0 z-[49] px-3 print:hidden md:hidden",
      )}
      style={{
        bottom: 0,
        paddingBottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 0.5rem)",
      }}
      role="region"
      aria-label="Apply for a Detailed Project Report"
    >
      <div className="dc-tabbar mx-auto flex max-w-md items-center gap-2 p-2">
        <span className="min-w-0 pl-1.5">
          <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-muted)]">
            DPR
          </span>
          <span className="block text-[15px] font-extrabold leading-none text-[var(--dc-ink)]">
            ₹{launchPrice.toLocaleString("en-IN")}
          </span>
        </span>

        <a
          href={`tel:${ctx.supportPhone}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--dc-blue-mid)] transition active:scale-95"
          aria-label="Call support"
        >
          <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
        </a>

        <a
          href={ctx.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--dc-flame)] transition active:scale-95"
          aria-label="Ask on WhatsApp"
        >
          <WhatsAppIcon className="h-[18px] w-[18px]" />
        </a>

        <Link
          href={href}
          className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-[12.5px] font-extrabold text-white shadow-[0_12px_26px_-14px_rgba(0,29,95,0.95)] transition active:scale-[0.98]"
          style={{ background: "var(--dc-grad-flame)" }}
        >
          <span className="truncate">{label}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
