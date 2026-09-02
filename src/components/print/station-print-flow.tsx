"use client";

import { useMemo, useState } from "react";
import Script from "next/script";
import { Check, Clock, FileUp, Loader2, Lock, Printer, ShieldCheck, Store, X } from "lucide-react";

import { cn } from "@/lib/utils";

/* Window.Razorpay is already declared in the payments button; the checkout
   script is loaded once per page that needs it. */

type Uploaded = {
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  pages?: number;
};

/**
 * The customer's side of a shop's print counter.
 *
 * Somebody is standing at a counter with a document on their phone. Every
 * step between them and a printed page is a step where they give up and hand
 * over a pen drive instead — so there is no account, no app, and no field
 * asked for that the shop does not need.
 *
 * Three things are on screen before anything else, because they are what the
 * pen drive cannot offer: the shop's own name (so they know they are in the
 * right place), the exact price before paying, and the promise that the file
 * deletes itself and nobody at the shop can open it.
 */

type StationView = {
  code: string;
  displayName: string;
  address: string | null;
  rates: { a4_mono: number; a4_color: number; a3_mono: number; a3_color: number };
  acceptingOrders: boolean;
  autoDeleteMinutes: number;
  agentConnected: boolean;
};

/*
  What a phone will offer.

  .webp is here because that is what WhatsApp and Android screenshots hand
  over, and this page promises "photo". Leaving it out meant a customer
  picking their own photo and being told the file type was invalid.
*/
const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.webp,.docx";

export function StationPrintFlow({ station }: { station: StationView }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const [uploading, setUploading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ jobNumber: string; pin: string | null } | null>(null);
  const [mobile, setMobile] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [pages, setPages] = useState(1);
  const [copies, setCopies] = useState(1);
  const [paperSize, setPaperSize] = useState<"A4" | "A3">("A4");
  const [colorMode, setColorMode] = useState<"mono" | "color">("mono");

  const rate = station.rates[`${paperSize.toLowerCase()}_${colorMode}` as keyof StationView["rates"]];
  const total = useMemo(
    () => Math.round(rate * Math.max(1, pages) * Math.max(1, copies) * 100) / 100,
    [rate, pages, copies],
  );

  /* The counter is shut, or its computer is not answering. Said here, before
     anybody pays — the old flow took the money and queued a job nothing would
     ever pick up. */
  const closed = !station.acceptingOrders;

  /* ── The file goes up as soon as it is chosen ────────────────────────
     A customer who picks a file and then waits at the payment step for an
     upload they did not know was happening assumes the page has hung. It
     also means the page count comes back before the price is shown. */

  const chooseFile = async (picked: File | null) => {
    setError(null);
    setUploaded(null);
    setFile(picked);
    if (!picked) return;

    if (picked.size > 20 * 1024 * 1024) {
      setError("That file is over 20 MB. Please send a smaller one.");
      setFile(null);
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", picked);
      const response = await fetch("/api/print/jobs/upload", { method: "POST", body: form });
      const data = (await response.json()) as Uploaded & { error?: string };
      if (!response.ok) throw new Error(data.error || "That file could not be sent.");

      setUploaded(data);
      setPages(data.pages && data.pages > 0 ? data.pages : 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That file could not be sent.");
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  /* ── Pay, then print ─────────────────────────────────────────────────
     Three server calls in order: record the job, open an order against it,
     and only mark it ready to print once the payment is verified. The job
     carries this counter's code, so it lands in this shop's queue and
     nobody else's. */

  const payAndPrint = async () => {
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      setError("Please enter your 10-digit mobile number.");
      return;
    }
    if (!uploaded) {
      setError("Please choose a file first.");
      return;
    }
    if (!window.Razorpay || !razorpayReady) {
      setError("Payment is still loading. Try again in a moment.");
      return;
    }

    setError(null);
    setPaying(true);

    try {
      const createResponse = await fetch("/api/print/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_mobile: cleanMobile,
          copies,
          pages,
          paper_size: paperSize,
          color_mode: colorMode,
          file_name: uploaded.file_name,
          file_size: uploaded.file_size,
          mime_type: uploaded.mime_type,
          storage_path: uploaded.storage_path,
          /*
            No amount is sent on purpose.

            The counter's rates live on the server, and the price the customer
            pays is computed there. A figure from the browser would be one more
            thing that could disagree with what the shop actually charges.
          */
          station_code: station.code,
        }),
      });
      const created = (await createResponse.json()) as {
        job_id?: string;
        job_number?: string;
        pickup_pin?: string | null;
        error?: string;
      };
      if (!createResponse.ok || !created.job_id) {
        throw new Error(created.error || "Could not start this print job.");
      }

      const orderResponse = await fetch("/api/print/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: created.job_id }),
      });
      const order = (await orderResponse.json()) as {
        order_id?: string;
        // Razorpay's SDK types this as string | number depending on version.
        amount?: number | string;
        currency?: string;
        error?: string;
      };
      if (!orderResponse.ok || !order.order_id) {
        throw new Error(order.error || "Could not open payment.");
      }

      /*
        The publishable key is a build-time public value, exactly as every
        other payment on this site reads it. Expecting the order response to
        carry one was my own invention — it never has, so this threw "Payment
        is not configured" on a counter that was configured perfectly well.
      */
      const publishableKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!publishableKey) {
        throw new Error("Payments are not switched on yet. Please pay at the desk.");
      }

      const amountPaise = Number(order.amount);
      if (!Number.isFinite(amountPaise)) {
        throw new Error("Could not read the amount to charge. Nothing has been charged.");
      }

      const checkout = new window.Razorpay({
        key: publishableKey,
        amount: amountPaise,
        currency: order.currency ?? "INR",
        name: station.displayName,
        description: `Print ${created.job_number}`,
        order_id: order.order_id,
        prefill: { contact: cleanMobile },
        theme: { color: "#001d5f" },
        modal: {
          // Paying is the customer's decision until the very last tap.
          ondismiss: () => setPaying(false),
        },
        handler: (response) => {
          void (async () => {
          try {
            const verifyResponse = await fetch("/api/print/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                job_id: created.job_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verified = (await verifyResponse.json()) as { error?: string };
            if (!verifyResponse.ok) throw new Error(verified.error || "Payment could not be confirmed.");

            setDone({ jobNumber: created.job_number ?? "", pin: created.pickup_pin ?? null });
          } catch (caught) {
            setError(
              caught instanceof Error
                ? `${caught.message} Your money is safe — show this screen at the desk.`
                : "Payment could not be confirmed. Show this screen at the desk.",
            );
          } finally {
            setPaying(false);
          }
          })();
        },
      });

      checkout.on("payment.failed", () => {
        setError("Payment did not go through. Nothing has been charged.");
        setPaying(false);
      });

      checkout.open();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setPaying(false);
    }
  };

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--dc-sky-soft)] px-[var(--mobile-page-gutter)] py-10">
        <div className="lg-card w-full max-w-sm p-6 text-center">
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white"
            style={{ background: "var(--dc-grad-blue)" }}
          >
            <Check className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-[1.3rem] font-extrabold text-[var(--dc-ink)]">Paid. Printing now.</h1>
          <p className="mt-1.5 text-[13px] font-medium leading-[1.6] text-[var(--dc-body)]">
            Your pages are coming out at {station.displayName}. Collect them at the desk.
          </p>

          {done.pin ? (
            <div className="mt-5 rounded-2xl bg-[var(--dc-sky-soft)] px-4 py-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-body)]">
                Say this at the desk
              </p>
              <p className="mt-1 font-mono text-[2rem] font-extrabold tracking-[0.2em] text-[var(--dc-ink)]">
                {done.pin}
              </p>
            </div>
          ) : null}

          <p className="mt-4 text-[11.5px] font-semibold text-[var(--dc-body)]">
            {done.jobNumber} · your file deletes itself in {station.autoDeleteMinutes} minutes
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--dc-sky-soft)] pb-16">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
      />
      {/* ── Whose counter this is ──────────────────────────────────────── */}
      <header
        className="dc-ambient relative isolate overflow-hidden px-[var(--mobile-page-gutter)] py-7 text-white sm:px-6 sm:py-9"
        style={{ background: "var(--dc-grad-blue)" }}
      >
        <div className="dc-ambient-layer" aria-hidden="true">
          <div className="dc-jaali absolute inset-0 opacity-[0.07]" />
        </div>
        <div className="relative mx-auto w-full max-w-lg">
          <span className="lg-pill-dark inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold">
            <Store className="h-3.5 w-3.5" aria-hidden="true" />
            {station.code}
          </span>
          <h1 className="mt-3 text-[1.6rem] font-extrabold leading-tight tracking-[-0.025em] sm:text-[2rem]">
            {station.displayName}
          </h1>
          {station.address ? (
            <p className="mt-1 text-[13px] font-medium text-white/70">{station.address}</p>
          ) : null}
          <p className="mt-3 text-[13.5px] font-semibold text-white/80">
            Upload, pay, collect. No app, no pen drive.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-3 px-[var(--mobile-page-gutter)] py-5 sm:px-6">
        {/* ── The promise ──────────────────────────────────────────────── */}
        <div className="lg-card flex items-start gap-3 p-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: "var(--dc-grad-flame)" }}
          >
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">Nobody here opens your file</p>
            <p className="mt-1 text-[12.5px] font-medium leading-[1.55] text-[var(--dc-body)]">
              It goes straight to the printer and is deleted after{" "}
              <strong className="font-extrabold text-[var(--dc-ink)]">
                {station.autoDeleteMinutes} minutes
              </strong>{" "}
              — printed or not. The shop cannot see it, download it, or keep it.
            </p>
          </div>
        </div>

        {closed ? (
          <div className="lg-card flex items-start gap-3 border-l-4 border-l-[var(--dc-flame)] p-4">
            <X className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
            <div>
              <p className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">This counter is closed</p>
              <p className="mt-1 text-[12.5px] font-medium text-[var(--dc-body)]">
                Please ask at the desk. Nothing has been charged.
              </p>
            </div>
          </div>
        ) : null}

        {/* ── The file ─────────────────────────────────────────────────── */}
        <div className={cn("lg-card p-4 sm:p-5", closed && "pointer-events-none opacity-50")}>
          <h2 className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">1 · Your file</h2>

          <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--dc-ink)]/15 px-4 py-7 text-center transition hover:border-[var(--dc-blue-bright)]/40">
            <FileUp className="h-7 w-7 text-[var(--dc-blue-mid)]" aria-hidden="true" />
            <span className="mt-2 text-[13.5px] font-bold text-[var(--dc-ink)]">
              {file ? file.name : "Choose a file"}
            </span>
            <span className="mt-0.5 text-[11.5px] font-medium text-[var(--dc-body)]">
              PDF, photo or Word · up to 20 MB
            </span>
            <input
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              disabled={uploading || paying}
              onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
            />
          </label>

          {uploading ? (
            <p className="mt-2.5 flex items-center gap-2 text-[12.5px] font-bold text-[var(--dc-body)]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Sending your file&hellip;
            </p>
          ) : null}

          {uploaded ? (
            <p className="mt-2.5 flex items-center gap-2 text-[12.5px] font-bold text-[#0f9d58]">
              <Check className="h-4 w-4" aria-hidden="true" />
              Ready &middot; {pages} {pages === 1 ? "page" : "pages"} detected
            </p>
          ) : null}
        </div>

        {/* ── How to print it ──────────────────────────────────────────── */}
        <div className={cn("lg-card p-4 sm:p-5", closed && "pointer-events-none opacity-50")}>
          <h2 className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">2 · How to print it</h2>

          <div className="mt-3 space-y-3">
            <Choice
              label="Paper"
              options={[
                { value: "A4", label: "A4" },
                { value: "A3", label: "A3" },
              ]}
              value={paperSize}
              onChange={(value) => setPaperSize(value as "A4" | "A3")}
            />
            <Choice
              label="Colour"
              options={[
                { value: "mono", label: `Black & white · ₹${station.rates[`${paperSize.toLowerCase()}_mono` as keyof StationView["rates"]]}/page` },
                { value: "color", label: `Colour · ₹${station.rates[`${paperSize.toLowerCase()}_color` as keyof StationView["rates"]]}/page` },
              ]}
              value={colorMode}
              onChange={(value) => setColorMode(value as "mono" | "color")}
            />

            <div className="grid grid-cols-2 gap-2.5">
              <Counter label="Pages" value={pages} onChange={setPages} />
              <Counter label="Copies" value={copies} onChange={setCopies} />
            </div>
          </div>
        </div>

        {/* ── What it costs ────────────────────────────────────────────── */}
        <div className="lg-card p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-bold text-[var(--dc-body)]">
              {pages} {pages === 1 ? "page" : "pages"} × {copies} {copies === 1 ? "copy" : "copies"} × ₹{rate}
            </span>
            <span className="text-[1.6rem] font-extrabold tracking-[-0.02em] text-[var(--dc-ink)] tabular-nums">
              ₹{total}
            </span>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[12px] font-extrabold text-[var(--dc-ink)]">
              Your mobile number
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              value={mobile}
              onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10 digits"
              className="lg-field h-12 w-full rounded-xl px-3.5 text-[15px] font-bold tracking-[0.04em] text-[var(--dc-ink)]"
            />
            <span className="mt-1 block text-[11px] font-medium text-[var(--dc-body)]">
              Only so the shop can find your job. Nothing else is sent to you.
            </span>
          </label>

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border-l-4 border-l-[var(--dc-flame)] bg-[var(--dc-flame)]/8 px-3.5 py-2.5 text-[12.5px] font-semibold text-[var(--dc-flame)]"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void payAndPrint()}
            disabled={closed || !uploaded || uploading || paying || mobile.length < 10}
            className="mt-4 inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold text-white transition disabled:opacity-40"
            style={{ background: "var(--dc-grad-blue)" }}
          >
            {paying ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
            ) : (
              <Printer className="h-4.5 w-4.5" aria-hidden="true" />
            )}
            {paying ? "Opening payment\u2026" : `Pay \u20b9${total} and print`}
          </button>

          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-[var(--dc-body)]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            You pay only after choosing. Nothing is charged until you tap.
          </p>
        </div>

        {!station.agentConnected && !closed ? (
          <p className="flex items-start gap-2 rounded-xl bg-[var(--dc-amber)]/15 px-3.5 py-2.5 text-[12px] font-semibold text-[var(--dc-flame)]">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            This counter&rsquo;s printer is not responding right now. Your job would wait in the queue — please
            check at the desk before paying.
          </p>
        ) : null}
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pieces
   ───────────────────────────────────────────────────────────────────────── */

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-body)]">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              "min-h-11 rounded-xl px-3 py-2 text-[12.5px] font-bold transition",
              value === option.value ? "text-white" : "lg-pill text-[var(--dc-body)]",
            )}
            style={value === option.value ? { background: "var(--dc-grad-blue)" } : undefined}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * A number with buttons, not a keyboard.
 *
 * Typed on a phone at a counter, a bare number field opens a keypad over the
 * page and hides the price the person is deciding on.
 */
function Counter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-body)]">
        {label}
      </p>
      <div className="lg-field flex h-12 items-center justify-between rounded-xl px-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          aria-label={`One fewer ${label.toLowerCase()}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[18px] font-extrabold text-[var(--dc-blue-mid)]"
        >
          −
        </button>
        <span className="text-[15px] font-extrabold tabular-nums text-[var(--dc-ink)]">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(999, value + 1))}
          aria-label={`One more ${label.toLowerCase()}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[18px] font-extrabold text-[var(--dc-blue-mid)]"
        >
          +
        </button>
      </div>
    </div>
  );
}
