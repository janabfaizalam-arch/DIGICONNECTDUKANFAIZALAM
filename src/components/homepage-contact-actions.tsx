"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { useChromeHiddenOnScroll } from "@/lib/ui/use-chrome-visibility";

const hiddenPrefixes = [
  "/admin",
  "/agent",
  "/login",
  "/signup",
  "/ap/login",
  "/forgot-password",
  "/reset-password",
  "/customer/dashboard",
];

function shouldHideBottomNav(pathname: string) {
  return hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * The floating WhatsApp button.
 *
 * It rides above the tab bar, and leaves and returns with the rest of the
 * chrome — from `useChromeHiddenOnScroll`, the same hook the header and the
 * tab bar read. It used to run a third copy of the scroll maths, with its own
 * thresholds, so on the way down the button and the bar underneath it drifted
 * out of step with each other.
 *
 * `desktopOnly` is for pages that already carry their own action bar on a
 * phone — the DPR landing page, whose apply bar occupies exactly this corner.
 */
export function HomepageContactActions({ desktopOnly = false }: { desktopOnly?: boolean } = {}) {
  const pathname = usePathname();
  const routeHidesNav = shouldHideBottomNav(pathname);
  const chromeHidden = useChromeHiddenOnScroll();

  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({ page: "floating", topic: "Website service enquiry" }),
  );

  // With no tab bar under it the button drops to the screen edge; with one, it
  // clears the bar by the shared gap.
  const bottomPosition =
    routeHidesNav || chromeHidden
      ? "bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]"
      : "bottom-[calc(var(--bottom-nav-height)+var(--whatsapp-fab-gap)+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]";

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with support on WhatsApp"
      className={`whatsapp-floating-button ${bottomPosition}`}
      data-homepage-fab="whatsapp"
      data-desktop-only={desktopOnly ? "true" : undefined}
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
    </a>
  );
}
