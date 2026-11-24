"use client";

import { useState } from "react";
import { Check, Loader2, Printer } from "lucide-react";

import type { PrintStation } from "@/lib/print/stations";

/**
 * Pick the printer from the panel, not from the counter PC.
 *
 * The connector reports the printers its computer has on every poll; this is
 * that list as a dropdown. A shop with a black-and-white laser and a colour
 * inkjet sends each job to the right one. Leaving a choice on "Automatic"
 * keeps whatever the PC itself picked (its default printer).
 */
export function PrinterPicker({
  station,
  busy,
  onSave,
}: {
  station: PrintStation;
  busy: boolean;
  onSave: (printerName: string, colorPrinterName: string) => void;
}) {
  const [main, setMain] = useState(station.printer_name ?? "");
  const [colour, setColour] = useState(station.color_printer_name ?? "");

  const options = Array.from(
    new Set([...station.available_printers, station.printer_name, station.color_printer_name].filter(Boolean)),
  ) as string[];

  const changed = main !== (station.printer_name ?? "") || colour !== (station.color_printer_name ?? "");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-900">
        <Printer className="h-4 w-4 text-slate-500" aria-hidden="true" />
        Printer
      </h3>
      <p className="mt-0.5 text-[12px] font-medium text-slate-500">
        {options.length
          ? "Aapke computer ke printers. Colour ke liye alag printer ho to neeche chuniye."
          : "Print Station chalu hote hi aapke computer ke printers yahan dikhenge."}
      </p>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-bold text-slate-500">Sab jobs (B/W + colour)</span>
          <select
            value={main}
            onChange={(event) => setMain(event.target.value)}
            disabled={!options.length}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13.5px] outline-none focus:border-slate-900 disabled:opacity-60"
          >
            <option value="">Automatic (computer ka default)</option>
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-bold text-slate-500">Colour jobs (optional)</span>
          <select
            value={colour}
            onChange={(event) => setColour(event.target.value)}
            disabled={!options.length}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13.5px] outline-none focus:border-slate-900 disabled:opacity-60"
          >
            <option value="">Upar wala hi</option>
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {changed ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave(main, colour)}
          className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-[13px] font-semibold text-white disabled:opacity-50"
          
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Printer save kijiye
        </button>
      ) : null}
      <p className="mt-2 text-[11px] font-medium text-slate-500">
        Save karte hi agla job naye printer par jayega — computer par kuch nahi karna.
      </p>
    </div>
  );
}
