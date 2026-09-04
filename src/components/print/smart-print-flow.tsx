"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Script from "next/script";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileText,
  IdCard,
  Loader2,
  Printer,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Sun,
  RotateCcw,
  Trash2,
  UserSquare,
  Wand2,
} from "lucide-react";

import {
  composeSheet,
  loadImage,
  previewDataUrl,
  sheetToFile,
  type ImageAdjustments,
  type LoadedImage,
} from "@/lib/print/compose-sheet";
import { PHOTO_EDITS, photoEdit, type PhotoEditId } from "@/lib/ai/photo-edits";
import { scanCard } from "@/lib/print/card-scan";
import { BACKDROPS, backdropColour, canChangeBackground, replaceBackground } from "@/lib/print/portrait";
import { PAPER_SIZES, PHOTO_SIZES, gridPlan, idCardPlan, type SheetPlan } from "@/lib/print/sheet-layout";
import {
  ASK_LABELS,
  FILTER_LABELS,
  FINISH_LABELS,
  QUALITY_LABELS,
  QUANTITY_CHOICES,
  SMART_PRINT_SERVICES,
  askedOf,
  settingsFor,
  type PartnerDefaults,
  type PhotoFilter,
  type SmartPrintAsk,
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
 * A print shop's counter is a conversation, and a short one: what are you
 * printing, hand it over, does this look right, pay. Everything technical is
 * either decided by the service or set once by the shop, so the customer is
 * asked four things rather than fourteen.
 *
 * The sheet is composed here, in the browser, from the tested geometry in
 * sheet-layout.ts. What the customer approves on screen is the same file the
 * printer receives; there is no second layout engine anywhere to disagree with
 * this one. The card cutout and the passport backdrop run here too, on the
 * customer's own phone — nobody's Aadhaar and nobody's face is sent away to be
 * processed.
 */

const ICONS: Record<string, typeof Printer> = { IdCard, UserSquare, FileText, Printer };

export type SmartStationView = {
  code: string;
  displayName: string;
  address: string | null;
  rates: PrintRates;
  acceptingOrders: boolean;
  agentConnected: boolean;
  autoDeleteMinutes: number;
  defaults: PartnerDefaults;
};

type Step = "service" | "build" | "done";

type Uploaded = { file_name: string; file_size: number; mime_type: string; storage_path: string; pages?: number };

/**
 * One uploaded picture and everything we have made of it.
 *
 * The customer's own image is never thrown away. Whatever the cutout or the
 * backdrop produces sits beside it, and a tap puts the original back — which
 * is the only honest way to ship an automatic edit to somebody's ID.
 */
type Slot = {
  file: File;
  /**
   * A URL for the thumbnail, owned by this slot.
   *
   * loadImage revokes the object URL it creates as soon as the picture has
   * decoded — which is right for its own use and left this thumbnail pointing
   * at nothing, so the customer saw a broken-image icon where their own photo
   * should be. This one is ours, and is revoked when the slot is cleared.
   */
  thumb: string;
  original: LoadedImage;
  edited: LoadedImage | null;
  /** What produced `edited`, so a changed choice rebuilds it. */
  editedFor: string | null;
  useEdited: boolean;
  note: string | null;
  /**
   * What Gemini sent back, and whether the customer accepted it.
   *
   * A separate field rather than reusing `edited`: the on-device backdrop
   * rebuilds `edited` whenever the colour changes, and an AI result dropped
   * into the same slot would be wiped by the next redraw. Keeping them apart
   * also keeps the promise this whole screen rests on — the customer's own
   * photograph is never replaced, only set beside something else.
   */
  ai: LoadedImage | null;
  aiEdit: PhotoEditId | null;
  useAi: boolean;
};

/*
  Window.Razorpay is declared once, in the payments button. Declaring it a
  second time here made the two disagree about the handler's argument, which
  is a compile error rather than a runtime one — but it would also have been
  two truths about the same global.
*/

const FILTERS: Record<PhotoFilter, ImageAdjustments> = {
  none: {},
  bright: { brightness: 1.12, saturation: 1.05 },
  sharp: { contrast: 1.22, saturation: 1.04 },
  soft: { brightness: 1.05, contrast: 0.94 },
  mono: { mono: true },
};

export function SmartPrintFlow({ station }: { station: SmartStationView }) {
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<SmartPrintService | null>(null);
  const [settings, setSettings] = useState<SmartPrintSettings | null>(null);

  const [slots, setSlots] = useState<(Slot | null)[]>([]);
  const [rawFiles, setRawFiles] = useState<(File | null)[]>([]);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
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
  const asks = useMemo(() => (service ? askedOf(service, station.defaults) : []), [service, station.defaults]);

  /** The picture that would actually be printed for each slot. */
  const images = useMemo(
    () =>
      slots.map((slot) => {
        if (!slot) return null;
        if (slot.useAi && slot.ai) return slot.ai;
        return slot.useEdited && slot.edited ? slot.edited : slot.original;
      }),
    [slots],
  );

  /** How many sides of a card the customer actually gave us. */
  const sides = Math.min(2, Math.max(1, images.filter(Boolean).length)) as 1 | 2;

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
      // One side uploaded means one card on the page, not the front twice.
      return idCardPlan(paper, settings.arrangement ?? "stacked", 1, sides);
    }

    return null;
  }, [service, settings, sides]);

  const sheets = plan?.sheets ?? 1;
  const priced = useMemo(
    () => (settings ? quote(station.rates, settings, sheets) : null),
    [station.rates, settings, sheets],
  );

  /** The service's filter and the customer's own sliders, in that order. */
  const look = useMemo<ImageAdjustments>(
    () => ({ ...FILTERS[(settings?.filter ?? "none") as PhotoFilter], ...adjustments }),
    [settings?.filter, adjustments],
  );

  /* ── The preview, redrawn whenever anything changes ───────────────── */

  const redraw = useCallback(() => {
    if (!plan || !plan.slots.length) return setPreview(null);
    const ready = images.filter(Boolean) as LoadedImage[];
    if (!ready.length) return setPreview(null);
    try {
      // Drawn small for the screen; the full-resolution sheet is composed
      // again at 300 DPI only when the customer pays.
      const canvas = composeSheet({
        plan,
        images: ready,
        adjustments: look,
        cutMarks: Boolean(settings?.cutBorder),
        dpi: 110,
      });
      setPreview(previewDataUrl(canvas));
    } catch {
      setPreview(null);
    }
  }, [plan, images, look, settings?.cutBorder]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  /* ── Making the picture printable ─────────────────────────────────── */

  /**
   * Cut the card out, or put a plain colour behind the person.
   *
   * Runs whenever a picture arrives or the backdrop choice changes, and only
   * ever adds a second version — the customer's own image stays exactly where
   * it was. When it cannot do the job it says so in a line under the photo
   * instead of silently printing something odd.
   */
  const wanted = service?.cardScan ? "scan" : `backdrop:${settings?.backdrop ?? "original"}`;
  const pending = useRef(0);

  useEffect(() => {
    if (!service) return;
    const needsWork = service.cardScan || (settings?.backdrop && settings.backdrop !== "original");
    if (!needsWork) {
      setSlots((current) =>
        current.some((slot) => slot && slot.edited && !service.cardScan)
          ? current.map((slot) => (slot ? { ...slot, edited: null, editedFor: null, note: null } : slot))
          : current,
      );
      return;
    }

    /*
      An accepted AI photo already has its background replaced. Segmenting it
      again would be two engines fighting over the same picture, and the loser
      would be whichever finished last.
    */
    const index = slots.findIndex((slot) => slot && !slot.useAi && slot.editedFor !== wanted);
    if (index < 0) return;

    const slot = slots[index]!;
    const ticket = ++pending.current;
    let cancelled = false;

    void (async () => {
      setWorking(service.cardScan ? "Card dhoondh rahe hain…" : "Background badal rahe hain…");
      let edited: LoadedImage | null = null;
      let note: string | null = null;

      try {
        if (service.cardScan) {
          const found = scanCard(slot.original.element);
          if (found) edited = await loadImage(found.canvas.toDataURL("image/png"));
          else note = "Card ka kinara nahi mila — photo jaisi hai waisi print hogi.";
        } else {
          const colour = backdropColour((settings?.backdrop ?? "original") as never);
          if (colour) {
            const replaced = await replaceBackground(slot.original.element, colour);
            edited = await loadImage(replaced.canvas.toDataURL("image/png"));
          }
        }
      } catch {
        note = "Background nahi badal saka — aapki photo jaisi hai waisi rahegi.";
      }

      if (cancelled || ticket !== pending.current) return;
      setWorking(null);
      setSlots((current) =>
        current.map((item, at) =>
          at === index && item
            ? { ...item, edited, editedFor: wanted, useEdited: Boolean(edited), note }
            : item,
        ),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [service, settings?.backdrop, slots, wanted]);

  /* ── Choosing a service ───────────────────────────────────────────── */

  const chooseService = (picked: SmartPrintService) => {
    setService(picked);
    setSettings(settingsFor(picked, station.defaults));
    setSlots(new Array(picked.uploads.max).fill(null));
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

    setBusy("Aapki photo khul rahi hai…");
    try {
      const original = await loadImage(file);
      setSlots((current) => {
        const next = [...current];
        if (next[index]) URL.revokeObjectURL(next[index]!.thumb);
        next[index] = {
          file,
          thumb: URL.createObjectURL(file),
          original,
          edited: null,
          editedFor: null,
          useEdited: false,
          note: null,
          ai: null,
          aiEdit: null,
          useAi: false,
        };
        return next;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That picture could not be opened.");
    } finally {
      setBusy(null);
    }
  };

  const removeFile = (index: number) => {
    setSlots((current) =>
      current.map((slot, at) => {
        if (at !== index) return slot;
        if (slot) URL.revokeObjectURL(slot.thumb);
        return null;
      }),
    );
    setRawFiles((current) => current.map((file, at) => (at === index ? null : file)));
  };

  const toggleEdited = (index: number) => {
    setSlots((current) =>
      current.map((slot, at) => (at === index && slot ? { ...slot, useEdited: !slot.useEdited } : slot)),
    );
  };

  /* ── AI Auto Fix ──────────────────────────────────────────────────── */

  const [aiBusy, setAiBusy] = useState<PhotoEditId | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  /**
   * Send the customer's photograph to our own server, which asks Gemini.
   *
   * The key is never here: this posts to `/api/ai/process-photo`, that route
   * reads the key, and the browser only ever sees a picture come back. The
   * result is held beside the original — accepting it is a separate tap, and
   * "Original wapas" undoes it at any point before payment.
   */
  const runAiFix = async (edit: PhotoEditId) => {
    const index = slots.findIndex(Boolean);
    const slot = index < 0 ? null : slots[index];
    if (!slot) {
      setAiError("Pehle apni photo lagaiye.");
      return;
    }

    setAiError(null);
    setAiBusy(edit);
    try {
      const form = new FormData();
      // Always the customer's own picture, never a previous AI result: editing
      // an edit compounds whatever the model got wrong the first time.
      form.append("file", slot.file);
      form.append("edit", edit);

      const response = await fetch("/api/ai/process-photo", { method: "POST", body: form });
      const json = (await response.json()) as { image?: string; error?: string };
      if (!response.ok || !json.image) throw new Error(json.error || "AI edit nahi ho saka.");

      const ai = await loadImage(json.image);
      setSlots((current) =>
        current.map((item, at) => (at === index && item ? { ...item, ai, aiEdit: edit, useAi: true } : item)),
      );
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : "AI edit nahi ho saka.");
    } finally {
      setAiBusy(null);
    }
  };

  const restoreOriginal = () => {
    setAiError(null);
    setSlots((current) => current.map((slot) => (slot ? { ...slot, useAi: false } : slot)));
  };

  const useAiPhoto = () => {
    setAiError(null);
    setSlots((current) => current.map((slot) => (slot ? { ...slot, useAi: true } : slot)));
  };

  const filled = rawFiles.filter(Boolean).length;
  const enough = service ? filled >= service.uploads.min : false;

  /* ── Pay ──────────────────────────────────────────────────────────── */

  const payAndPrint = async () => {
    if (!service || !settings || !priced) return;

    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      setError("Apna 10 digit ka mobile number likhiye.");
      return;
    }
    if (!enough) {
      setError("Pehle apni file lagaiye.");
      return;
    }
    if (!window.Razorpay || !payReady) {
      setError("Payment abhi load ho raha hai. Ek pal me dobara try kariye.");
      return;
    }

    setError(null);
    setBusy("Aapka sheet taiyar ho raha hai…");

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
        const canvas = composeSheet({
          plan,
          images: ready,
          adjustments: look,
          cutMarks: Boolean(settings.cutBorder),
          dpi: 300,
        });
        sending = await sheetToFile(canvas, `${service.id}-${settings.paper}.png`);
      } else {
        const original = rawFiles.find(Boolean);
        if (!original) throw new Error("Pehle apni file lagaiye.");
        /*
          A WebP that goes up untouched is a job that fails at the printer:
          Windows has no PrintTo handler for it and GDI+ cannot decode it,
          and a modern Android camera saves WebP by default. A composed sheet
          is already a PNG; this is for the files we pass through.
        */
        sending = await toPrintableImage(original);
      }

      setBusy("File bheji ja rahi hai…");
      const form = new FormData();
      form.append("file", sending);
      const uploadResponse = await fetch("/api/print/jobs/upload", { method: "POST", body: form });
      const uploaded = (await uploadResponse.json()) as Uploaded & { error?: string };
      if (!uploadResponse.ok) throw new Error(uploaded.error || "That file could not be sent.");

      setBusy("Payment khul raha hai…");
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
      if (!key) throw new Error("Online payment abhi chalu nahi hai — aap desk par pay at the desk kar sakte hain.");

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
        setError("Payment nahi hua. Nothing has been charged.");
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
    return (
      <OrderDone
        station={station}
        done={done}
        onAnother={() => {
          setDone(null);
          setService(null);
          setSettings(null);
          setSlots([]);
          setRawFiles([]);
          setPreview(null);
          setStep("service");
        }}
      />
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#eef2f9] pb-[calc(132px+env(safe-area-inset-bottom))]">
      <Stage />
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setPayReady(true)}
      />
      <Header station={station} onBack={step === "build" ? () => setStep("service") : undefined} title={service?.label} />

      <AnimatePresence mode="wait" initial={false}>
        {step === "service" ? (
          <Screen key="picker">
            <ServicePicker station={station} onPick={chooseService} closed={closed} />
          </Screen>
        ) : service && settings ? (
          <Screen key="build">
            <div className="relative mx-auto max-w-lg space-y-3.5 px-4 pt-4">
              <Uploads
                service={service}
                slots={slots}
                rawFiles={rawFiles}
                onPick={pickFile}
                onRemove={removeFile}
                onToggleEdited={toggleEdited}
                busy={busy ?? working}
              />

              {preview ? (
                <Sheet
                  preview={preview}
                  caption={
                    plan
                      ? `${plan.slots.length} ${plan.slots.length === 1 ? "item" : "items"} · ${settings.paper}${
                          sheets > 1 ? ` · ${sheets} sheets` : ""
                        }`
                      : null
                  }
                />
              ) : null}

              {/*
                Only where retouching is the right answer.

                This card offered brightness and contrast on an Aadhaar card,
                which is the one place it must not: a document with its contrast
                pushed up is a document an office can refuse. Photographs get the
                tools; documents get left alone.
              */}
              {service.id === "passport_photo" && slots.some(Boolean) ? (
                <AiFixCard
                  slot={slots.find(Boolean) ?? null}
                  busy={aiBusy}
                  error={aiError}
                  onRun={(edit) => void runAiFix(edit)}
                  onUse={useAiPhoto}
                  onRestore={restoreOriginal}
                />
              ) : null}

              {service.retouch && slots.some(Boolean) ? (
                <PhotoTools adjustments={adjustments} onChange={setAdjustments} />
              ) : null}

              <Settings service={service} asks={asks} settings={settings} onChange={update} />

              <MobileField value={mobile} onChange={setMobile} />

              {offline && !closed ? (
                <Notice tone="warn" title="This counter&rsquo;s computer is not responding">
                  Kuch print nahi hoga, isliye payment band hai. Dukaan par kahiye ki printer wala computer
                  chalu kar dein.
                </Notice>
              ) : null}

              {closed ? <Notice tone="warn">This counter is closed right now. Please ask at the desk.</Notice> : null}
              {error ? <Notice tone="error">{error}</Notice> : null}
            </div>
          </Screen>
        ) : null}
      </AnimatePresence>

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
   Surface
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The blue behind everything.
 *
 * One painted gradient rather than a stack of blurred circles: a shop's
 * customer is on a four-year-old Android, and a full-screen backdrop-filter
 * costs more frames than the depth is worth. The glass is kept for the small
 * surfaces that sit on top of this.
 */
function Stage() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[320px] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 12% -10%, #2f80ed 0%, #0f5db8 42%, #0b3f80 72%, rgba(11,63,128,0) 100%)",
        }}
      />
      <div
        className="absolute -right-16 -top-24 h-64 w-64 rounded-full opacity-70"
        style={{ background: "radial-gradient(circle, rgba(242,90,0,.55) 0%, rgba(242,90,0,0) 68%)" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#eef2f9]" />
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  const still = useReducedMotion();
  return (
    <motion.div
      initial={still ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={still ? undefined : { opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    >
      {children}
    </motion.div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[26px] border border-white/70 bg-white/85 p-4 backdrop-blur-xl",
        "shadow-[0_1px_2px_rgba(15,32,73,.06),0_12px_32px_-14px_rgba(15,32,73,.28)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-slate-400">{children}</p>
  );
}

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
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0f5db8]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Peeche"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-white/90 transition active:scale-90 hover:bg-white/15"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          <span className="flex h-8 items-center rounded-xl bg-white px-2">
            <Image src="/logo-navbar.png" alt="DigiConnect Dukan" width={120} height={30} className="h-5 w-auto" priority />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black leading-tight text-white">{title ?? "Smart Print"}</p>
          <p className="truncate text-[11px] font-semibold text-white/70">{station.displayName}</p>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Picking
   ───────────────────────────────────────────────────────────────────────── */

const TINTS: Record<string, { from: string; to: string; glow: string }> = {
  id_copy: { from: "#2f80ed", to: "#0b3f80", glow: "rgba(47,128,237,.42)" },
  passport_photo: { from: "#ff8a3d", to: "#f25a00", glow: "rgba(242,90,0,.40)" },
  document: { from: "#3fb6a8", to: "#0e7c72", glow: "rgba(14,124,114,.36)" },
};

function ServicePicker({
  station,
  onPick,
  closed,
}: {
  station: SmartStationView;
  onPick: (service: SmartPrintService) => void;
  closed: boolean;
}) {
  const still = useReducedMotion();

  return (
    <div className="relative mx-auto max-w-lg px-4 pt-6">
      <h1 className="text-[1.7rem] font-black leading-[1.1] tracking-tight text-white">
        Kya print karna hai?
      </h1>
      <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-bold text-white/75">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Photo lagaiye · dekhiye · pay kariye · print
      </p>

      {closed ? (
        <div className="mt-4">
          <Notice tone="warn">Ye counter abhi band hai. Dukaan par pooch lijiye.</Notice>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {SMART_PRINT_SERVICES.map((service, index) => {
          const Icon = ICONS[service.icon] ?? Printer;
          const tint = TINTS[service.id] ?? TINTS.document;
          return (
            <motion.button
              key={service.id}
              type="button"
              onClick={() => onPick(service)}
              initial={still ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: still ? 0 : index * 0.07, type: "spring", stiffness: 380, damping: 30 }}
              whileTap={still ? undefined : { scale: 0.975 }}
              className={cn(
                "group flex w-full items-center gap-3.5 rounded-[26px] border border-white/70 bg-white/90 p-4 text-left",
                "backdrop-blur-xl transition-shadow",
                "shadow-[0_1px_2px_rgba(15,32,73,.06),0_16px_36px_-16px_rgba(15,32,73,.4)]",
                "hover:shadow-[0_2px_4px_rgba(15,32,73,.08),0_22px_46px_-18px_rgba(15,32,73,.5)]",
              )}
            >
              <span className="relative shrink-0">
                <span
                  aria-hidden
                  className="absolute inset-x-1 -bottom-1 h-6 rounded-full blur-lg"
                  style={{ background: tint.glow }}
                />
                <span
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,.45)]"
                  style={{ background: `linear-gradient(150deg, ${tint.from}, ${tint.to})` }}
                >
                  <Icon className="h-6.5 w-6.5" aria-hidden />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15.5px] font-black leading-tight text-[var(--dc-ink,#0f2049)]">
                  {service.label}
                </span>
                <span className="mt-0.5 block text-[12px] font-semibold leading-snug text-slate-500">
                  {service.blurb}
                </span>
              </span>
              <span
                aria-hidden
                className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5"
              >
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </span>
            </motion.button>
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
      <p className="mt-5 flex items-start gap-2.5 rounded-[22px] border border-white/70 bg-white/80 px-4 py-3.5 text-[11.5px] font-semibold leading-snug text-slate-500 backdrop-blur-xl">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5db8]" aria-hidden />
        <span>
          Nobody here opens your file. It goes straight to the printer and deletes itself in{" "}
          {station.autoDeleteMinutes} minutes — whether the print worked or not. Card ka background
          aapke apne phone me hi hatta hai. Sirf tab jab aap khud &ldquo;AI Auto Fix&rdquo; dabayein, photo
          Google ke AI ko jati hai — aur wo aapko pehle batayenge.
        </span>
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Uploading
   ───────────────────────────────────────────────────────────────────────── */

function Uploads({
  service,
  slots,
  rawFiles,
  onPick,
  onRemove,
  onToggleEdited,
  busy,
}: {
  service: SmartPrintService;
  slots: (Slot | null)[];
  rawFiles: (File | null)[];
  onPick: (index: number, file: File | null) => void;
  onRemove: (index: number) => void;
  onToggleEdited: (index: number) => void;
  busy: string | null;
}) {
  const labels =
    service.uploads.labels ?? Array.from({ length: service.uploads.max }, (_, i) => `File ${i + 1}`);
  const accept =
    service.uploads.accept === "image" ? "image/*" : service.uploads.accept === "document" ? ".pdf" : "image/*,.pdf";

  return (
    <Card>
      <Eyebrow>{service.uploads.max > 1 ? "Dono side ki photo" : "Aapki file"}</Eyebrow>
      <div className={cn("mt-3 grid gap-2.5", labels.length > 1 && "grid-cols-2")}>
        {labels.map((label, index) => {
          const file = rawFiles[index];
          const slot = slots[index];
          return (
            <div key={label} className="min-w-0">
              {file ? (
                <div className="overflow-hidden rounded-2xl border border-[#0f5db8]/20 bg-[#f2f7ff]">
                  {slot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slot.useEdited && slot.edited ? slot.edited.element.src : slot.thumb}
                      alt={`${label} preview`}
                      className="h-24 w-full bg-white object-contain"
                    />
                  ) : null}
                  <div className="flex items-center justify-between gap-1 px-2.5 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[11.5px] font-black text-slate-800">{label}</span>
                      <span className="block text-[10.5px] font-semibold text-slate-500">
                        {Math.round(file.size / 1024)} KB
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      aria-label={`${label} hataiye`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition active:scale-90 hover:bg-white hover:text-[#c9430a]"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>

                  {slot?.edited ? (
                    <button
                      type="button"
                      onClick={() => onToggleEdited(index)}
                      aria-pressed={slot.useEdited}
                      className={cn(
                        "flex w-full items-center justify-center gap-1.5 border-t px-2 py-2 text-[11px] font-black transition",
                        slot.useEdited
                          ? "border-[#0f5db8]/15 bg-[#0f5db8] text-white"
                          : "border-slate-200 bg-white text-slate-600",
                      )}
                    >
                      <Wand2 className="h-3.5 w-3.5" aria-hidden />
                      {slot.useEdited ? "Saaf kiya hua" : "Original"}
                    </button>
                  ) : null}
                </div>
              ) : (
                <motion.label
                  whileTap={{ scale: 0.97 }}
                  className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[#0f5db8]/25 bg-white/70 p-3 text-center transition hover:border-[#0f5db8]/60 hover:bg-white"
                >
                  <span className="text-[12.5px] font-black text-slate-700">{label}</span>
                  <span className="text-[11px] font-bold text-[#0f5db8]">Tap kariye</span>
                  <input
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={(event) => void onPick(index, event.target.files?.[0] ?? null)}
                  />
                </motion.label>
              )}
              {slot?.note ? (
                <p className="mt-1 px-1 text-[10.5px] font-semibold leading-snug text-[#c9430a]">{slot.note}</p>
              ) : null}
            </div>
          );
        })}
      </div>
      {busy ? (
        <p className="mt-2.5 flex items-center gap-2 text-[12px] font-bold text-[#0f5db8]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {busy}
        </p>
      ) : null}
    </Card>
  );
}

/**
 * The sheet, shown as paper.
 *
 * A flat rectangle on a flat card reads as a placeholder. A leaf of white with
 * a real shadow under it reads as the thing that is about to come out of the
 * printer, which is what the customer is being asked to approve.
 */
function Sheet({ preview, caption }: { preview: string; caption: string | null }) {
  const still = useReducedMotion();
  return (
    <Card className="bg-gradient-to-b from-white/90 to-[#f4f7fc]/90">
      <Eyebrow>Aisa print hoga</Eyebrow>
      <motion.div
        key={preview}
        initial={still ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="mt-3 flex justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Aapka sheet aisa print hoga"
          className="w-full max-w-[290px] rounded-lg bg-white shadow-[0_2px_4px_rgba(15,32,73,.10),0_20px_44px_-18px_rgba(15,32,73,.55)] ring-1 ring-slate-900/5"
        />
      </motion.div>
      {caption ? (
        <p className="pt-3 text-center text-[11.5px] font-black text-slate-500">{caption}</p>
      ) : null}
    </Card>
  );
}

/**
 * AI Auto Fix, and the one honest sentence that has to go with it.
 *
 * Everything else on this screen happens on the customer's own phone — the
 * card cutout, the backdrop, the sheet itself. This does not: the photograph
 * is sent to our server and on to Google to be edited. Somebody handing over a
 * picture of their own face is owed that in plain words before they tap, not
 * in a policy page, so it sits above the button rather than below it.
 *
 * The result never replaces anything. It is shown beside the original, the
 * customer chooses, and "Original wapas" is available until they pay.
 */
function AiFixCard({
  slot,
  busy,
  error,
  onRun,
  onUse,
  onRestore,
}: {
  slot: Slot | null;
  busy: PhotoEditId | null;
  error: string | null;
  onRun: (edit: PhotoEditId) => void;
  onUse: () => void;
  onRestore: () => void;
}) {
  const still = useReducedMotion();
  if (!slot) return null;

  const done = Boolean(slot.ai);
  const chosen = slot.aiEdit ? photoEdit(slot.aiEdit) : null;

  return (
    <Card>
      <div className="flex items-start gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: "linear-gradient(150deg,#ff8a3d,#f25a00)" }}
        >
          <Sparkles className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-black text-[var(--dc-ink,#0f2049)]">AI Auto Fix</p>
          <p className="mt-0.5 text-[11px] font-semibold leading-snug text-slate-500">
            Ye photo Google ke AI ko bheji jayegi. Baaki sab kuch aapke phone me hi hota hai.
            Chehra waisa hi rakhne ko kaha jata hai — natija aap khud dekh kar chunte hain.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PHOTO_EDITS.map((edit) => {
          const running = busy === edit.id;
          const active = slot.useAi && slot.aiEdit === edit.id;
          return (
            <motion.button
              key={edit.id}
              type="button"
              whileTap={busy ? undefined : { scale: 0.95 }}
              disabled={Boolean(busy)}
              onClick={() => onRun(edit.id)}
              aria-pressed={active}
              title={edit.blurb}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border px-3.5 text-[12.5px] font-black transition disabled:opacity-50",
                active
                  ? "border-transparent text-white shadow-[0_6px_16px_-8px_rgba(242,90,0,.9)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
              )}
              style={active ? { background: "linear-gradient(140deg,#ff8a3d,#f25a00)" } : undefined}
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
              )}
              {edit.label}
            </motion.button>
          );
        })}
      </div>

      {busy ? (
        <p className="mt-2.5 flex items-center gap-2 text-[12px] font-bold text-[#f25a00]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          AI aapki photo theek kar raha hai… thoda rukiye.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2.5 rounded-xl bg-orange-50 px-3 py-2 text-[11.5px] font-bold leading-snug text-[#c9430a]">
          {error}
        </p>
      ) : null}

      {/*
        Before and after, side by side and the same size.

        A single "after" is a claim. Two pictures the customer can look between
        is the only way they can judge whether the face still looks like them,
        which is the thing this feature is most likely to get wrong.
      */}
      {done ? (
        <motion.div
          initial={still ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="mt-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <Compare label="Original" src={slot.thumb} dim={slot.useAi} />
            <Compare
              label={chosen ? chosen.label : "AI"}
              src={slot.ai!.element.src}
              dim={!slot.useAi}
              accent
            />
          </div>

          <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
            {slot.useAi ? "AI wali photo print hogi" : "Aapki original photo print hogi"}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onUse}
              disabled={slot.useAi}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl px-3 text-[12.5px] font-black text-white transition disabled:opacity-40"
              style={{ background: "linear-gradient(140deg,#2f80ed,#0f5db8)" }}
            >
              <Check className="h-4 w-4" aria-hidden />
              Yehi photo lijiye
            </button>
            <button
              type="button"
              onClick={() => slot.aiEdit && onRun(slot.aiEdit)}
              disabled={Boolean(busy) || !slot.aiEdit}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 text-[12.5px] font-black text-slate-700 transition disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Dobara
            </button>
            <button
              type="button"
              onClick={onRestore}
              disabled={!slot.useAi}
              className="inline-flex h-11 items-center justify-center rounded-2xl px-3 text-[12.5px] font-black text-slate-500 transition disabled:opacity-40"
            >
              Original wapas
            </button>
          </div>
        </motion.div>
      ) : null}
    </Card>
  );
}

function Compare({
  label,
  src,
  dim,
  accent,
}: {
  label: string;
  src: string;
  dim: boolean;
  accent?: boolean;
}) {
  return (
    <figure className="min-w-0">
      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-white transition",
          dim ? "border-slate-200 opacity-55" : accent ? "border-[#f25a00]" : "border-[#0f5db8]",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="h-36 w-full bg-white object-contain" />
      </div>
      <figcaption className="mt-1 text-center text-[11px] font-black text-slate-600">{label}</figcaption>
    </figure>
  );
}

/**
 * The adjustments a phone photo actually needs.
 *
 * Brightness, contrast and a quarter turn cover the real complaints at a
 * counter — a dark photo, a flat one, a picture the phone saved sideways.
 * Nothing here reshapes a face: a passport photograph that no longer matches
 * the person holding it is a rejected application.
 */
function PhotoTools({
  adjustments,
  onChange,
}: {
  adjustments: ImageAdjustments;
  onChange: (next: ImageAdjustments) => void;
}) {
  return (
    <Card>
      <Eyebrow>Photo theek kijiye</Eyebrow>
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
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[12.5px] font-black text-slate-700 transition active:scale-95"
          >
            <RotateCw className="h-4 w-4" aria-hidden />
            Ghumaiye
          </button>
          <button
            type="button"
            onClick={() => onChange({})}
            className="inline-flex h-11 items-center rounded-xl px-3 text-[12.5px] font-black text-slate-500 transition active:scale-95"
          >
            Reset
          </button>
        </div>
      </div>
    </Card>
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
      <span className="flex items-center gap-1.5 text-[12px] font-black text-slate-600">
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

/* ─────────────────────────────────────────────────────────────────────────
   Settings
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Only the questions this shop has decided to ask.
 *
 * `asks` arrives already filtered: a service's own short list, plus whatever
 * the partner has switched on for their counter. A shop that has enabled
 * nothing shows two or three rows here, which is the intended state and not a
 * missing feature.
 */
function Settings({
  service,
  asks,
  settings,
  onChange,
}: {
  service: SmartPrintService;
  asks: SmartPrintAsk[];
  settings: SmartPrintSettings;
  onChange: (patch: Partial<SmartPrintSettings>) => void;
}) {
  const shown = new Set(asks);
  const canCut = canChangeBackground();

  return (
    <Card className="space-y-3.5">
      <Eyebrow>Settings</Eyebrow>

      {shown.has("backdrop") && canCut ? (
        <Choice
          label={ASK_LABELS.backdrop}
          hint="Ye aapke phone me hi badalta hai — photo kahin nahi jati. AI Auto Fix alag hai."
          value={settings.backdrop ?? "original"}
          options={BACKDROPS.map((backdrop) => ({
            value: backdrop.id,
            label: backdrop.label,
            swatch: backdrop.colour ?? undefined,
          }))}
          onChange={(value) => onChange({ backdrop: value as SmartPrintSettings["backdrop"] })}
        />
      ) : null}

      {shown.has("filter") ? (
        <Choice
          label={ASK_LABELS.filter}
          value={settings.filter ?? "none"}
          options={Object.entries(FILTER_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(value) => onChange({ filter: value as SmartPrintSettings["filter"] })}
        />
      ) : null}

      {shown.has("photoSize") ? (
        <Choice
          label={ASK_LABELS.photoSize}
          value={String(settings.photoSize ?? "35x45")}
          options={Object.values(PHOTO_SIZES).map((size) => ({ value: size.id, label: size.label }))}
          onChange={(value) => onChange({ photoSize: value as SmartPrintSettings["photoSize"] })}
        />
      ) : null}

      {shown.has("photoCount") ? (
        <Choice
          label={ASK_LABELS.photoCount}
          value={String(settings.photoCount ?? 12)}
          options={QUANTITY_CHOICES.photoCount.map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(value) => onChange({ photoCount: Number(value) })}
        />
      ) : null}

      {shown.has("cutBorder") ? (
        <Choice
          label={ASK_LABELS.cutBorder}
          value={settings.cutBorder ? "yes" : "no"}
          options={[
            { value: "yes", label: "Haan" },
            { value: "no", label: "Nahi" },
          ]}
          onChange={(value) => onChange({ cutBorder: value === "yes" })}
        />
      ) : null}

      {shown.has("arrangement") ? (
        <Choice
          label={ASK_LABELS.arrangement}
          value={settings.arrangement ?? "stacked"}
          options={[
            { value: "stacked", label: "Ek ke neeche ek" },
            { value: "side-by-side", label: "Aas-paas" },
            { value: "actual-size", label: "Asli card size" },
          ]}
          onChange={(value) => onChange({ arrangement: value as SmartPrintSettings["arrangement"] })}
        />
      ) : null}

      {shown.has("paper") ? (
        <Choice
          label={ASK_LABELS.paper}
          value={settings.paper}
          options={Object.values(PAPER_SIZES)
            .filter((paper) => !paper.photo)
            .map((paper) => ({ value: paper.id, label: paper.label }))}
          onChange={(value) => onChange({ paper: value })}
        />
      ) : null}

      {shown.has("color") ? (
        <Choice
          label={ASK_LABELS.color}
          value={settings.color}
          options={[
            { value: "mono", label: "Black & white" },
            { value: "color", label: "Colour" },
          ]}
          onChange={(value) => onChange({ color: value as SmartPrintSettings["color"] })}
        />
      ) : null}

      {shown.has("finish") ? (
        <Choice
          label={ASK_LABELS.finish}
          value={settings.finish}
          options={Object.entries(FINISH_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(value) => onChange({ finish: value as SmartPrintSettings["finish"] })}
        />
      ) : null}

      {shown.has("quality") ? (
        <Choice
          label={ASK_LABELS.quality}
          value={settings.quality}
          options={Object.entries(QUALITY_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(value) => onChange({ quality: value as SmartPrintSettings["quality"] })}
        />
      ) : null}




      {shown.has("copies") ? (
        <Choice
          label={ASK_LABELS.copies}
          value={String(settings.copies)}
          options={QUANTITY_CHOICES.copies.map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(value) => onChange({ copies: Number(value) })}
        />
      ) : null}

      {service.composes ? null : (
        <p className="text-[11px] font-semibold leading-snug text-slate-400">
          File jaisi hai waisi hi print hogi.
        </p>
      )}
    </Card>
  );
}

function Choice({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  options: Array<{ value: string; label: string; swatch?: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-[12px] font-black text-slate-700">{label}</p>
      {hint ? <p className="mt-0.5 text-[10.5px] font-semibold text-slate-400">{hint}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <motion.button
              key={option.value}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border px-3.5 text-[13px] font-black transition",
                active
                  ? "border-transparent text-white shadow-[0_6px_16px_-8px_rgba(15,93,184,.9)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
              )}
              style={active ? { background: "linear-gradient(140deg,#2f80ed,#0f5db8)" } : undefined}
            >
              {option.swatch ? (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 rounded-full ring-1 ring-slate-900/15"
                  style={{ background: option.swatch }}
                />
              ) : null}
              {option.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function MobileField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Card>
      <label className="block">
        <Eyebrow>Aapka mobile number</Eyebrow>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          placeholder="10 digits"
          aria-label="Aapka mobile number"
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[16px] font-black tracking-wide text-slate-900 outline-none transition focus:border-[#0f5db8] focus:ring-4 focus:ring-[#0f5db8]/12"
        />
        <span className="mt-1.5 block text-[11px] font-semibold text-slate-400">
          Sirf isliye ki dukaan aapka kaam dhoondh sake.
        </span>
      </label>
    </Card>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: "warn" | "error";
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border-l-4 px-4 py-3 backdrop-blur-xl",
        tone === "warn" ? "border-l-[#f25a00] bg-orange-50/90" : "border-l-[#d92d20] bg-red-50/90",
      )}
    >
      {title ? <p className="text-[13px] font-black text-[#c9430a]">{title}</p> : null}
      <p className={cn("text-[12px] font-bold leading-snug", title ? "mt-1 text-slate-600" : "text-[#c9430a]")}>
        {children}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Paying
   ───────────────────────────────────────────────────────────────────────── */

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
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/60 bg-white/85 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl shadow-[0_-8px_32px_-16px_rgba(15,32,73,.45)]">
      <div className="mx-auto max-w-lg">
        <AnimatePresence initial={false}>
          {open ? (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="mb-2.5 space-y-1 overflow-hidden rounded-2xl bg-slate-50 p-3"
            >
              {priced.lines.map((line) => (
                <li key={line.label} className="flex items-baseline justify-between gap-3 text-[12px]">
                  <span className="min-w-0 font-bold text-slate-600">
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
            </motion.ul>
          ) : null}
        </AnimatePresence>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="shrink-0 text-left"
            aria-expanded={open}
            aria-label="Price ka hisaab"
          >
            <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Total</span>
            <motion.span
              key={priced.total}
              initial={{ scale: 1.14 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="block text-[24px] font-black leading-none text-slate-900"
            >
              ₹{priced.total}
            </motion.span>
          </button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onPay}
            disabled={disabled || Boolean(busy)}
            className="relative inline-flex h-13 min-h-[52px] flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl text-[14.5px] font-black text-white shadow-[0_10px_28px_-12px_rgba(15,93,184,.95)] transition disabled:opacity-40 disabled:shadow-none"
            style={{ background: "linear-gradient(140deg,#2f80ed,#0f5db8)" }}
          >
            {busy ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden />
            ) : (
              <Printer className="h-4.5 w-4.5" aria-hidden />
            )}
            {busy ?? label}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   After
   ───────────────────────────────────────────────────────────────────────── */

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef2f9] px-4 py-10">
      <Stage />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        className="relative w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-6 text-center backdrop-blur-2xl shadow-[0_2px_6px_rgba(15,32,73,.08),0_28px_60px_-24px_rgba(15,32,73,.55)]"
      >
        <span
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4)]"
          style={{ background: trouble ? "linear-gradient(150deg,#ff8a3d,#f25a00)" : "linear-gradient(150deg,#2f80ed,#0b3f80)" }}
        >
          {trouble ? (
            <AlertTriangle className="h-8 w-8" aria-hidden />
          ) : outcome === "printed" ? (
            <Check className="h-8 w-8" aria-hidden />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          )}
        </span>
        <h1 className="mt-4 text-[1.35rem] font-black text-slate-900">
          {outcome === "printed"
            ? "Print ho gaya"
            : outcome === "failed"
              ? "The print did not go through."
              : outcome === "slow"
                ? "Not printed yet."
                : "Payment successful"}
        </h1>
        <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-slate-500">
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
          <div className="mt-5 rounded-2xl bg-gradient-to-b from-[#f2f7ff] to-[#e8effa] px-4 py-4 ring-1 ring-[#0f5db8]/10">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Say this at the desk
            </p>
            <p className="mt-1 font-mono text-[2.1rem] font-black tracking-[0.2em] text-[#0f5db8]">{done.pin}</p>
          </div>
        ) : null}

        <p className="mt-4 text-[11.5px] font-bold text-slate-500">
          Order {done.jobNumber} · file {station.autoDeleteMinutes} minute me delete
        </p>

        <button
          type="button"
          onClick={onAnother}
          className="mt-5 h-12 w-full rounded-2xl border border-slate-200 bg-white text-[13.5px] font-black text-slate-700 transition active:scale-[0.98]"
        >
          Ek aur print kariye
        </button>
      </motion.div>
    </main>
  );
}
