"use client";

import Image from "@/components/ui/safe-image";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpCircle,
  Check,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Printer,
  QrCode,
  Wifi,
  WifiOff,
} from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { PRINT_STATION_VERSION } from "@/lib/print/bundle-version.generated";
import { PrinterPicker } from "@/components/ap/print-printer-picker";
import { PrintJobsPanel } from "@/components/ap/print-jobs-panel";
import { renderPrintPoster } from "@/lib/print/poster";
import type { PrintStation } from "@/lib/print/stations";
import { cn } from "@/lib/utils";

/**
 * A shop's Digi Print counter, set up and run by the shop.
 *
 * One screen, top to bottom in the order a partner needs it: is there an
 * update, what came in today, the QR, then the switches (open, colour, A3,
 * approval), the rates, the printer, and the connector. Neutral and quiet on
 * purpose — the colour on this page is reserved for things that need action.
 */

/* ── Small shared pieces ─────────────────────────────────────────────── */

function Panel({ title, sub, children, className }: { title?: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-4 sm:p-5", className)}>
      {title ? <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3> : null}
      {sub ? <p className="mt-0.5 text-[12.5px] text-slate-500">{sub}</p> : null}
      {children}
    </section>
  );
}

function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50",
        checked ? "bg-slate-900" : "bg-slate-200",
      )}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

function SwitchRow({
  title,
  sub,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  sub: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-slate-900">{title}</p>
        <p className="text-[12px] text-slate-500">{sub}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  );
}

/* ── The screen ──────────────────────────────────────────────────────── */

export function PrintStationSetup({
  initialStation,
  siteUrl,
  waitingJobs = 0,
}: {
  initialStation: PrintStation | null;
  siteUrl: string;
  /** Paid jobs this counter has not printed yet. */
  waitingJobs?: number;
}) {
  const { success, error } = useToast();
  const [station, setStation] = useState(initialStation);
  const [busy, setBusy] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [name, setName] = useState("");

  const scanUrl = station ? `${siteUrl}/p/${station.code}` : "";

  const call = async (method: "POST" | "PATCH", body: Record<string, unknown>) => {
    const response = await fetch("/api/ap/print-station", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as { data?: PrintStation; agentToken?: string; error?: string };
    if (!response.ok) throw new Error(json.error || "Save nahi hua.");
    return json;
  };

  const create = async () => {
    if (name.trim().length < 2) {
      error("Counter ka naam likhiye jo customers pehchanein.");
      return;
    }
    setBusy(true);
    try {
      const json = await call("POST", { displayName: name });
      if (!json.data) throw new Error("Counter nahi ban paya.");
      setStation(json.data);
      setFreshToken(json.agentToken ?? null);
      success("Aapka print counter taiyar hai.");
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Counter nahi ban paya.");
    } finally {
      setBusy(false);
    }
  };

  const save = async (patch: Record<string, unknown>, message = "Save ho gaya.") => {
    setBusy(true);
    try {
      const json = await call("PATCH", patch);
      if (!json.data) throw new Error("Save nahi hua.");
      setStation(json.data);
      success(message);
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Save nahi hua.");
    } finally {
      setBusy(false);
    }
  };

  const rotate = async () => {
    setBusy(true);
    try {
      const json = await call("PATCH", { action: "rotate_token" });
      if (!json.agentToken) throw new Error("Nayi key nahi ban payi.");
      setFreshToken(json.agentToken);
      success("Nayi key ban gayi. Purani band ho gayi.");
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Nayi key nahi ban payi.");
    } finally {
      setBusy(false);
    }
  };

  /* ── Not set up yet ─────────────────────────────────────────────────── */

  if (!station) {
    return (
      <Panel className="mx-auto max-w-lg p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Printer className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-[18px] font-semibold text-slate-900">Apna printer QR counter banaiye</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">
          Customer QR scan kare, file bheje, pay kare — aur aapka printer turant print kare. Har payment aapke
          wallet me.
        </p>
        <label className="mt-5 block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-slate-700">Customer ko kya naam dikhe?</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Sharma Print Point"
            className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[14px] outline-none focus:border-slate-900"
          />
        </label>
        <PrimaryButton onClick={create} disabled={busy} className="mt-4 h-11 w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
          Counter banaiye
        </PrimaryButton>
      </Panel>
    );
  }

  /* ── Set up ─────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {freshToken ? <TokenOnce token={freshToken} onDismiss={() => setFreshToken(null)} /> : null}

      <UpdateBanner station={station} busy={busy} onRequest={() => save({ action: "request_update" }, "Update bhej diya — computer agle check par install karega.")} />

      <PrintJobsPanel requireApproval={station.require_approval} />

      <div className="grid gap-4 lg:grid-cols-[21rem_1fr]">
        <StationQr station={station} scanUrl={scanUrl} />

        <div className="min-w-0 space-y-4">
          <Panel title="Counter settings" sub="Customer ko sirf wahi dikhega jo yahan ON hai.">
            <div className="mt-2 divide-y divide-slate-100">
              <SwitchRow
                title="Counter khula hai"
                sub={station.accepting_orders ? "Customers order kar sakte hain" : "Band — koi naya order nahi"}
                checked={station.accepting_orders}
                disabled={busy}
                onChange={(next) => save({ acceptingOrders: next }, next ? "Counter khul gaya." : "Counter band.")}
              />
              <SwitchRow
                title="Colour print"
                sub="OFF karne par sirf black & white"
                checked={station.offer_color}
                disabled={busy}
                onChange={(next) => save({ offerColor: next })}
              />
              <SwitchRow
                title="A3 size"
                sub="OFF karne par sirf A4"
                checked={station.offer_a3}
                disabled={busy}
                onChange={(next) => save({ offerA3: next })}
              />
              <SwitchRow
                title="Print se pehle main approve karunga"
                sub="ON par har paid job aapke OK ke baad print hoga"
                checked={station.require_approval}
                disabled={busy}
                onChange={(next) => save({ requireApproval: next })}
              />
            </div>
          </Panel>

          <Rates key={`${station.offer_a3}-${station.offer_color}`} station={station} busy={busy} onSave={(rates) => save({ rates }, "Rate save ho gaye.")} />

          <PrinterPicker
            station={station}
            busy={busy}
            onSave={(printerName, colorPrinterName) => save({ printerName, colorPrinterName }, "Printer save ho gaya.")}
          />

          <Privacy station={station} busy={busy} onSave={(minutes) => save({ autoDeleteMinutes: minutes })} />

          <AgentBox station={station} busy={busy} onRotate={rotate} siteUrl={siteUrl} waitingJobs={waitingJobs} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Updates
   ───────────────────────────────────────────────────────────────────────── */

function isOlder(current: string | null, latest: string): boolean {
  const parts = (value: string | null) => String(value ?? "0.0.0").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const a = parts(current);
  const b = parts(latest);
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) < (b[index] ?? 0);
  }
  return false;
}

/**
 * "A newer connector exists" — with a button that installs it.
 *
 * The connector reports its version on every poll. When ours is newer the
 * partner can install it from here: the counter PC downloads it on its next
 * poll, writes it over itself and restarts, keeping its key and printer. The
 * partner decides when; nothing changes on their PC until they press it.
 */
function UpdateBanner({ station, busy, onRequest }: { station: PrintStation; busy: boolean; onRequest: () => void }) {
  if (!station.agent_version || !isOlder(station.agent_version, PRINT_STATION_VERSION)) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-slate-900">Naya update available — v{PRINT_STATION_VERSION}</p>
          <p className="text-[12.5px] text-slate-600">
            {station.update_requested
              ? "Install ho raha hai — computer on aur internet se juda hona chahiye. Kuch minute me ho jayega."
              : `Aapke computer par v${station.agent_version} hai. Ek click me install — key aur printer wahi rahenge.`}
          </p>
        </div>
      </div>
      {station.update_requested ? (
        <span className="inline-flex h-10 shrink-0 items-center gap-2 px-2 text-[13px] font-medium text-indigo-700">
          <Loader2 className="h-4 w-4 animate-spin" /> Install ho raha hai
        </span>
      ) : (
        <PrimaryButton onClick={onRequest} disabled={busy || !station.agent_connected} className="shrink-0">
          <Download className="h-4 w-4" />
          Update install karo
        </PrimaryButton>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   The key, shown once
   ───────────────────────────────────────────────────────────────────────── */

function TokenOnce({ token, onDismiss }: { token: string; onDismiss: () => void }) {
  const { success } = useToast();
  const [copied, setCopied] = useState(false);

  return (
    <Panel className="border-amber-200 bg-amber-50/50">
      <p className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-900">
        <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
        Ye key abhi copy kar lijiye — sirf ek baar dikhegi
      </p>
      <p className="mt-1 text-[12.5px] text-slate-600">
        Download wale Print Station me key pehle se hoti hai. Ye sirf haath se lagane ke liye hai.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-[12px]">
          {token}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(token).then(() => {
              setCopied(true);
              success("Key copy ho gayi.");
            });
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white"
          aria-label="Copy key"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <button type="button" onClick={onDismiss} className="mt-3 text-[12.5px] font-medium text-slate-600 hover:text-slate-900">
        Save kar li — chhupaiye
      </button>
    </Panel>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   The QR
   ───────────────────────────────────────────────────────────────────────── */

function StationQr({ station, scanUrl }: { station: PrintStation; scanUrl: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    import("qrcode")
      .then((QR) => QR.toDataURL(scanUrl, { width: 640, margin: 1, color: { dark: "#0f172a", light: "#FFFFFF" } }))
      .then((url) => {
        if (alive) setDataUrl(url);
      })
      .catch(() => {
        if (alive) setDataUrl(null);
      });
    return () => {
      alive = false;
    };
  }, [scanUrl]);

  return (
    <Panel className="h-fit text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Counter QR</p>
      <h2 className="mt-1 text-[16px] font-semibold text-slate-900">{station.display_name}</h2>

      <div className="mx-auto mt-3 w-full max-w-[14rem] rounded-xl border border-slate-100 bg-white p-2.5">
        {dataUrl ? (
          <Image src={dataUrl} alt={`QR code for ${station.display_name}`} width={640} height={640} className="w-full" unoptimized />
        ) : (
          <div className="flex aspect-square items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>

      <p className="mt-3 font-mono text-[18px] font-semibold tracking-[0.18em] text-slate-900">{station.code}</p>

      <PosterButtons station={station} scanUrl={scanUrl} />

      <a
        href={dataUrl ?? "#"}
        download={`${station.code}-print-qr.png`}
        aria-disabled={!dataUrl}
        className={cn(
          "mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-900",
          !dataUrl && "pointer-events-none opacity-40",
        )}
      >
        <Download className="h-3.5 w-3.5" />
        Sirf QR (bina design)
      </a>
    </Panel>
  );
}

/**
 * The counter poster: A5 at 300 dpi, sharp on A5 and fine enlarged to A4.
 */
function PosterButtons({ station, scanUrl }: { station: PrintStation; scanUrl: string }) {
  const { error } = useToast();
  const [poster, setPoster] = useState<string | null>(null);
  const [making, setMaking] = useState(false);

  const make = async (): Promise<string | null> => {
    if (poster) return poster;
    setMaking(true);
    try {
      const url = await renderPrintPoster({ shopName: station.display_name, code: station.code, scanUrl, rates: station.rates });
      setPoster(url);
      return url;
    } catch {
      error("Poster nahi ban paya. Sirf QR download kar lijiye.");
      return null;
    } finally {
      setMaking(false);
    }
  };

  const download = async () => {
    const url = await make();
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${station.code}-digi-print-poster.png`;
    link.click();
  };

  const print = async () => {
    const url = await make();
    if (!url) return;
    const win = window.open("", "_blank");
    if (!win) return download();
    win.document.write(
      `<!doctype html><title>${station.code} poster</title><style>@page{size:A4;margin:8mm}html,body{margin:0}img{width:100%;height:auto;display:block}</style><img src="${url}" onload="setTimeout(function(){window.print()},150)">`,
    );
    win.document.close();
  };

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <PrimaryButton onClick={download} disabled={making}>
        {making ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Poster
      </PrimaryButton>
      <button
        type="button"
        onClick={print}
        disabled={making}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
      >
        <Printer className="h-4 w-4" />
        Print
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Rates and privacy
   ───────────────────────────────────────────────────────────────────────── */

const RATE_FIELDS = [
  { key: "a4_mono" as const, label: "A4 black & white", a3: false, color: false },
  { key: "a4_color" as const, label: "A4 colour", a3: false, color: true },
  { key: "a3_mono" as const, label: "A3 black & white", a3: true, color: false },
  { key: "a3_color" as const, label: "A3 colour", a3: true, color: true },
];

function Rates({
  station,
  busy,
  onSave,
}: {
  station: PrintStation;
  busy: boolean;
  onSave: (rates: Record<string, number>) => void;
}) {
  const [draft, setDraft] = useState(station.rates);
  // Only the rates for what this counter sells.
  const fields = RATE_FIELDS.filter((field) => (!field.a3 || station.offer_a3) && (!field.color || station.offer_color));
  const changed = fields.some((field) => Number(draft[field.key]) !== Number(station.rates[field.key]));

  return (
    <Panel title="Rate (per page)" sub="Customer pay karne se pehle total dekhta hai.">
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-1 block text-[12px] text-slate-500">{field.label}</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">₹</span>
              <input
                type="number"
                min={1}
                max={60}
                step="0.5"
                value={draft[field.key]}
                onChange={(event) => setDraft((current) => ({ ...current, [field.key]: Number(event.target.value) }))}
                className="h-10 w-full rounded-lg border border-slate-200 pl-7 pr-3 text-[14px] font-medium outline-none focus:border-slate-900"
              />
            </div>
          </label>
        ))}
      </div>
      {changed ? (
        <PrimaryButton className="mt-3" disabled={busy} onClick={() => onSave(draft as unknown as Record<string, number>)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Rate save kijiye
        </PrimaryButton>
      ) : null}
    </Panel>
  );
}

function Privacy({ station, busy, onSave }: { station: PrintStation; busy: boolean; onSave: (minutes: number) => void }) {
  return (
    <Panel title="File kitni der rahe" sub="Print ke baad customer ki file is time par apne aap delete ho jati hai.">
      <div className="mt-3 inline-flex rounded-lg bg-slate-100 p-0.5">
        {[5, 15, 30, 60].map((minutes) => (
          <button
            key={minutes}
            type="button"
            disabled={busy}
            onClick={() => onSave(minutes)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition disabled:opacity-50",
              station.auto_delete_minutes === minutes ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
            )}
          >
            {minutes} min
          </button>
        ))}
      </div>
    </Panel>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   The printer's computer
   ───────────────────────────────────────────────────────────────────────── */

function AgentBox({
  station,
  busy,
  onRotate,
  siteUrl,
  waitingJobs,
}: {
  station: PrintStation;
  busy: boolean;
  onRotate: () => void;
  siteUrl: string;
  waitingJobs: number;
}) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-slate-900">Printer wala computer</h3>
          <p
            className={cn(
              "mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-medium",
              station.agent_connected ? "text-emerald-700" : "text-amber-700",
            )}
          >
            {station.agent_connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {station.agent_connected ? "Connected" : "Connected nahi"}
            {station.agent_version ? <span className="text-slate-400">· v{station.agent_version}</span> : null}
          </p>
          <p className="mt-1 text-[12.5px] text-slate-500">
            {station.agent_connected
              ? "Print Station chal raha hai — jobs seedha printer par jayenge."
              : "Printer wale computer par Print Station download karke ek baar chalaiye. Tab tak customer ko payment se pehle hi bata diya jata hai."}
          </p>
        </div>
      </div>

      {/*
        Money taken, paper not out: shown while paid jobs are stuck, whatever
        the connection light says, because a station that is connected and
        failing every job looks identical from the outside.
      */}
      {waitingJobs > 0 ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {waitingJobs} paid {waitingJobs === 1 ? "job" : "jobs"} waiting to print
          </p>
          <p className="mt-1 text-[12px] text-amber-900/80">
            Customer ne pay kar diya hai. Printer wale computer par Print Station chalu kijiye — chalu hote hi ye
            khud print ho jayenge.
          </p>
        </div>
      ) : null}

      {/* The download is never hidden: it is also how a shop gets a fix by hand. */}
      <InstallSteps siteUrl={siteUrl} connected={station.agent_connected} />

      <button
        type="button"
        onClick={onRotate}
        disabled={busy}
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
      >
        <KeyRound className="h-3.5 w-3.5" />
        {station.has_agent_token ? "Key kho gayi? Nayi banaiye" : "Key banaiye"}
      </button>
    </Panel>
  );
}

/**
 * Getting the printer's computer connected.
 *
 * The download carries the key, so the only step is "extract and double-click
 * once". The PowerShell line stays underneath for a browser that blocks the
 * file.
 */
function InstallSteps({ siteUrl, connected }: { siteUrl: string; connected: boolean }) {
  const { success } = useToast();
  const [showCommand, setShowCommand] = useState(false);
  const command = `irm ${siteUrl}/print-station/install.ps1 | iex`;

  return (
    <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
      <a
        href="/api/ap/print-station/download"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-[13.5px] font-semibold text-white transition hover:bg-slate-800"
      >
        <Download className="h-4 w-4" />
        Print Station download — v{PRINT_STATION_VERSION}
      </a>
      <ol className="mt-3 space-y-1 text-[12.5px] text-slate-600">
        <li>1. Zip ko Extract kijiye.</li>
        <li>2. &ldquo;Start Print Station&rdquo; par ek baar double-click. Bas — hamesha ke liye install.</li>
        <li>3. Aage ke updates yahin panel se ek click me.</li>
      </ol>
      <p className="mt-2 text-[11.5px] text-slate-500">
        Har download par nayi key banti hai aur purani band ho jati hai.{" "}
        {connected ? "Already chal raha hai to update ke liye upar wala button use kijiye." : null}
      </p>

      <button
        type="button"
        onClick={() => setShowCommand((open) => !open)}
        className="mt-2 block text-[11.5px] font-medium text-slate-500 underline hover:text-slate-900"
      >
        {showCommand ? "Chhupaiye" : "Download nahi ho raha? Command se install kijiye"}
      </button>

      {showCommand ? (
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[11.5px]">
            {command}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(command).then(() => success("Command copy ho gaya."));
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white"
            aria-label="Copy the install command"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
