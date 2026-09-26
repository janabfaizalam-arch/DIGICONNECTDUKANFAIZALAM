"use client";

import { useSyncExternalStore } from "react";

import { getConsent, subscribeConsent, type ConsentState } from "@/lib/consent/consent";

/**
 * The visitor's cookie choice.
 *
 * `undefined` during server rendering and hydration — the server cannot read
 * the choice, so anything gated on consent renders nothing until the client
 * knows. `null` once mounted means "not decided yet".
 */
export function useConsent(): ConsentState | null | undefined {
  return useSyncExternalStore(subscribeConsent, getConsent, () => undefined);
}
