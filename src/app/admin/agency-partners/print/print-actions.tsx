"use client";

import { Printer } from "lucide-react";

/**
 * The print controls, and nothing else.
 *
 * A client component here so the table itself can stay on the server: the
 * partner records carry Aadhaar, PAN and bank details, and handing them to a
 * client component would serialise all of it into the page's RSC payload where
 * anyone with the browser open can read it. This button receives no data at all.
 */
export function PrintActions() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ds-primary px-5 text-sm font-bold text-ds-text-inverted transition hover:bg-ds-primary-hover print:hidden"
    >
      <Printer className="h-4 w-4" />
      Print kijiye
    </button>
  );
}
