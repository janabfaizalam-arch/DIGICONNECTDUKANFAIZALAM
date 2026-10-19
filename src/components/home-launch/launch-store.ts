"use client";

import { useSyncExternalStore } from "react";

import {
  foundationFor,
  moduleApplicability,
  moduleById,
  type BusinessTypeId,
  type ModuleId,
  type StructureId,
} from "@/lib/homepage/launch-catalog";

/**
 * One selection, shared by every part of the page that can change it.
 *
 * The explorer, the packages, the add-on catalogue, the scenarios and the
 * cost ledger all act on the same setup the builder shows, so "Add to my
 * setup" anywhere on the page means the same thing. A tiny external store
 * rather than context: the sections are far apart in the tree and most of the
 * page is server-rendered between them.
 *
 * The selection survives a reload in the same tab (sessionStorage) and holds
 * no personal data — only ids from the launch catalogue.
 */

export type LaunchState = {
  business: BusinessTypeId | null;
  structure: StructureId | null;
  modules: ModuleId[];
  step: number;
};

const STORAGE_KEY = "rnos:launch-setup:v1";
const EMPTY: LaunchState = { business: null, structure: null, modules: [], step: 0 };

let state: LaunchState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or storage disabled: the selection simply isn't remembered.
  }
  listeners.forEach((listener) => listener());
}

function sanitise(raw: unknown): LaunchState {
  if (!raw || typeof raw !== "object") return EMPTY;
  const value = raw as Partial<LaunchState>;
  const modules = Array.isArray(value.modules) ? value.modules.filter((id): id is ModuleId => Boolean(moduleById(id as ModuleId))) : [];
  return {
    business: typeof value.business === "string" ? (value.business as BusinessTypeId) : null,
    structure: typeof value.structure === "string" && ["pvt", "llp", "opc", "partnership", "proprietorship"].includes(value.structure) ? value.structure : null,
    modules: [...new Set(modules)],
    step: typeof value.step === "number" && value.step >= 0 && value.step <= 4 ? value.step : 0,
  };
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    state = sanitise(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    state = EMPTY;
  }
}

function set(next: LaunchState) {
  state = next;
  emit();
}

/** Remove modules that cannot apply to the structure, and make sure its foundation is in. */
function reconcile(modules: ModuleId[], structure: StructureId | null): ModuleId[] {
  if (!structure) return modules;
  const foundation = foundationFor(structure);
  const kept = modules.filter((id) => {
    const mod = moduleById(id);
    if (!mod) return false;
    if (mod.group === "foundation" && mod.nature === "foundation") return id === foundation;
    return moduleApplicability(mod, structure).ok;
  });
  return kept.includes(foundation) ? kept : [foundation, ...kept];
}

export const launchStore = {
  subscribe(listener: () => void) {
    hydrate();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): LaunchState {
    hydrate();
    return state;
  },
  setBusiness(business: BusinessTypeId) {
    set({ ...state, business });
  },
  setStructure(structure: StructureId) {
    set({ ...state, structure, modules: reconcile(state.modules, structure) });
  },
  toggle(id: ModuleId) {
    const has = state.modules.includes(id);
    const mod = moduleById(id);
    // A structure's own registration is the setup; it is changed by changing the structure.
    if (has && mod?.nature === "foundation") return;
    const modules = has ? state.modules.filter((entry) => entry !== id) : [...state.modules, id];
    // Removing something drops what only made sense alongside it (GST returns without GST).
    const pruned = has ? modules.filter((entry) => !moduleById(entry)?.requires?.includes(id)) : modules;
    set({ ...state, modules: reconcile(pruned, state.structure) });
  },
  /** Add without toggling off — for "Add to my setup" buttons outside the builder. */
  add(id: ModuleId) {
    if (state.modules.includes(id)) return;
    const mod = moduleById(id);
    const requires = mod?.requires?.filter((dep) => !state.modules.includes(dep)) ?? [];
    set({ ...state, modules: reconcile([...state.modules, ...requires, id], state.structure) });
  },
  apply(next: { structure?: StructureId; business?: BusinessTypeId; modules: ModuleId[]; step?: number }) {
    const structure = next.structure ?? state.structure;
    set({
      business: next.business ?? state.business,
      structure,
      modules: reconcile([...new Set(next.modules)], structure),
      step: next.step ?? state.step,
    });
  },
  setStep(step: number) {
    set({ ...state, step: Math.max(0, Math.min(4, step)) });
  },
  reset() {
    set(EMPTY);
  },
};

export function useLaunchState() {
  return useSyncExternalStore(launchStore.subscribe, launchStore.get, () => EMPTY);
}

/** Scroll to a section without fighting the user's reduced-motion preference. */
export function goTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  // Move focus for keyboard and screen-reader users, without a second jump.
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
  history.replaceState(null, "", `#${id}`);
}
