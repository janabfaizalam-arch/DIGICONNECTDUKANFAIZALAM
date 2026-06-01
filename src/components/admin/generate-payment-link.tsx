"use client";

import { useState } from "react";
import { Copy, Link as LinkIcon, MessageCircle, Check } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";

export function GeneratePaymentLink({
  applicationId,
  payableAmount,
  customerMobile,
  customerName,
  serviceName,
}: {
  applicationId: string;
  payableAmount: number;
  customerMobile: string;
  customerName?: string;
  serviceName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  const handleGenerate = () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const link = `${origin}/pay/application/${applicationId}`;
      setGeneratedLink(link);
      success("Payment link generated successfully!");
    } catch {
      toastError("Failed to generate payment link.");
    }
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    try {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      success("Payment link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastError("Failed to copy link to clipboard.");
    }
  };

  const handleWhatsApp = () => {
    if (!generatedLink) return;
    const cleanMobile = customerMobile.replace(/\D/g, "");
    const message = `Hello ${customerName || "Customer"},\n\nYour application dossier for *${serviceName}* is prepared. Please complete the secure checkout payment of *₹${payableAmount.toLocaleString("en-IN")}* using this secure payment gateway link:\n\n${generatedLink}\n\nThank you,\nDigiConnect Dukan`;
    const whatsappUrl = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  if (!generatedLink) {
    return (
      <button
        onClick={handleGenerate}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white shadow-md shadow-orange-600/10 hover:bg-orange-700 transition"
      >
        <LinkIcon className="h-4 w-4" />
        Generate Payment Link
      </button>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-3 text-xs leading-normal font-medium text-slate-700">
        <span className="font-extrabold text-orange-800">Secure Payment Link:</span>
        <p className="mt-1 break-all font-mono text-[10px] text-slate-500 bg-white border border-orange-100 rounded p-1.5 shadow-sm">
          {generatedLink}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleCopy}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={handleWhatsApp}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-xs font-bold text-white hover:bg-[#20ba56] transition"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Send on WhatsApp
        </button>
      </div>
    </div>
  );
}
