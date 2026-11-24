"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { AlertTriangle, Check, FileText, IdCard, Loader2, Minus, Plus, Upload, X } from "lucide-react";

import { composeSheet, loadImage, sheetToFile, type LoadedImage } from "@/lib/print/compose-sheet";
import { scanCard } from "@/lib/print/card-scan";
import { toPrintableImage } from "@/lib/print/printable-image";
import { PAPER_SIZES, idCardPlan } from "@/lib/print/sheet-layout";
import { settingsFor, smartPrintService, type PartnerDefaults, type SmartPrintSettings } from "@/lib/print/smart-print";
import { quote } from "@/lib/print/smart-pricing";
import type { PrintRates } from "@/lib/print/stations";
import { getCheckoutRazorpayKey } from "@/lib/razorpay-client";
import { cn } from "@/lib/utils";

/**
 * Digi Print — the customer's page behind a counter's QR.
 *
 * Basic on purpose: two things to print (a document or photo, and an ID card's
 * two sides on one sheet), and three questions (colour, size, copies) — each
 * shown only if the shop sells it. The file goes up the moment it is chosen,
 * so the page count, and therefore the exact price, is on screen before the
 * customer reaches for their phone's UPI app.
 *
 * Light by design: no animation library, no on-device AI, nothing loaded that
 * the two services do not use. It has to open fast on a cheap phone on
 * mobile data in a shop.
 */

export type DigiPrintStation = {
  code: string;
  displayName: string;
  address: string | null;
  rates: PrintRates;
  acceptingOrders: boolean;
  autoDeleteMinutes: number;
  agentConnected: boolean;
  offerA3: boolean;
  offerColor: boolean;
  defaults: PartnerDefaults;
};

type ServiceId = "document" | "id_copy";

type Uploaded = {
  storage_path: string;
  upload_receipt: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  pages: number;
};

type Done = { jobId: string; jobNumber: string; pin: string | null };

const MAX_COPIES = 50;

export function DigiPrintFlow({ station }: { station: DigiPrintStation }) {
  const [service, setService] = useState<ServiceId>("document");
  const [color, setColor] = useState<"mono" | "color">("mono");
  const [paper, setPaper] = useState<"A4" | "A3">("A4");
  const [copies, setCopies] = useState(1);
  const [mobile, setMobile] = useState("");

  // Document: uploaded as soon as it is picked.
  const [docName, setDocName] = useState<string | null>(null);
  const [doc, setDoc] = useState<Uploaded | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const docRequest = useRef(0);

  // ID card: front and (optional) back, squared up in the browser.
  const [sides, setSides] = useState<[LoadedImage | null, LoadedImage | null]>([null, null]);
  const [sideBusy, setSideBusy] = useState<number | null>(null);

  const [payReady, setPayReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  const closed = !station.acceptingOrders;
  const offline = !station.agentConnected;
  const cleanMobile = mobile.replace(/\D/g, "").slice(-10);

  // A switch the shop turned off is never left selected.
  useEffect(() => {
    if (!station.offerColor) setColor("mono");
  }, [station.offerColor]);
  useEffect(() => {
    if (!station.offerA3 || service === "id_copy") setPaper("A4");
  }, [station.offerA3, service]);

  const sheets = service === "document" ? doc?.pages ?? 0 : 1;
  const enough = service === "document" ? Boolean(doc) : Boolean(sides[0]);

  const settings: SmartPrintSettings = useMemo(() => {
    const preset = smartPrintService(service);
    return {
      ...(preset ? settingsFor(preset, station.defaults) : { paper: "A4", color: "mono", finish: "normal", quality: "standard", copies: 1 }),
      paper,
      color,
      copies,
      finish: "normal",
      quality: "standard",
      ...(service === "id_copy" ? { arrangement: "stacked" as const } : {}),
    };
  }, [service, station.defaults, paper, color, copies]);

  const total = enough ? quote(station.rates, settings, Math.max(1, sheets)).total : 0;

  /* ── Picking files ──────────────────────────────────────────────────── */

  const upload = async (file: File): Promise<Uploaded> => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/print/jobs/upload", { method: "POST", body: form });
    const json = (await response.json().catch(() => ({}))) as Partial<Uploaded> & { error?: string };
    if (!response.ok || !json.upload_receipt || !json.storage_path) {
      throw new Error(json.error || "File nahi bhej paye. Dobara try kariye.");
    }
    return {
      storage_path: json.storage_path,
      upload_receipt: json.upload_receipt,
      file_name: json.file_name ?? file.name,
      file_size: json.file_size ?? file.size,
      mime_type: json.mime_type ?? file.type,
      pages: Math.max(1, Number(json.pages) || 1),
    };
  };

  const pickDocument = async (original: File | undefined) => {
    if (!original) return;
    setError(null);
    setDoc(null);
    setDocName(original.name);
    setDocBusy(true);
    const ticket = ++docRequest.current;
    try {
      /*
        A WebP that goes up untouched fails at the printer: Windows cannot
        print it. The browser can decode it, so it is converted here.
      */
      const sending = await toPrintableImage(original);
      const uploaded = await upload(sending);
      if (ticket === docRequest.current) setDoc(uploaded);
    } catch (caught) {
      if (ticket === docRequest.current) {
        setDocName(null);
        setError(caught instanceof Error ? caught.message : "File nahi bhej paye.");
      }
    } finally {
      if (ticket === docRequest.current) setDocBusy(false);
    }
  };

  const pickSide = async (index: 0 | 1, file: File | undefined) => {
    if (!file) return;
    setError(null);
    setSideBusy(index);
    try {
      const image = await loadImage(await toPrintableImage(file));
      // Square the card up when it is clearly a card; otherwise use the photo as taken.
      const scanned = (() => {
        try {
          return scanCard(image.element);
        } catch {
          return null;
        }
      })();
      const ready = scanned ? await loadImage(scanned.canvas.toDataURL("image/png")) : image;
      setSides((current) => {
        const next: [LoadedImage | null, LoadedImage | null] = [...current];
        next[index] = ready;
        return next;
      });
    } catch {
      setError("Photo khul nahi rahi. Dusri photo lijiye.");
    } finally {
      setSideBusy(null);
    }
  };

  /* ── Paying ─────────────────────────────────────────────────────────── */

  const payAndPrint = async () => {
    if (!enough || closed || offline || cleanMobile.length < 10) return;
    if (!window.Razorpay || !payReady) {
      setError("Payment abhi load ho raha hai. Ek pal me dobara try kariye.");
      return;
    }
    setError(null);

    try {
      let file: Uploaded;
      if (service === "id_copy") {
        setBusy("Card sheet taiyar ho rahi hai…");
        const images = sides.filter(Boolean) as LoadedImage[];
        const plan = idCardPlan(PAPER_SIZES.A4, "stacked", 1, images.length === 2 ? 2 : 1);
        const canvas = composeSheet({ plan, images, dpi: 300 });
        setBusy("Bheja ja raha hai…");
        file = await upload(await sheetToFile(canvas, "id-copy.png"));
      } else {
        file = doc as Uploaded;
      }

      setBusy("Order ban raha hai…");
      const createResponse = await fetch("/api/print/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_mobile: cleanMobile,
          copies,
          pages: file.pages,
          paper_size: service === "id_copy" ? "A4" : paper,
          color_mode: color,
          upload_receipt: file.upload_receipt,
          station_code: station.code,
          service_type: service,
          settings,
          sheet_count: service === "id_copy" ? 1 : file.pages,
        }),
      });
      const created = (await createResponse.json()) as {
        job_id?: string;
        job_number?: string;
        pickup_pin?: string | null;
        error?: string;
      };
      if (!createResponse.ok || !created.job_id) throw new Error(created.error || "Order shuru nahi ho paya.");

      const orderResponse = await fetch("/api/print/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: created.job_id }),
      });
      const order = (await orderResponse.json()) as {
        order_id?: string;
        amount?: number | string;
        currency?: string;
        key_id?: string;
        error?: string;
      };
      if (!orderResponse.ok || !order.order_id) throw new Error(order.error || "Payment shuru nahi ho paya.");

      const key = await getCheckoutRazorpayKey(order.key_id).catch(() => null);
      if (!key) throw new Error("Online payment abhi band hai — aap pay at the desk kar sakte hain.");

      const amountPaise = Number(order.amount);
      if (!Number.isFinite(amountPaise)) throw new Error("Amount padh nahi paye. Koi paisa nahi kata.");

      setBusy(null);
      const checkout = new window.Razorpay({
        key,
        amount: amountPaise,
        currency: order.currency ?? "INR",
        name: station.displayName,
        description: `Digi Print · ${created.job_number}`,
        order_id: order.order_id,
        prefill: { contact: cleanMobile },
        theme: { color: "#0f172a" },
        modal: { ondismiss: () => setBusy(null) },
        handler: (response) => {
          void (async () => {
            setBusy("Payment confirm ho raha hai…");
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
              if (!verify.ok) throw new Error(verified.error || "Payment confirm nahi ho paya.");
              setDone({ jobId: String(created.job_id), jobNumber: created.job_number ?? "", pin: created.pickup_pin ?? null });
            } catch (caught) {
              setError(
                `${caught instanceof Error ? caught.message : "Payment confirm nahi ho paya."} Your money is safe — ye screen counter par dikhaiye.`,
              );
            } finally {
              setBusy(null);
            }
          })();
        },
      });
      checkout.on("payment.failed", () => {
        setError("Payment nahi hua. Koi paisa nahi kata.");
        setBusy(null);
      });
      checkout.open();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Kuch galat ho gaya.");
      setBusy(null);
    }
  };

  if (done) return <DoneScreen station={station} done={done} onAnother={() => window.location.reload()} />;

  const canPay = enough && !closed && !offline && cleanMobile.length === 10 && payReady && !busy && !docBusy;

  return (
    <main className="min-h-[100dvh] bg-[#f6f7f9] pb-36 text-slate-900">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setPayReady(true)} onReady={() => setPayReady(true)} />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Digi Print</p>
            <h1 className="truncate text-[17px] font-semibold">{station.displayName}</h1>
          </div>
          <StatusDot closed={closed} offline={offline} />
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-3 px-4 pt-4">
        {closed || offline ? (
          <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] font-medium text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {closed
              ? "This counter is closed right now — desk par puchiye. Nothing has been charged."
              : "Shop's computer is not responding, so nothing would print. Payment se pehle desk par puchiye."}
          </p>
        ) : null}

        <Card>
          <Label>Kya print karna hai</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ServiceButton active={service === "document"} onClick={() => setService("document")} icon={FileText} title="Document / Photo" sub="PDF, JPG, PNG" />
            <ServiceButton active={service === "id_copy"} onClick={() => setService("id_copy")} icon={IdCard} title="Aadhaar / ID" sub="Front + back, ek page" />
          </div>
        </Card>

        <Card>
          {service === "document" ? (
            <>
              <Label>File</Label>
              <FilePicker
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onPick={pickDocument}
                filled={Boolean(docName)}
              >
                {docBusy ? (
                  <span className="flex items-center gap-2 text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" /> {docName} bhej rahe hain…
                  </span>
                ) : doc ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="truncate">{doc.file_name}</span>
                    <span className="shrink-0 text-slate-500">· {doc.pages} page</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-slate-600">
                    <Upload className="h-4 w-4" /> File chuniye
                  </span>
                )}
              </FilePicker>
            </>
          ) : (
            <>
              <Label>Card ki photo</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["Front", "Back (optional)"] as const).map((label, index) => (
                  <SideTile
                    key={label}
                    label={label}
                    image={sides[index as 0 | 1]}
                    busy={sideBusy === index}
                    onPick={(file) => void pickSide(index as 0 | 1, file)}
                    onClear={() =>
                      setSides((current) => {
                        const next: [LoadedImage | null, LoadedImage | null] = [...current];
                        next[index] = null;
                        return next;
                      })
                    }
                  />
                ))}
              </div>
              <p className="mt-2 text-[12px] text-slate-500">Card ko kisi saaf surface par rakh kar photo lijiye — kinare apne aap kat jayenge.</p>
            </>
          )}
        </Card>

        <Card>
          <div className="space-y-4">
            {station.offerColor ? (
              <Row label="Rang">
                <Segmented
                  value={color}
                  onChange={(value) => setColor(value as "mono" | "color")}
                  options={[
                    { value: "mono", label: "Black & white" },
                    { value: "color", label: "Colour" },
                  ]}
                />
              </Row>
            ) : null}
            {station.offerA3 && service === "document" ? (
              <Row label="Size">
                <Segmented
                  value={paper}
                  onChange={(value) => setPaper(value as "A4" | "A3")}
                  options={[
                    { value: "A4", label: "A4" },
                    { value: "A3", label: "A3" },
                  ]}
                />
              </Row>
            ) : null}
            <Row label="Copies">
              <Stepper value={copies} onChange={setCopies} />
            </Row>
          </div>
        </Card>

        <Card>
          <Label>Mobile number</Label>
          <input
            inputMode="numeric"
            autoComplete="tel"
            value={mobile}
            onChange={(event) => setMobile(event.target.value.replace(/[^\d+ ]/g, "").slice(0, 14))}
            placeholder="10 digit number"
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] outline-none transition focus:border-slate-900"
          />
          <p className="mt-1.5 text-[12px] text-slate-500">
            Nobody here opens your file — print ke baad {station.autoDeleteMinutes} minute me delete.
          </p>
        </Card>

        {error ? (
          <p className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] font-medium text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}
      </div>

      <PayBar
        total={total}
        detail={
          enough
            ? `${Math.max(1, sheets)} page × ${copies} · ${paper} · ${color === "color" ? "Colour" : "B/W"}`
            : "File lagaiye"
        }
        disabled={!canPay || offline}
        busy={busy}
        onPay={() => void payAndPrint()}
      />
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   After paying
   ───────────────────────────────────────────────────────────────────────── */

function DoneScreen({ station, done, onAnother }: { station: DigiPrintStation; done: Done; onAnother: () => void }) {
  const [outcome, setOutcome] = useState<"waiting" | "approval" | "printed" | "failed" | "slow" | "refunded">("waiting");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const check = async () => {
      try {
        const response = await fetch(`/api/print/jobs/status?job_id=${encodeURIComponent(done.jobId)}`, { cache: "no-store" });
        const json = (await response.json()) as { print_status?: string; payment_status?: string };
        if (cancelled) return;
        if (json.print_status === "printed") return setOutcome("printed");
        if (json.payment_status === "refunded" || json.print_status === "cancelled") return setOutcome("refunded");
        if (json.print_status === "failed") return setOutcome("failed");
        if (json.print_status === "awaiting_approval") setOutcome("approval");
        else if (Date.now() - startedAt > 75_000) setOutcome("slow");
        else setOutcome("waiting");
      } catch {
        /* A dropped request says nothing about the printer. Ask again. */
      }
      if (!cancelled && Date.now() - startedAt < 10 * 60_000) timer = setTimeout(() => void check(), 2500);
    };

    timer = setTimeout(() => void check(), 1500);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [done.jobId]);

  const view = {
    waiting: { title: "Print ho raha hai…", body: `Aapka order ${station.displayName} ke printer par pahunch gaya.`, tone: "neutral" },
    approval: { title: "Shop confirm kar rahi hai", body: "Shop aapka order dekh kar print chalu karegi.", tone: "neutral" },
    printed: { title: "Print ho gaya", body: "Kagaz counter par taiyar hai.", tone: "good" },
    failed: { title: "The print did not go through.", body: "Ye screen counter par dikhaiye — wo dobara print karenge ya paise lautayenge.", tone: "bad" },
    slow: { title: "Not printed yet.", body: "Jaane se pehle ye screen counter par dikhaiye.", tone: "bad" },
    refunded: { title: "Paise wapas bhej diye", body: "Shop ne order cancel kiya. Paise 5–7 din me account me aa jayenge.", tone: "bad" },
  }[outcome];

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f6f7f9] px-4 text-slate-900">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_1px_2px_rgba(15,23,42,.04),0_12px_32px_-16px_rgba(15,23,42,.18)]">
        <span
          className={cn(
            "mx-auto flex h-12 w-12 items-center justify-center rounded-full",
            view.tone === "good" ? "bg-emerald-50 text-emerald-600" : view.tone === "bad" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-700",
          )}
        >
          {view.tone === "good" ? <Check className="h-6 w-6" /> : view.tone === "bad" ? <AlertTriangle className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin" />}
        </span>
        <h1 className="mt-4 text-[19px] font-semibold">{view.title}</h1>
        <p className="mt-1 text-[13.5px] text-slate-600">{view.body}</p>

        {done.pin ? (
          <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Say this at the desk</p>
            <p className="mt-1 font-mono text-[30px] font-semibold tracking-[0.3em]">{done.pin}</p>
          </div>
        ) : null}

        <p className="mt-4 text-[12px] text-slate-500">Order {done.jobNumber}</p>
        <button
          type="button"
          onClick={onAnother}
          className="mt-4 h-11 w-full rounded-xl border border-slate-200 text-[14px] font-medium transition hover:bg-slate-50"
        >
          Ek aur print
        </button>
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pieces
   ───────────────────────────────────────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4">{children}</section>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-semibold text-slate-900">{children}</p>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] font-semibold">{label}</span>
      {children}
    </div>
  );
}

function StatusDot({ closed, offline }: { closed: boolean; offline: boolean }) {
  const label = closed ? "Band" : offline ? "Printer offline" : "Open";
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[12px] font-medium text-slate-600">
      <span className={cn("h-2 w-2 rounded-full", closed || offline ? "bg-amber-500" : "bg-emerald-500")} />
      {label}
    </span>
  );
}

function ServiceButton({
  active,
  onClick,
  icon: Icon,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof FileText;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-xl border p-3 text-left transition",
        active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      <Icon className={cn("h-5 w-5", active ? "text-white" : "text-slate-700")} aria-hidden />
      <p className="mt-2 text-[13.5px] font-semibold">{title}</p>
      <p className={cn("text-[11.5px]", active ? "text-slate-300" : "text-slate-500")}>{sub}</p>
    </button>
  );
}

function FilePicker({
  accept,
  onPick,
  filled,
  children,
}: {
  accept: string;
  onPick: (file: File | undefined) => void;
  filled: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "mt-2 flex h-14 cursor-pointer items-center rounded-xl border px-3.5 text-[14px] transition",
        filled ? "border-slate-200 bg-slate-50" : "border-dashed border-slate-300 hover:border-slate-400",
      )}
    >
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          onPick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {children}
    </label>
  );
}

function SideTile({
  label,
  image,
  busy,
  onPick,
  onClear,
}: {
  label: string;
  image: LoadedImage | null;
  busy: boolean;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <label
        className={cn(
          "flex aspect-[1.585] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border text-[12.5px] transition",
          image ? "border-slate-200" : "border-dashed border-slate-300 text-slate-500 hover:border-slate-400",
        )}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            onPick(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.element.src} alt={label} className="h-full w-full object-cover" />
        ) : (
          <>
            <Plus className="h-5 w-5" />
            <span className="mt-1">{label}</span>
          </>
        )}
      </label>
      {image ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={`${label} hataiye`}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-md px-3 py-1.5 text-[13px] font-medium transition",
            value === option.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200">
      <button
        type="button"
        aria-label="Kam"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-9 w-9 items-center justify-center text-slate-600 disabled:opacity-30"
        disabled={value <= 1}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-[14px] font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Zyada"
        onClick={() => onChange(Math.min(MAX_COPIES, value + 1))}
        className="flex h-9 w-9 items-center justify-center text-slate-600 disabled:opacity-30"
        disabled={value >= MAX_COPIES}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function PayBar({
  total,
  detail,
  disabled,
  busy,
  onPay,
}: {
  total: number;
  detail: string;
  disabled: boolean;
  busy: string | null;
  onPay: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1">
          <p className="text-[20px] font-semibold tabular-nums">₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
          <p className="truncate text-[12px] text-slate-500">{busy ?? detail}</p>
        </div>
        <button
          type="button"
          onClick={onPay}
          disabled={disabled}
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-6 text-[15px] font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Pay &amp; Print
        </button>
      </div>
    </div>
  );
}
