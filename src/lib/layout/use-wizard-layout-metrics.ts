"use client";

import { useEffect } from "react";

/*
  Wizard chrome measurement.

  The application wizards pad themselves around whatever chrome happens to be
  on screen — the site header, their own stepper, their own sticky action bar,
  and the tab bar when one is showing. Those heights are measured at runtime
  and published as custom properties, because the padding is applied by
  ancestors of the wizard (the page's <main>), not only by the wizard itself.

  Two rules keep that from breaking the rest of the site:

  1. The names published here belong to the wizards alone. In particular this
     never writes `--bottom-nav-height`: that is the tab bar's own token, set
     once in globals.css and read by the tab bar, the WhatsApp button and the
     page clearances. A wizard that overwrote it with the "no tab bar here"
     value of 0px left every later page with a tab bar collapsed to nothing —
     open Apply, come back, and the bar was gone. The wizards get
     `--wizard-bottom-nav-height` instead, which nothing else reads.

  2. Everything set here is removed on unmount, so leaving a wizard leaves the
     document exactly as it was found.
*/

const HEADER = ".site-header";
const STEPPER = ".wizard-stepper";
const BOTTOM_NAV = ".bottom-nav-container";
const STICKY_ACTIONS = ".wizard-sticky-actions";

const PROPERTIES = [
  "--site-header-height",
  "--stepper-height",
  "--wizard-bottom-nav-height",
  "--sticky-action-bar-height",
] as const;

function heightOf(selector: string, requireVisible = false) {
  const el = document.querySelector(selector);
  if (!el) return 0;
  if (requireVisible && window.getComputedStyle(el).display === "none") return 0;
  return el.getBoundingClientRect().height;
}

/**
 * Publishes the wizard chrome heights while the wizard is mounted, and clears
 * them again when it unmounts. `deps` re-measures on things that change the
 * chrome — the current step, a success screen swapping the action bar out.
 */
export function useWizardLayoutMetrics(deps: unknown[] = []) {
  useEffect(() => {
    const root = document.documentElement;

    const update = () => {
      root.style.setProperty("--site-header-height", `${heightOf(HEADER)}px`);
      root.style.setProperty("--stepper-height", `${heightOf(STEPPER)}px`);
      root.style.setProperty("--wizard-bottom-nav-height", `${heightOf(BOTTOM_NAV, true)}px`);
      root.style.setProperty("--sticky-action-bar-height", `${heightOf(STICKY_ACTIONS)}px`);
    };

    update();

    const observer = new ResizeObserver(update);
    for (const selector of [HEADER, STEPPER, BOTTOM_NAV, STICKY_ACTIONS]) {
      const el = document.querySelector(selector);
      if (el) observer.observe(el);
    }

    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      for (const property of PROPERTIES) root.style.removeProperty(property);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
