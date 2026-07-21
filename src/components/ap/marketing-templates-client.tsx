"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { buildPartnerWhatsAppCaption } from "@/lib/ap/marketing";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type ServiceOption = { slug: string; title: string };

type Props = {
  partnerName: string;
  partnerCode: string;
  services: ServiceOption[];
};

export function MarketingTemplatesClient({ partnerName, partnerCode, services }: Props) {
  const [serviceSlug, setServiceSlug] = useState(services[0]?.slug ?? "");
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () => services.find((s) => s.slug === serviceSlug) ?? services[0],
    [serviceSlug, services],
  );

  const caption = selected
    ? buildPartnerWhatsAppCaption({
        serviceTitle: selected.title,
        partnerName,
        partnerCode,
      })
    : "";

  async function copyCaption() {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  if (!selected) {
    return <p className="text-sm font-medium text-slate-500">No services available for templates.</p>;
  }

  const shareUrl = buildWhatsAppUrl(caption);

  return (
    <div className="space-y-4">
      <label className="block text-xs font-bold text-slate-500">
        Service
        <select
          value={selected.slug}
          onChange={(e) => setServiceSlug(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {services.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.title}
            </option>
          ))}
        </select>
      </label>

      <pre className="whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs font-medium leading-relaxed text-slate-700">
        {caption}
      </pre>

      <p className="sr-only" aria-live="polite">
        {copied ? "Caption copied to clipboard" : ""}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyCaption()}
          className={cn(
            "inline-flex h-11 min-w-[44px] items-center gap-2 rounded-full px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            copied ? "bg-emerald-600 text-white" : "bg-slate-950 text-white hover:bg-slate-800",
          )}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Copied" : "Copy caption"}
        </button>
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 min-w-[44px] items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Share2 className="h-4 w-4" />
          Share on WhatsApp
        </a>
      </div>
    </div>
  );
}
