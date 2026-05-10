"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { trackContact, trackPageView } from "@/lib/meta-pixel";

const internalToolPrefixes = ["/admin", "/agent", "/staff"];

function isContactHref(href: string) {
  return href.startsWith("tel:") || href.includes("wa.me/") || href.includes("whatsapp.com/");
}

function shouldTrackContact(pathname: string) {
  return !internalToolPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function MetaPixelEvents() {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    if (previousPathname.current === null) {
      previousPathname.current = pathname;
      return;
    }

    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      trackPageView();
    }
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!shouldTrackContact(pathname)) {
        return;
      }

      const link = (event.target as Element | null)?.closest("a[href]");
      const href = link?.getAttribute("href");

      if (href && isContactHref(href)) {
        trackContact();
      }
    }

    document.addEventListener("click", onClick);

    return () => document.removeEventListener("click", onClick);
  }, [pathname]);

  return null;
}
