"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, MessageCircle, Share2, X, Loader2 } from "lucide-react";

type ShareServiceMenuProps = {
  serviceName: string;
  serviceSlug: string;
  triggerClassName?: string;
  compact?: boolean;
};

export function ShareServiceMenu({ serviceName, serviceSlug, triggerClassName, compact }: ShareServiceMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [refToken, setRefToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchReferralToken = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/referrals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceSlug }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setRefToken(data.token);
      } else {
        // User may not be an agency partner — share without referral
        setRefToken(null);
      }
    } catch {
      setRefToken(null);
    } finally {
      setLoading(false);
    }
  }, [serviceSlug]);

  useEffect(() => {
    if (isOpen && refToken === null && !loading) {
      fetchReferralToken();
    }
  }, [isOpen, refToken, loading, fetchReferralToken]);

  const getShareUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://rnos.in";
    // Route through /s/{slug} tracker for proper referral click tracking
    if (refToken) {
      return `${origin}/s/${serviceSlug}?ref=${refToken}`;
    }
    // Fallback: direct link without referral
    return `${origin}/services/${serviceSlug}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy", error);
    }
  };

  const shareWhatsApp = () => {
    const text = `Apply for ${serviceName} securely via DigiConnect Dukan.\n\n${getShareUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={
          triggerClassName ||
          (compact
            ? "flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700"
            : "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50")
        }
        aria-label="Share Service"
      >
        <Share2 className={compact ? "h-4 w-4" : "h-4 w-4 text-blue-600"} />
        {!compact && "Share"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-950">Share Service</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-500 line-clamp-1">{serviceName}</p>

            {loading ? (
              <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="mt-3 text-xs font-bold text-slate-400">Generating share link...</p>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-100">
                  <QRCodeSVG
                    value={getShareUrl()}
                    size={140}
                    level="Q"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#020617"
                  />
                </div>
                <p className="mt-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase">Scan to Apply</p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={shareWhatsApp}
                disabled={loading}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
              >
                <MessageCircle className="h-6 w-6" />
                <span className="text-xs font-extrabold">WhatsApp</span>
              </button>
              
              <button
                onClick={handleCopy}
                disabled={loading}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
              >
                <Copy className="h-6 w-6" />
                <span className="text-xs font-extrabold">{copied ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>

            {refToken && (
              <p className="mt-6 text-center text-xs font-bold text-slate-400">
                Referral tracking: <span className="text-blue-600">Active</span>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
