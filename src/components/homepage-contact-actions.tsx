"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

const hiddenPrefixes = ["/admin", "/agent", "/login", "/signup", "/ap/login", "/forgot-password", "/reset-password", "/customer/dashboard"];

function shouldHideBottomNav(pathname: string) {
  return hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function HomepageContactActions() {
  const pathname = usePathname();
  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({ page: "floating", topic: "Website service enquiry" })
  );

  const [navHidden, setNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;

    ticking.current = true;
    window.requestAnimationFrame(() => {
      ticking.current = false;
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (scrollDelta > 10 && currentScrollY > 80) {
        setNavHidden(true);
      } else if (scrollDelta < -5) {
        setNavHidden(false);
      }

      lastScrollYRef.current = currentScrollY;
    });
  }, []);

  useEffect(() => {
    if (shouldHideBottomNav(pathname)) {
      setNavHidden(true);
      return;
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname, handleScroll]);

  const isBottomNavHidden = shouldHideBottomNav(pathname);
  const bottomPosition =
    isBottomNavHidden || navHidden
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
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
    </a>
  );
}
