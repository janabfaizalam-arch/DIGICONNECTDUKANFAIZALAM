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

      // Match bottom-nav scroll hide/show thresholds
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
      setNavHidden(true); // Push always to the bottom if bottom nav is not present
      return;
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname, handleScroll]);

  const isBottomNavHidden = shouldHideBottomNav(pathname);

  // Compute reactive bottom class. On scroll hide, we match the transition of bottom nav.
  const bottomPosition = isBottomNavHidden || navHidden
    ? "bottom-5"
    : "bottom-[calc(var(--bottom-nav-height)+1rem+env(safe-area-inset-bottom))]";

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with DigiConnect Dukan on WhatsApp"
      className={`whatsapp-floating-button transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${bottomPosition}`}
    >
      <MessageCircle className="h-5 w-5" />
    </a>
  );
}
