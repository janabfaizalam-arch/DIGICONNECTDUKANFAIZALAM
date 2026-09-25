"use client";

import { useCallback, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, QrCode } from "lucide-react";

import { cn } from "@/lib/utils";

type PaymentLinkQrProps = {
  /** The link the customer opens — the QR carries this and nothing else. */
  url: string;
  /** Razorpay's UPI QR, when the link has one. Paid from inside a UPI app. */
  upiQrImageUrl?: string | null;
  /** Shown under the QR so a partner reading it aloud has something short. */
  code?: string;
  amount?: number;
  /** Hidden until asked for, when the QR is one option among several. */
  collapsible?: boolean;
  className?: string;
};

/**
 * The payment link as something a customer can point a phone at.
 *
 * Standing at the counter, the partner has the link on screen and the
 * customer has a phone: copy and WhatsApp both make them leave and come back.
 * Scanning takes them straight to the same page, so the payment runs through
 * Razorpay exactly as it would have, and the link settles the same way.
 *
 * The QR is deliberately untouched by the panel's theme: pure black on pure
 * white, with its quiet zone, at a size that survives a cheap camera across a
 * desk. A tinted or undersized QR looks better in a screenshot and fails in
 * the shop.
 */
export function PaymentLinkQr({
  url,
  upiQrImageUrl,
  code,
  amount,
  collapsible = false,
  className,
}: PaymentLinkQrProps) {
  const [open, setOpen] = useState(!collapsible);
  /*
    Two QRs, and the difference matters at the counter.

    UPI pays in one step but only a UPI app can read it -- a plain camera sees
    nothing useful. The link QR opens the payment page, which any camera can
    do and which also accepts cards and netbanking. So UPI leads when it
    exists, and the link is always one tap away behind it.
  */
  const [showUpi, setShowUpi] = useState(true);
  const upiAvailable = Boolean(upiQrImageUrl);
  const showingUpi = upiAvailable && showUpi;
  const containerRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  /**
   * Save the QR as a PNG so it can be sent, printed or pinned up.
   *
   * The SVG is rasterised in the browser rather than fetched from a server:
   * the QR is already on the page, and a round trip would be a second way for
   * this to fail. Drawn onto an opaque white canvas because a transparent PNG
   * on a dark background is an unscannable QR.
   */
  const download = useCallback(async () => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;

    setDownloading(true);
    try {
      const size = 250;
      const scale = 4; // ~1000px square: enough to print or send.

      /*
        Serialised from a clone, so the QR on screen is never touched, with an
        explicit size and namespace on it.

        qrcode.react renders no `xmlns` attribute, which is fine inside an HTML
        document. XMLSerializer writes one out anyway, because the element is
        in the SVG namespace either way -- but a standalone SVG blob needs it,
        so it is set here rather than left to the serialiser. The width and
        height give the blob a definite intrinsic size to rasterise from.
      */
      const clone = svg.cloneNode(true) as SVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", String(size));
      clone.setAttribute("height", String(size));

      const source = new XMLSerializer().serializeToString(clone);
      const blobUrl = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));

      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("QR image failed to load"));
        image.src = blobUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = size * scale;
      canvas.height = size * scale;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      }
      URL.revokeObjectURL(blobUrl);

      const anchor = document.createElement("a");
      anchor.href = canvas.toDataURL("image/png");
      anchor.download = `payment-${code || "link"}.png`;
      anchor.click();
    } catch {
      // Saving is a convenience; the QR on screen is the thing that matters,
      // and it is still there.
    } finally {
      setDownloading(false);
    }
  }, [code]);

  if (collapsible && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "dcp-btn dcp-btn-quiet flex w-full items-center justify-center gap-1.5 text-xs",
          className,
        )}
      >
        <QrCode className="h-3.5 w-3.5" aria-hidden />
        Show QR to scan
      </button>
    );
  }

  return (
    <div className={cn("flex w-full flex-col items-center", className)}>
      <div
        ref={containerRef}
        className={cn(
          "rounded-2xl border border-[var(--dcp-line)] bg-white shadow-sm",
          // The poster carries its own white margin; the drawn QR needs padding.
          showingUpi ? "w-full max-w-[400px] overflow-hidden p-1" : "p-3",
        )}
      >
        {showingUpi ? (
          /*
            Razorpay does not hand back a bare QR: image_url is a whole
            printable poster -- its branding, the UPI app logos, the business
            name -- and the code itself is only the middle third of it. Drawn
            at the size of a bare QR, the actual code lands around 70px and a
            phone cannot read it.

            So this one is sized by the width it is given, not by a fixed box,
            and given a floor that keeps the code inside it scannable.
          */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={upiQrImageUrl as string}
            alt="Scan with any UPI app to pay"
            className="block h-auto w-full max-w-[400px]"
          />
        ) : (
        <QRCodeSVG
          value={url}
          size={200}
          level="M"
          // Four modules is the quiet zone the QR spec requires; relying on
          // the card's padding instead makes scanning depend on the layout.
          marginSize={4}
          bgColor="#ffffff"
          fgColor="#000000"
          title="Scan to pay"
        />
        )}
      </div>

      <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--dcp-ink-3)]">
        {showingUpi ? "Scan in any UPI app" : "Scan to pay"}
        {typeof amount === "number" ? (
          <span className="ml-1 text-[var(--dcp-ink)]">₹{amount.toLocaleString("en-IN")}</span>
        ) : null}
      </p>

      {upiAvailable ? (
        <button
          type="button"
          onClick={() => setShowUpi((v) => !v)}
          className="mt-1 text-[11px] font-bold text-[var(--dcp-brand)] underline-offset-2 hover:underline"
        >
          {showingUpi ? "Card or netbanking instead" : "Pay by UPI instead"}
        </button>
      ) : null}

      {code ? (
        <p className="mt-0.5 font-mono text-[11px] font-semibold text-[var(--dcp-ink-4)]">{code}</p>
      ) : null}

      {showingUpi ? (
        // Razorpay's image is already a file; saving it is the browser's job.
        <a
          href={upiQrImageUrl as string}
          target="_blank"
          rel="noreferrer"
          className="dcp-btn dcp-btn-quiet mt-3 flex items-center gap-1.5 text-xs"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Open QR image
        </a>
      ) : (
        <button
          type="button"
          onClick={download}
          disabled={downloading}
          className="dcp-btn dcp-btn-quiet mt-3 flex items-center gap-1.5 text-xs disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {downloading ? "Saving…" : "Save QR"}
        </button>
      )}
    </div>
  );
}
