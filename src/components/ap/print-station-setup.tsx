"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
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
import type { PrintStation } from "@/lib/print/stations";
import { cn } from "@/lib/utils";

/**
 * A shop's print counter, set up by the shop.
 *
 * The whole product in one screen: name the counter, set what you charge,
 * print the QR, and connect the computer that does the printing. A partner
 * should be able to do all of it once, on their own, without calling anybody.
 *
 * The agent key is the one thing here that cannot be shown twice — it is
 * stored hashed, so losing it means issuing a new one. The screen says so at
 * the moment it is shown rather than in a help page nobody opens.
 */
export function PrintStationSetup({
  initialStation,
  siteUrl,
}: {
  initialStation: PrintStation | null;
  siteUrl: string;
}) {
  const { success, error } = useToast();
  const [station, setStation] = useState(initialStation);
  const [busy, setBusy] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [name, setName] = useState("");

  const scanUrl = station ? `${siteUrl}/p/${station.code}` : "";

  /* ── Create ─────────────────────────────────────────────────────────── */

  const create = async () => {
    if (name.trim().length < 2) {
      error("Give the counter a name customers will recognise.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/ap/print-station", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      const json = (await response.json()) as { data?: PrintStation; agentToken?: string; error?: string };
      if (!response.ok || !json.data) throw new Error(json.error || "Could not create the station.");

      setStation(json.data);
      setFreshToken(json.agentToken ?? null);
      success("Your print counter is ready.");
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not create the station.");
    } finally {
      setBusy(false);
    }
  };

  /* ── Save ───────────────────────────────────────────────────────────── */

  const save = async (patch: Record<string, unknown>) => {
    setBusy(true);
    try {
      const response = await fetch("/api/ap/print-station", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await response.json()) as { data?: PrintStation; error?: string };
      if (!response.ok || !json.data) throw new Error(json.error || "Could not save.");
      setStation(json.data);
      success("Saved.");
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const rotate = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/ap/print-station", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate_token" }),
      });
      const json = (await response.json()) as { agentToken?: string; error?: string };
      if (!response.ok || !json.agentToken) throw new Error(json.error || "Could not issue a new key.");
      setFreshToken(json.agentToken);
      success("New key issued. The old one has stopped working.");
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not issue a new key.");
    } finally {
      setBusy(false);
    }
  };

  /* ── Not set up yet ─────────────────────────────────────────────────── */

  if (!station) {
    return (
      <div className="lg-card mx-auto max-w-lg p-5 sm:p-7">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
          style={{ background: "var(--dc-grad-blue)" }}
        >
          <Printer className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-[1.2rem] font-extrabold text-[var(--dc-ink)] sm:text-[1.4rem]">
          Turn your printer into a counter
        </h2>
        <p className="mt-2 text-[13.5px] font-medium leading-[1.6] text-[var(--dc-body)]">
          Customers scan a QR at your shop, upload a file, pay, and your printer runs. No app for them, no
          pen drive, and nothing of theirs left on your computer.
        </p>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-[12px] font-extrabold text-[var(--dc-ink)]">
            What should customers see?
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Sharma Print Point"
            className="lg-field h-12 w-full rounded-xl px-3.5 text-[14px] font-semibold text-[var(--dc-ink)] outline-none"
          />
          <span className="mt-1.5 block text-[11.5px] font-medium text-[var(--dc-body)]">
            Your shop name, shown at the top of the page they land on.
          </span>
        </label>

        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-white transition disabled:opacity-50"
          style={{ background: "var(--dc-grad-blue)" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
          Create my print counter
        </button>
      </div>
    );
  }

  /* ── Set up ─────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {freshToken ? <TokenOnce token={freshToken} onDismiss={() => setFreshToken(null)} /> : null}

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <StationQr station={station} scanUrl={scanUrl} />

        <div className="min-w-0 space-y-4">
          <OpenClosed station={station} busy={busy} onToggle={(open) => save({ acceptingOrders: open })} />
          <Rates station={station} busy={busy} onSave={(rates) => save({ rates })} />
          <Privacy station={station} busy={busy} onSave={(minutes) => save({ autoDeleteMinutes: minutes })} />
          <AgentBox station={station} busy={busy} onRotate={rotate} siteUrl={siteUrl} />
        </div>
      </div>
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
    <div className="lg-card border-l-4 border-l-[var(--dc-flame)] p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[13.5px] font-extrabold text-[var(--dc-ink)]">
        <AlertTriangle className="h-4 w-4 text-[var(--dc-flame)]" aria-hidden="true" />
        Copy this key now — it is shown once
      </p>
      <p className="mt-1.5 text-[12.5px] font-medium leading-snug text-[var(--dc-body)]">
        Paste it into DigiConnect Print Station on the computer attached to your printer. We keep only a
        scrambled copy, so if you lose it you get a new one rather than this one back.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="lg-field min-w-0 flex-1 overflow-x-auto rounded-lg px-3 py-2.5 font-mono text-[12px] font-bold text-[var(--dc-ink)]">
          {token}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(token).then(() => {
              setCopied(true);
              success("Key copied.");
            });
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ background: "var(--dc-grad-blue)" }}
          aria-label="Copy key"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 text-[12.5px] font-bold text-[var(--dc-body)] hover:text-[var(--dc-ink)]"
      >
        I have saved it — hide this
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   The QR
   ───────────────────────────────────────────────────────────────────────── */

function StationQr({ station, scanUrl }: { station: PrintStation; scanUrl: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    /* Drawn in the browser from the URL — nothing to store, and it can never
       go stale against the code it encodes. */
    import("qrcode")
      .then((QR) =>
        QR.toDataURL(scanUrl, { width: 640, margin: 1, color: { dark: "#001D5F", light: "#FFFFFF" } }),
      )
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
    <div className="lg-card p-4 text-center sm:p-5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--dc-flame)]">
        Print this and tape it to your counter
      </p>
      <h2 className="mt-1.5 text-[1.1rem] font-extrabold text-[var(--dc-ink)]">{station.display_name}</h2>

      <div className="mx-auto mt-3 w-full max-w-[15rem] rounded-2xl bg-white p-3 shadow-[0_10px_30px_-18px_rgba(0,10,40,0.6)]">
        {dataUrl ? (
          <Image src={dataUrl} alt={`QR code for ${station.display_name}`} width={640} height={640} className="w-full" unoptimized />
        ) : (
          <div className="flex aspect-square items-center justify-center text-[var(--dc-body)]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>

      <p className="mt-3 font-mono text-[1.3rem] font-extrabold tracking-[0.12em] text-[var(--dc-ink)]">
        {station.code}
      </p>
      <p className="mt-0.5 text-[11.5px] font-medium text-[var(--dc-body)]">
        Somebody without a camera can type this at {scanUrl.replace(/^https?:\/\//, "").split("/p/")[0]}/p
      </p>

      <a
        href={dataUrl ?? "#"}
        download={`${station.code}-print-qr.png`}
        aria-disabled={!dataUrl}
        className={cn(
          "mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-bold transition",
          dataUrl ? "lg-pill lg-raise text-[var(--dc-blue-mid)]" : "pointer-events-none opacity-40",
        )}
      >
        <Download className="h-4 w-4" />
        Download the QR
      </a>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Settings
   ───────────────────────────────────────────────────────────────────────── */

function OpenClosed({
  station,
  busy,
  onToggle,
}: {
  station: PrintStation;
  busy: boolean;
  onToggle: (open: boolean) => void;
}) {
  return (
    <div className="lg-card flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">
          {station.accepting_orders ? "Counter is open" : "Counter is closed"}
        </p>
        <p className="mt-0.5 text-[12px] font-medium leading-snug text-[var(--dc-body)]">
          {station.accepting_orders
            ? "Customers can scan and pay right now."
            : "Anyone scanning is told you are closed — before they pay, not after."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={station.accepting_orders}
        disabled={busy}
        onClick={() => onToggle(!station.accepting_orders)}
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50",
          station.accepting_orders ? "" : "bg-[var(--dc-ink)]/15",
        )}
        style={station.accepting_orders ? { background: "var(--dc-grad-blue)" } : undefined}
      >
        <span
          className={cn(
            "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all",
            station.accepting_orders ? "left-7" : "left-1",
          )}
        />
      </button>
    </div>
  );
}

const RATE_FIELDS = [
  { key: "a4_mono" as const, label: "A4 black & white" },
  { key: "a4_color" as const, label: "A4 colour" },
  { key: "a3_mono" as const, label: "A3 black & white" },
  { key: "a3_color" as const, label: "A3 colour" },
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
  const changed = RATE_FIELDS.some((field) => Number(draft[field.key]) !== Number(station.rates[field.key]));

  return (
    <div className="lg-card p-4 sm:p-5">
      <h3 className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">What you charge, per page</h3>
      <p className="mt-0.5 text-[12px] font-medium text-[var(--dc-body)]">
        Your rates, not ours. The customer sees the total before paying.
      </p>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {RATE_FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-1 block text-[11.5px] font-bold text-[var(--dc-body)]">{field.label}</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[var(--dc-body)]">
                ₹
              </span>
              <input
                type="number"
                min={1}
                max={60}
                step="0.5"
                value={draft[field.key]}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, [field.key]: Number(event.target.value) }))
                }
                className="lg-field h-11 w-full rounded-lg pl-7 pr-3 text-[14px] font-bold text-[var(--dc-ink)] outline-none"
              />
            </div>
          </label>
        ))}
      </div>

      {changed ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave(draft as unknown as Record<string, number>)}
          className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: "var(--dc-grad-blue)" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save rates
        </button>
      ) : null}
    </div>
  );
}

function Privacy({
  station,
  busy,
  onSave,
}: {
  station: PrintStation;
  busy: boolean;
  onSave: (minutes: number) => void;
}) {
  return (
    <div className="lg-card p-4 sm:p-5">
      <h3 className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">
        How long a customer&rsquo;s file survives
      </h3>
      <p className="mt-0.5 text-[12px] font-medium leading-snug text-[var(--dc-body)]">
        This is what you sell. Nobody at your shop can open the file, and it is deleted on this timer whether
        it printed or not. Say it out loud to customers — the shop down the road cannot.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[5, 15, 30, 60].map((minutes) => (
          <button
            key={minutes}
            type="button"
            disabled={busy}
            onClick={() => onSave(minutes)}
            className={cn(
              "h-10 rounded-xl px-4 text-[13px] font-bold transition disabled:opacity-50",
              station.auto_delete_minutes === minutes ? "text-white" : "lg-pill text-[var(--dc-body)]",
            )}
            style={station.auto_delete_minutes === minutes ? { background: "var(--dc-grad-blue)" } : undefined}
          >
            {minutes} min
          </button>
        ))}
      </div>
    </div>
  );
}

function AgentBox({
  station,
  busy,
  onRotate,
  siteUrl,
}: {
  station: PrintStation;
  busy: boolean;
  onRotate: () => void;
  siteUrl: string;
}) {
  return (
    <div className="lg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">Your printer&rsquo;s computer</h3>
          <p
            className={cn(
              "mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-bold",
              station.agent_connected ? "text-[#0f9d58]" : "text-[var(--dc-flame)]",
            )}
          >
            {station.agent_connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {station.agent_connected ? "Connected" : "Not connected"}
          </p>
          <p className="mt-1.5 text-[12px] font-medium leading-snug text-[var(--dc-body)]">
            {station.agent_connected
              ? "Print Station is running and jobs will go straight to your printer."
              : "Install DigiConnect Print Station on the computer attached to your printer and paste your key into it. Until then, orders will queue but nothing will print."}
          </p>
        </div>
      </div>

      {/*
        The step that was missing.

        A partner was handed a key and told to paste it into a program that
        existed nowhere and had no download. Until the computer is connected,
        installing it is the only thing on this screen that matters — so it
        is shown first, in full, and collapses to a line once it is done.
      */}
      {station.agent_connected ? null : <InstallSteps siteUrl={siteUrl} />}

      <button
        type="button"
        onClick={onRotate}
        disabled={busy}
        className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[12.5px] font-bold text-[var(--dc-body)] transition hover:text-[var(--dc-ink)] disabled:opacity-50 lg-pill"
      >
        <KeyRound className="h-4 w-4" />
        {station.has_agent_token ? "Lost the key? Issue a new one" : "Issue a key"}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Getting the printer's computer connected
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Three steps, in the order a shop owner does them.
 *
 * Written for somebody standing at a counter with a customer waiting, not for
 * somebody reading documentation: one command to copy, one thing to click,
 * one page to fill in. Everything that could be a paragraph is a step.
 */
function InstallSteps({ siteUrl }: { siteUrl: string }) {
  const { success } = useToast();
  const command = `irm ${siteUrl}/print-station/install.ps1 | iex`;

  const steps = [
    {
      title: "Open PowerShell on your printer's computer",
      body: "Press the Windows key, type PowerShell, and press Enter.",
    },
    {
      title: "Paste this one line and press Enter",
      body: "It installs DigiConnect Print Station and puts a shortcut on the desktop. No admin password needed.",
      command,
    },
    {
      title: "Paste your key into the page that opens",
      body: "Pick your printer from the list, then use Print a test page. When a page comes out, this screen will say Connected.",
    },
  ];

  return (
    <div className="mt-4 min-w-0 rounded-2xl border border-[rgba(15,32,73,.1)] bg-[rgba(255,255,255,.6)] p-4">
      <p className="text-[12.5px] font-extrabold text-[var(--dc-ink)]">Connect it in three steps</p>

      <ol className="mt-3 space-y-3">
        {steps.map((step, index) => (
          /* min-w-0 all the way down: a flex item's default min-width is
             auto, so the nowrap command below would otherwise set the width
             of this whole column and push every card off the screen. */
          <li key={step.title} className="flex min-w-0 gap-3">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11.5px] font-extrabold text-white"
              style={{ background: "var(--dc-grad-blue)" }}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-[var(--dc-ink)]">{step.title}</p>
              <p className="mt-0.5 text-[12px] font-medium leading-snug text-[var(--dc-body)]">{step.body}</p>

              {step.command ? (
                <div className="mt-2 flex min-w-0 items-center gap-2">
                  <code className="lg-field min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg px-3 py-2 font-mono text-[11.5px] font-bold text-[var(--dc-ink)]">
                    {step.command}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(step.command).then(() => success("Command copied."));
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ background: "var(--dc-grad-blue)" }}
                    aria-label="Copy the install command"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[11.5px] font-medium leading-snug text-[var(--dc-body)]">
        On a Mac or a Linux computer, download{" "}
        <a href={`${siteUrl}/print-station/README.md`} className="font-bold text-[var(--dc-blue-deep)] underline">
          the setup guide
        </a>{" "}
        instead.
      </p>
    </div>
  );
}
