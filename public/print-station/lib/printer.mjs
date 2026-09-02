import { execFile } from "node:child_process";
import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

/**
 * Where the printing helper might be, best first.
 *
 * The first entry is the one that matters: the installer drops a copy beside
 * the program, so a shop owner never has to go and find it. The rest are the
 * places a normal install puts it, kept so a computer that already had it
 * does not download a second copy.
 */
export function appFolderSumatra() {
  try {
    return join(dirname(fileURLToPath(import.meta.url)), "..", "SumatraPDF.exe");
  } catch {
    return "";
  }
}

export const SUMATRA_CANDIDATES = [
  "C:\\Program Files\\SumatraPDF\\SumatraPDF.exe",
  "C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe",
  `${process.env.LOCALAPPDATA ?? ""}\\SumatraPDF\\SumatraPDF.exe`,
  `${process.env.LOCALAPPDATA ?? ""}\\Programs\\SumatraPDF\\SumatraPDF.exe`,
];

export function findSumatra(configuredPath, exists = existsSync) {
  const configured = String(configuredPath ?? "").trim();
  if (configured && exists(configured)) return configured;

  const beside = appFolderSumatra();
  if (beside && exists(beside)) return beside;

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
    /*
      Photos first, because Windows can print them itself.

      This is not a fallback — it is better than handing an image to a
      viewer, which is how a real job died: no application on that computer
      was associated with .webp, and there was nothing to hand it to.
    */
    if (isImageFile(filePath)) {
      return {
        kind: "dotnet-image",
        command: "powershell.exe",
        args: ["-NoProfile", "-NonInteractive", "-Command", imagePrintScript({ filePath, printerName, job })],
      };
    }

    const sumatra = findSumatra(config?.sumatraPath, exists);
    if (sumatra) {
      return { kind: "sumatra", command: sumatra, args: sumatraArgs({ filePath, printerName, job, duplex: config?.duplex }) };
    }
    /*
      The fallback when SumatraPDF is not there.

      Windows' PrintTo verb honours the printer and nothing else — it cannot
      be told the paper size or whether to use colour. So those are set on the
      printer itself first, with Windows' own Set-PrintConfiguration, and put
      back afterwards. Copies are still sent as separate calls by the caller,
      because no amount of printer configuration adds a copy count to a shell
      verb.

      This route is second choice, not a broken one: a customer who paid for
      an A3 colour page gets an A3 colour page. What it cannot promise is
      speed, since it opens the system's PDF viewer once per copy.
    */
    return {
      kind: "shell-verb",
      command: "powershell.exe",
      args: ["-NoProfile", "-NonInteractive", "-Command", shellVerbScript({ filePath, printerName, job })],
      /*
        Honest about what this can and cannot do.

        It works only if some application on that computer has registered
        itself to print this file type. For PDFs that usually means Adobe
        Reader; Edge does not. When nothing has, the job fails with a message
        about no associated application — which is what happened at a real
        counter while the log claimed this route "works fine".
      */
      degraded:
        "No fast printing helper found, so this goes through whichever app opens PDFs on this computer. If nothing does, PDFs will fail — photos are unaffected.",
    };
  }

  return { kind: IS_MAC ? "lp" : "lp", command: "lp", args: lpArgs({ filePath, printerName, job, duplex: config?.duplex }) };
}

/** Photos, which Windows can print itself — see below. */
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff"];

export function isImageFile(filePath) {
  const extension = /\.([a-z0-9]+)$/i.exec(String(filePath ?? ""))?.[1]?.toLowerCase();
  return Boolean(extension && IMAGE_EXTENSIONS.includes(extension));
}

/**
 * Print a photo using Windows' own drawing library.
 *
 * The lesson from a real counter: a customer paid for a .webp and the job
 * died on "No application is associated with the specified file for this
 * operation." Windows has no PrintTo handler for webp — and often none for
 * PDF either — so handing the file to the shell was never the safe fallback
 * I claimed it was.
 *
 * .NET can print an image directly, with no helper application involved at
 * all. It also takes the copies, the paper size and the colour setting
 * properly, which the shell verb never could. Photos and screenshots are most
 * of what a counter prints, so this is the path that matters most.
 */
export function imagePrintScript({ filePath, printerName, job }) {
  const copies = Math.max(1, Math.min(99, Math.round(Number(job?.copies) || 1)));
  const paper = String(job?.paper_size ?? "A4").toUpperCase() === "A3" ? "A3" : "A4";
  const colour = job?.color_mode === "color" ? "$true" : "$false";

  return [
    "$ErrorActionPreference = 'Stop'",
    "try {",
    "  Add-Type -AssemblyName System.Drawing",
    `  $script:img = [System.Drawing.Image]::FromFile(${quoteForPowerShell(filePath)})`,
    "  $doc = New-Object System.Drawing.Printing.PrintDocument",
    `  $doc.PrinterSettings.PrinterName = ${quoteForPowerShell(printerName)}`,
    // A printer name that no longer matches anything must say so, rather than
    // silently printing to whatever Windows considers the default.
    `  if (-not $doc.PrinterSettings.IsValid) { throw 'Printer not found: ' + ${quoteForPowerShell(printerName)} }`,
    `  $doc.PrinterSettings.Copies = ${copies}`,
    `  $doc.DefaultPageSettings.Color = ${colour}`,
    `  $paper = $doc.PrinterSettings.PaperSizes | Where-Object { $_.PaperName -eq '${paper}' } | Select-Object -First 1`,
    "  if ($paper) { $doc.DefaultPageSettings.PaperSize = $paper }",
    "  $doc.DocumentName = 'DigiConnect print'",
    "  $doc.add_PrintPage({",
    "    param($sender, $e)",
    // Fit inside the printable area without distorting it: a customer's
    // photo stretched to the page edges is a wasted sheet they paid for.
    "    $area = $e.MarginBounds",
    "    $scale = [Math]::Min($area.Width / $script:img.Width, $area.Height / $script:img.Height)",
    "    $w = [int]($script:img.Width * $scale)",
    "    $h = [int]($script:img.Height * $scale)",
    "    $x = $area.X + [int](($area.Width - $w) / 2)",
    "    $y = $area.Y + [int](($area.Height - $h) / 2)",
    "    $e.Graphics.DrawImage($script:img, $x, $y, $w, $h)",
    "    $e.HasMorePages = $false",
    "  })",
    "  $doc.Print()",
    "  $doc.Dispose()",
    "  $script:img.Dispose()",
    "} catch {",
    // Without an explicit non-zero exit, powershell.exe reports success and
    // the shop is told the page printed when it did not.
    "  Write-Error $_.Exception.Message",
    "  exit 1",
    "}",
  ].join("\n");
}

/**
 * The PowerShell that prints one copy through Windows' own viewer.
 *
 * Built as a string here rather than run, so the exact commands a shop's
 * computer will execute can be checked in a test on a machine with no
 * printer. Every step that touches printer settings is wrapped: a printer
 * that refuses to be reconfigured should still print the page, on whatever
 * its defaults are, rather than fail the job outright.
 */
export function shellVerbScript({ filePath, printerName, job }) {
  const printer = quoteForPowerShell(printerName);
  const paper = String(job?.paper_size ?? "A4").toUpperCase() === "A3" ? "A3" : "A4";
  const colour = job?.color_mode === "color" ? "$true" : "$false";

  return [
    "$ErrorActionPreference = 'Stop'",
    `try { Set-PrintConfiguration -PrinterName ${printer} -PaperSize ${paper} -Color ${colour} } catch { }`,
    `$p = Start-Process -FilePath ${quoteForPowerShell(filePath)} -Verb PrintTo -ArgumentList ${printer} -PassThru`,
    "if ($p) { Wait-Process -Id $p.Id -Timeout 120 -ErrorAction SilentlyContinue }",
    // The viewer can linger after the spool; closing it keeps a shop from
    // ending the day behind two hundred open windows.
    "if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }",
  ].join("; ");
}

/** Single-quote a value for PowerShell, doubling any quote inside it. */
export function quoteForPowerShell(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Is this actually a Windows program, or a 404 page wearing its name?
 *
 * A missed download that saved the site's HTML error page as SumatraPDF.exe
 * would be found by every later lookup and fail every print, with a message
 * about the printer rather than about the file. Every executable begins "MZ";
 * nothing else here does.
 */
export function looksLikeWindowsProgram(head) {
  return Buffer.isBuffer(head) && head.length > 2 && head[0] === 0x4d && head[1] === 0x5a;
}

/**
 * Fetch the printing helper once, so no shop owner ever installs anything.
 *
 * Best effort by design: the program prints perfectly well without it through
 * Windows' own viewer, so every failure here logs a line and returns. The
 * file is written under a temporary name and only moved into place once it
 * has been checked, because a half-written or wrong file is worse than none.
 */
export async function ensurePrintHelper({ serverUrl, config, log, fetchImpl = fetch }) {
  if (platform() !== "win32") return null;

  const existing = findSumatra(config?.sumatraPath);
  if (existing) return existing;

  const target = appFolderSumatra();
  if (!target) return null;
  const temporary = `${target}.part`;

  try {
    const response = await fetchImpl(`${String(serverUrl).replace(/\/+$/, "")}/print-station/SumatraPDF.exe`);
    if (!response.ok) throw new Error(String(response.status));

    const bytes = Buffer.from(await response.arrayBuffer());
    if (!looksLikeWindowsProgram(bytes)) throw new Error("not a program");

    writeFileSync(temporary, bytes);
    renameSync(temporary, target);
    log?.("info", "Fast printing helper installed.");
    return target;
  } catch {
    try {
      rmSync(temporary, { force: true });
    } catch {
      /* Nothing to clean up. */
    }
    /*
      Said precisely, because the old wording — "works fine" — was read by a
      shop owner as reassurance right before a job failed for exactly the
      reason this line should have warned about.
    */
    log?.(
      "info",
      "No fast printing helper. Photos print normally; PDFs need an app on this computer that can print them.",
    );
    return null;
  }
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

  /*
    The .NET path prints every copy itself through PrinterSettings.Copies, so
    it runs once. Looping it would charge a customer for three and give them
    nine.
  */
  if (plan.kind === "dotnet-image") {
    await run(plan.command, plan.args);
    return plan;
  }

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
