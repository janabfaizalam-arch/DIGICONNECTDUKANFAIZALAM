"use client";

import { ArrowRight } from "lucide-react";

import { goTo, launchStore } from "@/components/home-launch/launch-store";
import type { ModuleId, StructureId } from "@/lib/homepage/launch-catalog";

/** Start the builder from a directory card: with the structure, or with the service added. */
export function DirectoryAction({ mod, structure, label }: { mod: ModuleId; structure?: StructureId; label: string }) {
  return (
    <button
      type="button"
      className="rl-btn rl-btn--blue rl-btn--sm"
      onClick={() => {
        if (structure) {
          launchStore.setStructure(structure);
          launchStore.setStep(2);
        } else {
          launchStore.add(mod);
        }
        goTo("builder");
      }}
    >
      {label}
      <ArrowRight className="rl-arrow" aria-hidden="true" />
    </button>
  );
}
