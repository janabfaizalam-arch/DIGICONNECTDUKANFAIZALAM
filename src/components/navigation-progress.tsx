"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setActive(true);
    const timer = window.setTimeout(() => setActive(false), 520);
    return () => window.clearTimeout(timer);
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className={`fixed left-0 top-0 z-[120] h-1 bg-gradient-to-r from-blue-700 via-sky-500 to-orange-500 shadow-[0_0_16px_rgba(37,99,235,0.35)] transition-all duration-500 motion-reduce:hidden ${
        active ? "w-full opacity-100" : "w-0 opacity-0"
      }`}
    />
  );
}
