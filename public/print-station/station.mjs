#!/usr/bin/env node
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { configPath, configProblems, isReady, loadConfig, saveConfig } from "./lib/config.mjs";
import { createApi } from "./lib/api.mjs";
import { createLog } from "./lib/log.mjs";
import { createWorker } from "./lib/worker.mjs";
import { listPrinters, printFile } from "./lib/printer.mjs";
import { renderPage } from "./lib/page.mjs";

/**
 * DigiConnect Print Station.
 *
 * A shop owner double-clicks this, a page opens on their own computer, they
 * paste the key from their dashboard and pick a printer. From then on the
 * computer prints what customers order at the QR taped to the counter, and
 * deletes their files the moment the pages are out.
 *
 * It listens on localhost only. Nothing on the shop's network — let alone the
 * internet — can reach this program: it makes outbound calls to the website
 * and answers nobody.
 */

const PORT = Number(process.env.DCPS_PORT || 7171);

const log = createLog();
const state = {
  running: false,
  connected: false,
  queued: 0,
  printed: 0,
  failed: 0,
  lastError: null,
  lastPollAt: null,
  stoppedReason: null,
  stationName: null,
};

let config = loadConfig();
let printers = [];
let worker = null;

/* ─────────────────────────────────────────────────────────────────────────
   The loop
   ───────────────────────────────────────────────────────────────────────── */

function stopWorker() {
  worker?.stop();
  worker = null;
  state.running = false;
  state.connected = false;
}

function startWorker() {
  stopWorker();

  const problems = configProblems(config);
  if (problems.length) {
    state.stoppedReason = problems[0];
    return;
  }

  state.stoppedReason = null;
  const api = createApi({ serverUrl: config.serverUrl, agentToken: config.agentToken });

  worker = createWorker({
    api,
    config,
    printers,
    state,
    log: log.push,
    print: ({ filePath, job }) =>
      printFile({ filePath, printerName: config.printerName, job, config }),
  });

  worker.start();
  state.running = true;
  log.push("info", `Watching for jobs. Printing to "${config.printerName}".`);
}

/* ─────────────────────────────────────────────────────────────────────────
   The test page
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A one-page PDF, built by hand.
 *
 * Written as bytes rather than pulled from a library because this program has
 * no dependencies on purpose — a shop owner should be able to run it on a
 * counter PC with nothing installed but Node. It exists so a partner can
 * prove the printer works before a customer is standing there.
 */
function testPagePdf() {
  const text = `DigiConnect Print Station works. ${new Date().toLocaleString()}`;
  const content = `BT /F1 16 Tf 60 700 Td (${text.replace(/[()\\]/g, "")}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

async function printTestPage() {
  if (!config.printerName) throw new Error("Choose a printer first.");

  const folder = mkdtempSync(join(tmpdir(), "dcps-test-"));
  const path = join(folder, "test.pdf");
  writeFileSync(path, testPagePdf());
  try {
    await printFile({
      filePath: path,
      printerName: config.printerName,
      job: { copies: 1, pages: 1, paper_size: "A4", color_mode: "mono" },
      config,
    });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   The local screen
   ───────────────────────────────────────────────────────────────────────── */

function json(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  response.end(payload);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
    // A setup form is a few hundred bytes. Anything larger is not a form.
    if (chunks.reduce((total, part) => total + part.length, 0) > 64 * 1024) break;
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");

  if (url.pathname === "/" && request.method === "GET") {
    const page = renderPage();
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(page);
    return;
  }

  if (url.pathname === "/api/state" && request.method === "GET") {
    json(response, 200, {
      ...state,
      config,
      printers,
      problems: configProblems(config),
      configPath: configPath(),
      log: log.lines(),
    });
    return;
  }

  if (url.pathname === "/api/save" && request.method === "POST") {
    const body = await readBody(request);
    // The token field is left untouched when the form sends back nothing —
    // a partner editing the poll interval should not have to fetch their key
    // out of a drawer.
    config = saveConfig({ ...config, ...body, agentToken: String(body.agentToken ?? config.agentToken) });
    printers = await listPrinters();
    log.push("info", "Settings saved.");
    startWorker();
    json(response, 200, { ok: isReady(config), problems: configProblems(config) });
    return;
  }

  if (url.pathname === "/api/test-print" && request.method === "POST") {
    try {
      await printTestPage();
      log.push("success", `Test page sent to "${config.printerName}".`);
      json(response, 200, { ok: true, printer: config.printerName });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.push("error", `Test page failed: ${message}`);
      json(response, 200, { ok: false, error: message });
    }
    return;
  }

  json(response, 404, { error: "Not found" });
});

/** Open the shop owner's browser at the setup page, on whichever OS this is. */
function openBrowser(url) {
  const command =
    process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
    : process.platform === "darwin" ? ["open", [url]]
    : ["xdg-open", [url]];
  execFile(command[0], command[1], { windowsHide: true }, () => {
    /* No browser is not a failure — the address is printed below. */
  });
}

/*
  Bound to 127.0.0.1 rather than every interface.

  This program holds the key to a shop's print queue and, briefly, its
  customers' documents. On a shop's flat network — often shared with a
  neighbour's wifi — a server listening on 0.0.0.0 would let anybody on it
  read the settings page and change the printer.
*/
server.listen(PORT, "127.0.0.1", async () => {
  console.log("");
  console.log("  DigiConnect Print Station");
  console.log(`  Settings: http://localhost:${PORT}`);
  console.log(`  Config file: ${configPath()}`);
  console.log("");

  printers = await listPrinters();
  if (!printers.length) log.push("warn", "No printer found on this computer yet.");

  startWorker();
  if (!isReady(config)) openBrowser(`http://localhost:${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`\n  Print Station is already running. Open http://localhost:${PORT}\n`);
    openBrowser(`http://localhost:${PORT}`);
    process.exit(0);
  }
  console.error(error);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopWorker();
    server.close(() => process.exit(0));
  });
}
