import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { platform } from "node:os";

/**
 * The part that puts ink on paper.
 *
 * Printing a PDF without a human clicking anything is the one genuinely
 * awkward thing this program does, and it is awkward differently on every
 * operating system. The decisions are kept as pure functions here so they can
 * be tested on a machine with no printer attached; only `run` touches the
 * world.
 */

const IS_WINDOWS = platform() === "win32";
const IS_MAC = platform() === "darwin";

/** Where SumatraPDF installs itself, in the order worth looking. */
export const SUMATRA_CANDIDATES = [
  "C:\\Program Files\\SumatraPDF\\SumatraPDF.exe",
  "C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe",
  `${process.env.LOCALAPPDATA ?? ""}\\SumatraPDF\\SumatraPDF.exe`,
  `${process.env.LOCALAPPDATA ?? ""}\\Programs\\SumatraPDF\\SumatraPDF.exe`,
];

export function findSumatra(configuredPath, exists = existsSync) {
  const configured = String(configuredPath ?? "").trim();
  if (configured && exists(configured)) return configured;
  return SUMATRA_CANDIDATES.find((candidate) => candidate.length > 20 && exists(candidate)) ?? null;
}

/**
 * The arguments that print a PDF silently through SumatraPDF.
 *
 * `-print-to` names the printer, `-silent` suppresses its window and every
 * error dialog, and `-exit-when-done` stops a shop ending the day with two
 * hundred open viewers. The print settings string carries copies, paper size
 * and colour, because SumatraPDF has no separate flags for them.
 */
export function sumatraArgs({ filePath, printerName, job, duplex = false }) {
  const settings = [`${Math.max(1, job.copies ?? 1)}x`, "fit"];
  if (String(job.paper_size ?? "A4").toUpperCase() === "A3") settings.push("paper=A3");
  else settings.push("paper=A4");
  settings.push(job.color_mode === "color" ? "color" : "monochrome");
  if (duplex) settings.push("duplex");

  return ["-print-to", printerName, "-print-settings", settings.join(","), "-silent", "-exit-when-done", filePath];
}

/**
 * The CUPS command, used on macOS and Linux.
 *
 * `lp` takes each setting as its own option, which is why this does not share
 * a shape with the Windows path — pretending they were the same would mean
 * one of them silently ignoring copies.
 */
export function lpArgs({ filePath, printerName, job, duplex = false }) {
  const args = ["-d", printerName, "-n", String(Math.max(1, job.copies ?? 1))];
  args.push("-o", `media=${String(job.paper_size ?? "A4").toUpperCase() === "A3" ? "A3" : "A4"}`);
  args.push("-o", job.color_mode === "color" ? "ColorModel=RGB" : "ColorModel=Gray");
  if (duplex) args.push("-o", "sides=two-sided-long-edge");
  args.push(filePath);
  return args;
}

/**
 * Pick how to print, given what is installed.
 *
 * Returned as data rather than executed, so the choice is testable and so the
 * setup page can tell a shop owner which route their machine will take before
 * a customer is standing there waiting.
 */
export function choosePrintCommand({ filePath, printerName, job, config, os = platform(), exists = existsSync }) {
  if (os === "win32") {
    const sumatra = findSumatra(config?.sumatraPath, exists);
    if (sumatra) {
      return { kind: "sumatra", command: sumatra, args: sumatraArgs({ filePath, printerName, job, duplex: config?.duplex }) };
    }
    /*
      The fallback when SumatraPDF is not installed.

      Windows' own PrintTo verb hands the file to whatever application is
      registered for PDFs. It honours the printer and nothing else — no
      copies, no paper size — so the copies are sent as separate print calls
      by the caller and the setup page warns that this route is the lesser
      one. It exists so a shop is never completely stuck.
    */
    return {
      kind: "shell-verb",
      command: "powershell.exe",
      args: [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Start-Process -FilePath ${quoteForPowerShell(filePath)} -Verb PrintTo -ArgumentList ${quoteForPowerShell(printerName)} -PassThru | Wait-Process -Timeout 120`,
      ],
      degraded: "Copies and paper size cannot be set without SumatraPDF.",
    };
  }

  return { kind: IS_MAC ? "lp" : "lp", command: "lp", args: lpArgs({ filePath, printerName, job, duplex: config?.duplex }) };
}

/** Single-quote a value for PowerShell, doubling any quote inside it. */
export function quoteForPowerShell(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/* ─────────────────────────────────────────────────────────────────────────
   Talking to the machine
   ───────────────────────────────────────────────────────────────────────── */

function run(command, args, timeout = 120_000) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(String(stderr || error.message).trim().slice(0, 400)));
        return;
      }
      resolve(String(stdout));
    });
  });
}

/** Parse `wmic`/PowerShell printer output into names. */
export function parseWindowsPrinters(stdout) {
  return String(stdout)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line.toLowerCase() !== "name" && !/^-+$/.test(line));
}

/** Parse `lpstat -a` into names. CUPS puts the queue first, then prose. */
export function parseCupsPrinters(stdout) {
  return String(stdout)
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
}

/** Every printer this computer can see, by the name the OS uses. */
export async function listPrinters() {
  try {
    if (IS_WINDOWS) {
      const stdout = await run(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", "Get-Printer | Select-Object -ExpandProperty Name"],
        20_000,
      );
      return parseWindowsPrinters(stdout);
    }
    return parseCupsPrinters(await run("lpstat", ["-a"], 20_000));
  } catch {
    // No printers is a state the setup page can show. An exception here would
    // take the whole setup page down with it.
    return [];
  }
}

/**
 * Print one job's file.
 *
 * Resolves when the print command returns, which is when the file has been
 * handed to the spooler — not when the last page lands in the tray. No
 * consumer operating system reliably tells a program the latter, and claiming
 * otherwise in the customer's status would be a lie.
 */
export async function printFile({ filePath, printerName, job, config }) {
  const plan = choosePrintCommand({ filePath, printerName, job, config });

  if (plan.kind === "shell-verb") {
    // This route cannot ask for copies, so it asks the same number of times.
    const copies = Math.max(1, Math.min(20, job.copies ?? 1));
    for (let index = 0; index < copies; index += 1) {
      await run(plan.command, plan.args);
    }
    return plan;
  }

  await run(plan.command, plan.args);
  return plan;
}
