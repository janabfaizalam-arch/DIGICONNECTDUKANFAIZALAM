"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

export function ReferralCopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={() => void copyValue()}
      disabled={!value}
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-950 px-3 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Copy className="h-3.5 w-3.5" />
      {copied ? "Copied" : label}
    </button>
  );
}
