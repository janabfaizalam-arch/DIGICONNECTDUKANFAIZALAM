"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";

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

export function ReferralShareButton({
  code,
  link,
}: {
  code: string;
  link: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (!link) return;

    const shareText = `Join DigiConnect Dukan with my referral code ${code} and get ₹500 wallet bonus! Sign up here: ${link}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "DigiConnect Dukan Referral", text: shareText, url: link });
        return;
      } catch {
        // Fall through to clipboard copy
      }
    }

    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      disabled={!link}
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-blue-700 px-4 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {copied ? <Copy className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Link Copied!" : "Share Link"}
    </button>
  );
}
