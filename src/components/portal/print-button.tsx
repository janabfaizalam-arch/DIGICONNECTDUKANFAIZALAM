"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.print();
        }
      }}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white"
    >
      <Printer className="h-4 w-4" />
      Download PDF
    </button>
  );
}
