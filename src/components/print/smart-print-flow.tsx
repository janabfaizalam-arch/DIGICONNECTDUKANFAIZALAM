"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Script from "next/script";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Check,
  ClipboardList,
  CreditCard,
  FileStack,
  FileText,
  IdCard,
  Image as ImageIcon,
  Images,
  Loader2,
  Printer,
  RotateCw,
  ShieldCheck,
  Sun,
  Trash2,
  UserSquare,
} from "lucide-react";

import {
  composeSheet,
  loadImage,
  previewDataUrl,
  sheetToFile,
  type ImageAdjustments,
  type LoadedImage,
} from "@/lib/print/compose-sheet";
import {
  ID_CARD,
  PAPER_SIZES,
  PHOTO_SIZES,
  gridPlan,
  idCardPlan,
  singlePlan,
  type SheetPlan,
} from "@/lib/print/sheet-layout";
import {
  FINISH_LABELS,
  QUALITY_LABELS,
  QUANTITY_CHOICES,
  SMART_PRINT_SERVICES,
  settingsFor,
  type SmartPrintService,
  type SmartPrintSettings,
} from "@/lib/print/smart-print";
import { toPrintableImage } from "@/lib/print/printable-image";
import { quote } from "@/lib/print/smart-pricing";
import type { PrintRates } from "@/lib/print/stations";
import { cn } from "@/lib/utils";

/**
 * DigiConnect Smart Print, from the customer's side.
 *
 * A print shop's counter is a conversation: how many, what size, glossy or
 * plain, both sides on one page. This is that conversation, in the order a
 * person thinks in — what am I printing, here it is, does this look right,
 * pay — with everything technical either decided by the service or set once
 * by the shop.
 *
 * The sheet is composed here, in the browser, from the tested geometry in
 * sheet-layout.ts. What the customer approves on screen is the same file the
 * printer receives; there is no second layout engine anywhere to disagree
 * with this one.
 */

const ICONS: Record<string, typeof Printer> = {
  IdCard,
  UserSquare,
  Image: ImageIcon,
  FileText,
  ClipboardList,
  Award,
  CreditCard,
  Images,
  FileStack,
  Printer,
};

export type SmartStationView = {
  code: string;
  displayName: string;
  address: string | null;
  rates: PrintRates;
  acceptingOrders: boolean;
  agentConnected: boolean;
  autoDeleteMinutes: number;
  defaults: Record<string, Partial<SmartPrintSettings>>;
};

type Step = "service" | "build" | "done";

type Uploaded = { file_name: string; file_size: number; mime_type: string; storage_path: string; pages?: number };

/*
  Window.Razorpay is declared once, in the payments button. Declaring it a
  second time here made the two disagree about the handler's argument, which
  is a compile error rather than a runtime one — but it would also have been
  two truths about the same global.
*/

export function SmartPrintFlow({ station }: { station: SmartStationView }) {
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<SmartPrintService | null>(null);
  const [settings, setSettings] = useState<SmartPrintSettings | null>(null);

  const [images, setImages] = useState<(LoadedImage | null)[]>([]);
  const [rawFiles, setRawFiles] = useState<(File | null)[]>([]);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobile, setMobile] = useState("");
  const [done, setDone] = useState<{ jobId: string; jobNumber: string; pin: string | null } | null>(null);
  /*
    The checkout script.

    Loaded on the page rather than fetched at the moment of payment: a
    customer at a counter on a shop's wifi should not wait for a third party
    after deciding to pay. The Pay button stays disabled until it is here.
  */
  const [payReady, setPayReady] = useState(false);

  const closed = !station.acceptingOrders;
  const offline = !station.agentConnected;

  /* ── The sheet, and what it costs ─────────────────────────────────── */

  const plan = useMemo<SheetPlan | null>(() => {
    if (!service || !settings || !service.composes) return null;
    const paper = PAPER_SIZES[settings.paper] ?? PAPER_SIZES.A4;

    if (service.id === "passport_photo") {
      const size =
        settings.photoSize === "custom" && settings.customPhoto
          ? settings.customPhoto
          : PHOTO_SIZES[(settings.photoSize ?? "35x45") as keyof typeof PHOTO_SIZES];
      return gridPlan(paper, size, settings.photoCount ?? 12);
    }

    if (service.id === "id_copy") {
      return idCardPlan(paper, settings.arrangement ?? "stacked", 1);
    }

    if (service.id === "id_card_sheet") {
      return gridPlan(paper, ID_CARD, settings.perPage ?? 4, { margin: 10, gutter: 6 });
    }

    if (service.id === "multi_photo" || service.id === "image_to_pdf") {
      const count = Math.max(1, images.filter(Boolean).length);
      const first = images.find(Boolean);
      if (!first) return null;
      // Square-ish cells sized to the sheet, so ten holiday photos land as a
      // tidy contact sheet rather than ten different shapes.
      const cell = { width: paper.width / 3 - 8, height: (paper.width / 3 - 8) * (first.height / first.width) };
      return gridPlan(paper, cell, count, { margin: 8, gutter: 4 });
    }

    if (service.id === "photo_print") {
      const first = images.find(Boolean);
      if (!first) return null;
      return singlePlan(paper, first, "fit", settings.border ? 5 : 0);
    }

    return null;
  }, [service, settings, images]);

  const sheets = plan?.sheets ?? 1;
  const priced = useMemo(
    () => (settings ? quote(station.rates, settings, sheets) : null),
    [station.rates, settings, sheets],
  );

  /* ── The preview, redrawn whenever anything changes ───────────────── */

  const redraw = useCallback(() => {
    if (!plan || !plan.slots.length) {
      setPreview(null);
      return;
    }
    const ready = images.filter(Boolean) as LoadedImage[];
    if (!ready.length) {
      setPreview(null);
      return;
    }
    try {
      // Drawn small for the screen; the full-resolution sheet is composed
      // again at 300 DPI only when the customer pays.
      const canvas = composeSheet({ plan, images: ready, adjustments, dpi: 110 });
      setPreview(previewDataUrl(canvas));
    } catch {
      setPreview(null);
    }
  }, [plan, images, adjustments]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  /* ── Choosing a service ───────────────────────────────────────────── */

  const chooseService = (picked: SmartPrintService) => {
    setService(picked);
    setSettings(settingsFor(picked, station.defaults));
    setImages(new Array(picked.uploads.max).fill(null));
    setRawFiles(new Array(picked.uploads.max).fill(null));
    setAdjustments({});
    setPreview(null);
    setError(null);
    setStep("build");
  };

  const update = (patch: Partial<SmartPrintSettings>) => {
    setSettings((current) => (current ? { ...current, ...patch } : current));
  };

  /* ── Files ────────────────────────────────────────────────────────── */

  const pickFile = async (index: number, file: File | null) => {
    setError(null);
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError("That file is over 25 MB. Please choose a smaller one.");
      return;
    }

    setRawFiles((current) => {
      const next = [...current];
      next[index] = file;
      return next;
    });

    if (!service?.composes || !file.type.startsWith("image/")) return;

    setBusy("Opening your picture…");
    try {
      const loaded = await loadImage(file);
      setImages((current) => {
        const next = [...current];
        next[index] = loaded;
        return next;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That picture could not be opened.");
    } finally {
      setBusy(null);
    }
  };

  const removeFile = (index: number) => {
    setImages((current) => {
      const next = [...current];
      next[index] = null;
      return next;
    });
    setRawFiles((current) => {
      const next = [...current];
      next[index] = null;
      return next;
    });
  };

  const filled = rawFiles.filter(Boolean).length;
  const enough = service ? filled >= service.uploads.min : false;

  /* ── Pay ──────────────────────────────────────────────────────────── */

  const payAndPrint = async () => {
    if (!service || !settings || !priced) return;

    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      setError("Please enter your 10-digit mobile number.");
      return;
    }
    if (!enough) {
      setError("Please add your file first.");
      return;
    }
    if (!window.Razorpay || !payReady) {
      setError("Payment is still loading. Try again in a moment.");
      return;
    }

    setError(null);
    setBusy("Preparing your sheet…");

    try {
      /*
        The file that goes up.

        For a composed service it is the sheet itself, drawn again at 300 DPI
        — the preview on screen is the same drawing at a size a phone can
        hold. For a PDF or a document it is the customer's own file,
        untouched.
      */
      let sending: File;
      if (service.composes && plan) {
        const ready = images.filter(Boolean) as LoadedImage[];
        const canvas = composeSheet({ plan, images: ready, adjustments, dpi: 300 });
        sending = await sheetToFile(canvas, `${service.id}-${settings.paper}.png`);
      } else {
        const original = rawFiles.find(Boolean);
        if (!original) throw new Error("Please add your file first.");
        /*
          A WebP that goes up untouched is a job that fails at the printer:
          Windows has no PrintTo handler for it and GDI+ cannot decode it,
          and a modern Android camera saves WebP by default. A composed sheet
          is already a PNG; this is for the files we pass through.
        */
        sending = await toPrintableImage(original);
      }

      setBusy("Sending your file…");
      const form = new FormData();
      form.append("file", sending);
      const uploadResponse = await fetch("/api/print/jobs/upload", { method: "POST", body: form });
      const uploaded = (await uploadResponse.json()) as Uploaded & { error?: string };
      if (!uploadResponse.ok) throw new Error(uploaded.error || "That file could not be sent.");

      setBusy("Opening payment…");
      const createResponse = await fetch("/api/print/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_mobile: cleanMobile,
          copies: settings.copies,
          pages: service.composes ? sheets : uploaded.pages || 1,
          paper_size: settings.paper === "A3" ? "A3" : "A4",
          color_mode: settings.color,
          file_name: uploaded.file_name,
          file_size: uploaded.file_size,
          mime_type: uploaded.mime_type,
          storage_path: uploaded.storage_path,
          station_code: station.code,
          service_type: service.id,
          settings,
          sheet_count: sheets,
        }),
      });
      const created = (await createResponse.json()) as {
        job_id?: string;
        job_number?: string;
        pickup_pin?: string | null;
        error?: string;
      };
      if (!createResponse.ok || !created.job_id) {
        throw new Error(created.error || "Your order could not be started.");
      }

      const orderResponse = await fetch("/api/print/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: created.job_id }),
      });
      const order = (await orderResponse.json()) as {
        order_id?: string;
        amount?: number;
        currency?: string;
        error?: string;
      };
      if (!orderResponse.ok || !order.order_id) {
        throw new Error(order.error || "Payment could not be started.");
      }

      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) throw new Error("Payments are not switched on yet. Please pay at the desk.");

      setBusy(null);
      const amountPaise = Number(order.amount);
      if (!Number.isFinite(amountPaise)) {
        throw new Error("Could not read the amount to charge. Nothing has been charged.");
      }

      const checkout = new window.Razorpay({
        key,
        amount: amountPaise,
        currency: order.currency ?? "INR",
        name: station.displayName,
        description: `${service.label} · ${created.job_number}`,
        order_id: order.order_id,
        prefill: { contact: cleanMobile },
        theme: { color: "#0f5db8" },
        modal: { ondismiss: () => setBusy(null) },
        handler: (response) => {
          void (async () => {
            try {
              const verify = await fetch("/api/print/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  job_id: created.job_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verified = (await verify.json()) as { error?: string };
              if (!verify.ok) throw new Error(verified.error || "Payment could not be confirmed.");

              setDone({
                jobId: String(created.job_id ?? ""),
                jobNumber: created.job_number ?? "",
                pin: created.pickup_pin ?? null,
              });
              setStep("done");
            } catch (caught) {
              setError(
                caught instanceof Error
                  ? `${caught.message} Your money is safe — show this screen at the desk.`
                  : "Payment could not be confirmed. Show this screen at the desk.",
              );
            }
          })();
        },
      });

      checkout.on("payment.failed", () => {
        setError("Payment did not go through. Nothing has been charged.");
        setBusy(null);
      });

      checkout.open();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setBusy(null);
    }
  };

  /* ── Screens ──────────────────────────────────────────────────────── */

  if (step === "done" && done) {
    return <OrderDone station={station} done={done} onAnother={() => {
      setDone(null);
      setService(null);
      setSettings(null);
      setImages([]);
      setRawFiles([]);
      setPreview(null);
      setStep("service");
    }} />;
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] pb-[calc(120px+env(safe-area-inset-bottom))]">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setPayReady(true)}
      />
      <Header station={station} onBack={step === "build" ? () => setStep("service") : undefined} title={service?.label} />

      {step === "service" ? (
        <ServicePicker station={station} onPick={chooseService} closed={closed} />
      ) : service && settings ? (
        <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
          <Uploads
            service={service}
            rawFiles={rawFiles}
            onPick={pickFile}
            onRemove={removeFile}
            busy={busy}
          />

          {preview ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-3">
              <p className="px-1 pb-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                Aisa print hoga
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="How your sheet will print"
                className="mx-auto w-full max-w-[300px] rounded-xl border border-slate-200 shadow-sm"
              />
              {service.composes && plan ? (
                <p className="pt-2 text-center text-[12px] font-bold text-slate-600">
                  {plan.slots.length} {plan.slots.length === 1 ? "item" : "items"} · {settings.paper}
                  {sheets > 1 ? ` · ${sheets} sheets` : ""}
                </p>
              ) : null}
            </section>
          ) : null}

          {/*
            Only where retouching is the right answer.

            This card offered brightness and contrast on an Aadhaar card,
            which is the one place it must not: a document with its contrast
            pushed up is a document an office can refuse. Photographs get the
            tools; documents get left alone.
          */}
          {service.retouch && images.some(Boolean) ? (
            <PhotoTools adjustments={adjustments} onChange={setAdjustments} />
          ) : null}

          <Settings service={service} settings={settings} onChange={update} />

          <label className="block rounded-3xl border border-slate-200 bg-white p-4">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
              Aapka mobile number
            </span>
            <input
              value={mobile}
              onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              placeholder="10 digits"
              className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3.5 text-[15px] font-bold text-slate-900 outline-none focus:border-blue-500"
            />
            <span className="mt-1.5 block text-[11.5px] font-medium text-slate-500">
              Sirf isliye ki dukaan aapka kaam dhoondh sake.
            </span>
          </label>

          {offline && !closed ? (
            <div
              role="alert"
              className="rounded-2xl border-l-4 border-l-[#f25a00] bg-orange-50 px-3.5 py-3"
            >
              <p className="text-[13px] font-black text-[#c9430a]">
                This counter&rsquo;s computer is not responding
              </p>
              <p className="mt-1 text-[12px] font-semibold leading-snug text-slate-600">
                Kuch print nahi hoga, isliye payment band hai. Dukaan par kahiye ki printer wala
                computer chalu kar dein.
              </p>
            </div>
          ) : null}

          {closed ? (
            <p role="alert" className="rounded-2xl border-l-4 border-l-[#f25a00] bg-orange-50 px-3.5 py-3 text-[13px] font-black text-[#c9430a]">
              This counter is closed right now. Please ask at the desk.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-xl border-l-4 border-l-[#f25a00] bg-orange-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-[#c9430a]">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === "build" && settings && priced ? (
        <PriceBar
          priced={priced}
          busy={busy}
          disabled={!enough || closed || offline || mobile.length < 10 || !payReady}
          label={closed ? "Counter band hai" : offline ? "Printer se sampark nahi" : `₹${priced.total} — Pay & print`}
          onPay={() => void payAndPrint()}
        />
      ) : null}
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pieces
   ───────────────────────────────────────────────────────────────────────── */

function Header({
  station,
  title,
  onBack,
}: {
  station: SmartStationView;
  title?: string;
  onBack?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition active:scale-95 hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          <Image src="/logo-navbar.png" alt="DigiConnect Dukan" width={120} height={30} className="h-6 w-auto" priority />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black leading-tight text-slate-900">
            {title ?? "Smart Print"}
          </p>
          <p className="truncate text-[11px] font-semibold text-slate-500">{station.displayName}</p>
        </div>
      </div>
    </header>
  );
}

function ServicePicker({
  station,
  onPick,
  closed,
}: {
  station: SmartStationView;
  onPick: (service: SmartPrintService) => void;
  closed: boolean;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 pt-5">
      <h1 className="text-[1.5rem] font-black leading-tight tracking-tight text-slate-900">Smart Print</h1>
      <p className="mt-1 text-[13px] font-semibold text-slate-500">
        Upload • Customize • Preview • Pay • Print
      </p>

      {closed ? (
        <p className="mt-4 rounded-2xl border-l-4 border-l-[#f25a00] bg-orange-50 px-4 py-3 text-[13px] font-bold text-[#c9430a]">
          Ye counter abhi band hai. Dukaan par pooch lijiye.
        </p>
      ) : null}

      <p className="mt-5 text-[15px] font-black text-slate-900">Kya print karna hai?</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {SMART_PRINT_SERVICES.map((service) => {
          const Icon = ICONS[service.icon] ?? Printer;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onPick(service)}
              className="flex min-h-[112px] flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition active:scale-[0.98] hover:border-blue-300 hover:shadow-sm"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ background: "linear-gradient(140deg,#2f80ed,#0f5db8)" }}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-[13.5px] font-black leading-tight text-slate-900">{service.label}</span>
              <span className="text-[11.5px] font-medium leading-snug text-slate-500">{service.blurb}</span>
            </button>
          );
        })}
      </div>

      {/*
        Said before anything is uploaded, not in a policy page.

        Somebody is about to hand a shop their Aadhaar from a phone. What
        happens to that file afterwards is the first thing they are owed, and
        the number comes from the shop's own setting rather than a promise
        this page invents.
      */}
      <p className="mt-5 flex items-start gap-2 rounded-2xl bg-white px-3.5 py-3 text-[11.5px] font-semibold leading-snug text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5db8]" aria-hidden />
        Nobody here opens your file. It goes straight to the printer and deletes itself in{" "}
        {station.autoDeleteMinutes} minutes — whether the print worked or not.
      </p>
    </div>
  );
}

function Uploads({
  service,
  rawFiles,
  onPick,
  onRemove,
  busy,
}: {
  service: SmartPrintService;
  rawFiles: (File | null)[];
  onPick: (index: number, file: File | null) => void;
  onRemove: (index: number) => void;
  busy: string | null;
}) {
  const slots = service.uploads.labels ?? Array.from({ length: service.uploads.max }, (_, i) => `File ${i + 1}`);
  const shown = service.uploads.max > 4 ? slots.slice(0, Math.max(service.uploads.min, rawFiles.filter(Boolean).length + 1)) : slots;
  const accept =
    service.uploads.accept === "image" ? "image/*" : service.uploads.accept === "document" ? ".pdf" : "image/*,.pdf";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
        {service.uploads.max > 1 ? "Files" : "File"}
      </p>
      <div className={cn("mt-3 grid gap-2.5", shown.length > 1 && "grid-cols-2")}>
        {shown.map((label, index) => {
          const file = rawFiles[index];
          return (
            <div key={label} className="min-w-0">
              {file ? (
                <div className="flex min-h-[76px] flex-col justify-between rounded-2xl border border-blue-200 bg-blue-50/60 p-2.5">
                  <p className="truncate text-[12px] font-bold text-slate-900">{file.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {Math.round(file.size / 1024)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      aria-label={`Remove ${label}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-[#c9430a]"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex min-h-[76px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 p-2.5 text-center transition hover:border-blue-400">
                  <span className="text-[12.5px] font-bold text-slate-700">{label}</span>
                  <span className="text-[11px] font-semibold text-blue-700">Tap to add</span>
                  <input
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={(event) => void onPick(index, event.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
      {busy ? (
        <p className="mt-2.5 flex items-center gap-2 text-[12px] font-semibold text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {busy}
        </p>
      ) : null}
    </section>
  );
}

/**
 * The adjustments a phone photo actually needs.
 *
 * Brightness, contrast and a quarter turn cover the real complaints at a
 * counter — a dark photo, a flat one, a picture the phone saved sideways.
 * Background removal and anything that changes a face are deliberately absent:
 * those need a service this shop has not chosen, and an ID photo is the last
 * place to guess.
 */
function PhotoTools({
  adjustments,
  onChange,
}: {
  adjustments: ImageAdjustments;
  onChange: (next: ImageAdjustments) => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Photo theek kijiye</p>

      <div className="mt-3 space-y-3">
        <Slider
          icon={<Sun className="h-4 w-4" aria-hidden />}
          label="Roshni"
          value={adjustments.brightness ?? 1}
          onChange={(brightness) => onChange({ ...adjustments, brightness })}
        />
        <Slider
          label="Contrast"
          value={adjustments.contrast ?? 1}
          onChange={(contrast) => onChange({ ...adjustments, contrast })}
        />

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => onChange({ ...adjustments, rotate: (((adjustments.rotate ?? 0) + 1) % 4) as 0 | 1 | 2 | 3 })}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[12.5px] font-bold text-slate-700 active:scale-95"
          >
            <RotateCw className="h-4 w-4" aria-hidden />
            Ghumaiye
          </button>
          <button
            type="button"
            onClick={() => onChange({})}
            className="inline-flex h-10 items-center rounded-xl px-3 text-[12.5px] font-bold text-slate-500 active:scale-95"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}

function Slider({
  icon,
  label,
  value,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-600">
        {icon}
        {label}
      </span>
      <input
        type="range"
        min={0.6}
        max={1.6}
        step={0.05}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 h-11 w-full accent-[#0f5db8]"
      />
    </label>
  );
}

function Settings({
  service,
  settings,
  onChange,
}: {
  service: SmartPrintService;
  settings: SmartPrintSettings;
  onChange: (patch: Partial<SmartPrintSettings>) => void;
}) {
  const asks = new Set(service.asks);

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Settings</p>

      {asks.has("photoSize") ? (
        <Choice
          label="Photo size"
          value={String(settings.photoSize ?? "35x45")}
          options={Object.values(PHOTO_SIZES).map((size) => ({ value: size.id, label: size.label }))}
          onChange={(value) => onChange({ photoSize: value as SmartPrintSettings["photoSize"] })}
        />
      ) : null}

      {asks.has("photoCount") ? (
        <Choice
          label="Kitni photo"
          value={String(settings.photoCount ?? 12)}
          options={QUANTITY_CHOICES.photoCount.map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(value) => onChange({ photoCount: Number(value) })}
        />
      ) : null}

      {asks.has("arrangement") ? (
        <Choice
          label="Front aur back"
          value={settings.arrangement ?? "stacked"}
          options={[
            { value: "stacked", label: "Ek ke neeche ek" },
            { value: "side-by-side", label: "Aas-paas" },
            { value: "actual-size", label: "Asli card size" },
          ]}
          onChange={(value) => onChange({ arrangement: value as SmartPrintSettings["arrangement"] })}
        />
      ) : null}

      {asks.has("perPage") ? (
        <Choice
          label="Ek page par kitne card"
          value={String(settings.perPage ?? 4)}
          options={QUANTITY_CHOICES.perPage.map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(value) => onChange({ perPage: Number(value) })}
        />
      ) : null}

      {asks.has("paper") ? (
        <Choice
          label="Paper"
          value={settings.paper}
          options={Object.values(PAPER_SIZES)
            .filter((paper) => (service.id === "photo_print" ? true : !paper.photo))
            .map((paper) => ({ value: paper.id, label: paper.label }))}
          onChange={(value) => onChange({ paper: value })}
        />
      ) : null}

      {asks.has("color") ? (
        <Choice
          label="Rang"
          value={settings.color}
          options={[
            { value: "mono", label: "Black & white" },
            { value: "color", label: "Colour" },
          ]}
          onChange={(value) => onChange({ color: value as SmartPrintSettings["color"] })}
        />
      ) : null}

      {asks.has("finish") ? (
        <Choice
          label="Paper type"
          value={settings.finish}
          options={Object.entries(FINISH_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(value) => onChange({ finish: value as SmartPrintSettings["finish"] })}
        />
      ) : null}

      {asks.has("quality") ? (
        <Choice
          label="Quality"
          value={settings.quality}
          options={Object.entries(QUALITY_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(value) => onChange({ quality: value as SmartPrintSettings["quality"] })}
        />
      ) : null}

      {asks.has("border") ? (
        <Choice
          label="Border"
          value={settings.border ? "yes" : "no"}
          options={[
            { value: "no", label: "Borderless" },
            { value: "yes", label: "White border" },
          ]}
          onChange={(value) => onChange({ border: value === "yes" })}
        />
      ) : null}

      {asks.has("duplex") ? (
        <Choice
          label="Sides"
          value={settings.duplex ? "both" : "one"}
          options={[
            { value: "one", label: "Single side" },
            { value: "both", label: "Both sides" },
          ]}
          onChange={(value) => onChange({ duplex: value === "both" })}
        />
      ) : null}

      {asks.has("copies") ? (
        <Choice
          label="Copies"
          value={String(settings.copies)}
          options={QUANTITY_CHOICES.copies.map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(value) => onChange({ copies: Number(value) })}
        />
      ) : null}
    </section>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-[12px] font-bold text-slate-600">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={cn(
                "min-h-[44px] rounded-xl border px-3.5 text-[13px] font-bold transition active:scale-95",
                active
                  ? "border-[#0f5db8] bg-[#0f5db8] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PriceBar({
  priced,
  busy,
  disabled,
  label,
  onPay,
}: {
  priced: ReturnType<typeof quote>;
  busy: string | null;
  disabled: boolean;
  label: string;
  onPay: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
      <div className="mx-auto max-w-lg">
        {open ? (
          <ul className="mb-2.5 space-y-1 rounded-xl bg-slate-50 p-3">
            {priced.lines.map((line) => (
              <li key={line.label} className="flex items-baseline justify-between gap-3 text-[12px]">
                <span className="min-w-0 font-semibold text-slate-600">
                  {line.label}
                  {line.detail ? <span className="text-slate-400"> · {line.detail}</span> : null}
                </span>
                <span className="shrink-0 font-black tabular-nums text-slate-900">₹{line.amount}</span>
              </li>
            ))}
            <li className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-1.5 text-[12.5px]">
              <span className="font-black text-slate-900">
                {priced.sheets} {priced.sheets === 1 ? "sheet" : "sheets"}
              </span>
              <span className="font-black tabular-nums text-slate-900">₹{priced.total}</span>
            </li>
          </ul>
        ) : null}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="shrink-0 text-left"
            aria-expanded={open}
          >
            <span className="block text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Total</span>
            <span className="block text-[22px] font-black leading-none text-slate-900">₹{priced.total}</span>
          </button>

          <button
            type="button"
            onClick={onPay}
            disabled={disabled || Boolean(busy)}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-[14.5px] font-black text-white transition disabled:opacity-40"
            style={{ background: "linear-gradient(140deg,#2f80ed,#0f5db8)" }}
          >
            {busy ? <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden /> : <Printer className="h-4.5 w-4.5" aria-hidden />}
            {busy ?? label}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderDone({
  station,
  done,
  onAnother,
}: {
  station: SmartStationView;
  done: { jobId: string; jobNumber: string; pin: string | null };
  onAnother: () => void;
}) {
  /*
    What actually happened to the pages.

    "Payment successful" used to be the last word this screen said, whatever
    the printer did next — so a job nobody picked up and a job that failed
    outright both looked exactly like success to the person who had just paid.
    It asks the server every three seconds, and after seventy-five it stops
    pretending.
  */
  const [outcome, setOutcome] = useState<"waiting" | "printed" | "failed" | "slow">("waiting");

  useEffect(() => {
    if (!done.jobId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const check = async () => {
      try {
        const response = await fetch(`/api/print/jobs/status?job_id=${encodeURIComponent(done.jobId)}`, {
          cache: "no-store",
        });
        const json = (await response.json()) as { print_status?: string };
        if (cancelled) return;
        if (json.print_status === "printed") return setOutcome("printed");
        if (json.print_status === "failed") return setOutcome("failed");
      } catch {
        // A dropped request says nothing about the printer. Ask again.
      }
      if (cancelled) return;
      const waited = Date.now() - startedAt;
      if (waited > 75_000) setOutcome("slow");
      // Five minutes, then the answer is the desk's rather than this screen's.
      if (waited < 5 * 60_000) timer = setTimeout(() => void check(), 3000);
    };

    timer = setTimeout(() => void check(), 3000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [done.jobId]);

  const trouble = outcome === "failed" || outcome === "slow";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={{ background: trouble ? "#f25a00" : "linear-gradient(140deg,#2f80ed,#0f5db8)" }}
        >
          {trouble ? (
            <AlertTriangle className="h-7 w-7" aria-hidden />
          ) : outcome === "printed" ? (
            <Check className="h-7 w-7" aria-hidden />
          ) : (
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
          )}
        </span>
        <h1 className="mt-4 text-[1.3rem] font-black text-slate-900">
          {outcome === "printed"
            ? "Print ho gaya"
            : outcome === "failed"
              ? "The print did not go through."
              : outcome === "slow"
                ? "Not printed yet."
                : "Payment successful"}
        </h1>
        <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-slate-500">
          {outcome === "printed" ? (
            <>Kagaz {station.displayName} ke counter par taiyar hai.</>
          ) : outcome === "failed" ? (
            <>
              Ye screen counter par dikhaiye. Paise diye hain aur kagaz nahi mila, to unse print karwaiye
              ya paise wapas lijiye.
            </>
          ) : outcome === "slow" ? (
            <>
              {station.displayName} ke printer ne ise abhi tak nahi liya. Jane se pehle ye screen counter
              par dikhaiye.
            </>
          ) : (
            <>Aapka kaam {station.displayName} par pahunch gaya hai.</>
          )}
        </p>

        {done.pin ? (
          <div className="mt-5 rounded-2xl bg-[#f6f8fc] px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Say this at the desk
            </p>
            <p className="mt-1 font-mono text-[2rem] font-black tracking-[0.2em] text-slate-900">{done.pin}</p>
          </div>
        ) : null}

        <p className="mt-4 text-[11.5px] font-bold text-slate-500">
          Order {done.jobNumber} · file {station.autoDeleteMinutes} minute me delete
        </p>

        <button
          type="button"
          onClick={onAnother}
          className="mt-5 h-11 w-full rounded-xl border border-slate-200 text-[13.5px] font-bold text-slate-700 active:scale-[0.99]"
        >
          Ek aur print kariye
        </button>
      </div>
    </main>
  );
}
