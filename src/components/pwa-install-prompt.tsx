"use client";

import { Download, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const HIDDEN_ROUTES = ["/admin", "/agent", "/customer", "/dashboard", "/login", "/signup", "/reset-password", "/forgot-password"];

function isStandaloneDisplay() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 767px)").matches;
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const hiddenOnRoute = useMemo(() => HIDDEN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`)), [pathname]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    function registerServiceWorker() {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    window.addEventListener("load", registerServiceWorker);

    return () => {
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(isMobileViewport() && !isStandaloneDisplay());
    }

    function handleAppInstalled() {
      setVisible(false);
      setInstallEvent(null);
      window.localStorage.setItem("digiconnect-pwa-installed", "true");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (hiddenOnRoute || isStandaloneDisplay() || window.localStorage.getItem("digiconnect-pwa-dismissed") === "true") {
      setVisible(false);
      return;
    }

    if (installEvent && isMobileViewport()) {
      setVisible(true);
    }
  }, [hiddenOnRoute, installEvent]);

  async function installApp() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome !== "accepted") {
      window.localStorage.setItem("digiconnect-pwa-dismissed", "true");
    }

    setVisible(false);
    setInstallEvent(null);
  }

  function dismissPrompt() {
    window.localStorage.setItem("digiconnect-pwa-dismissed", "true");
    setVisible(false);
  }

  if (!visible || hiddenOnRoute) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-blue-100 bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.18)] md:hidden print:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B1F3A] text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold leading-5 text-slate-950">Install DigiConnect</p>
          <p className="text-xs font-semibold leading-5 text-slate-500">Add the app to your phone for faster access.</p>
        </div>
        <button
          type="button"
          onClick={installApp}
          className="h-9 shrink-0 rounded-full bg-[var(--primary)] px-3 text-xs font-extrabold text-white"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismissPrompt}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
