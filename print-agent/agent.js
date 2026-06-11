import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import dotenv from "dotenv";
import sharp from "sharp";
import { PDFDocument, rgb } from "pdf-lib";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Load configuration
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const AGENT_SECRET_KEY = process.env.AGENT_SECRET_KEY;
const AGENT_ID = process.env.AGENT_ID || "shop-front-pc";
const DEFAULT_PRINTER_1 = process.env.DEFAULT_PRINTER_1 || null;
const DEFAULT_PRINTER_2 = process.env.DEFAULT_PRINTER_2 || null;
const COLOR_PRINTER_1 = process.env.COLOR_PRINTER_1 || null;
const COLOR_PRINTER_2 = process.env.COLOR_PRINTER_2 || null;
const NETWORK_COLOR_PRINTER = process.env.NETWORK_COLOR_PRINTER || null;
const POLL_INTERVAL = 5000; // 5 seconds

// Dynamic import of pdf-to-printer on Windows
let ptp = null;
if (process.platform === "win32") {
  try {
    const module = await import("pdf-to-printer");
    ptp = module.default || module;
    console.log("[Agent] Windows detected. pdf-to-printer loaded successfully.");
  } catch (err) {
    console.warn("[Agent] Windows detected but failed to load pdf-to-printer. Print capability will be mocked.", err.message);
  }
} else {
  console.log(`[Agent] Non-Windows OS (${process.platform}) detected. Print capability will run in mockup mode.`);
}

if (!AGENT_SECRET_KEY) {
  console.error("[Agent] CRITICAL ERROR: AGENT_SECRET_KEY is not configured in .env!");
  process.exit(1);
}

// Session Token
const sessionToken = crypto.randomUUID();
console.log(`[Agent] Started session for Agent ID: "${AGENT_ID}", Session Token: "${sessionToken}"`);

// Polling function
async function pollJobs() {
  try {
    // 1. Gather printers if running on Windows with pdf-to-printer loaded
    let printerNames = [];
    if (ptp && process.platform === "win32") {
      try {
        const printers = await ptp.getPrinters();
        printerNames = printers.map((p) => p.name);
      } catch (err) {
        console.warn("[Agent] Failed to retrieve system printers list:", err.message);
      }
    }

    const printersQuery = printerNames.length > 0 ? `&printers=${encodeURIComponent(printerNames.join(","))}` : "";
    const jobsUrl = `${API_BASE_URL}/api/print/agent/jobs?agent_id=${encodeURIComponent(AGENT_ID)}${printersQuery}`;

    // 2. Poll server for queued print jobs
    const response = await fetch(jobsUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${AGENT_SECRET_KEY}`,
        "X-Agent-ID": AGENT_ID,
        "X-Session-Token": sessionToken,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("[Agent] Polling rejected: Unauthorized. Check AGENT_SECRET_KEY.");
        return;
      }
      console.error(`[Agent] Polling failed: HTTP ${response.status}`);
      return;
    }

    const data = await response.json();
    const jobs = data.jobs || [];

    if (jobs.length > 0) {
      console.log(`[Agent] Found ${jobs.length} queued paid print job(s).`);
      // Claim and process the first job
      await processJob(jobs[0]);
    }
  } catch (error) {
    console.error("[Agent] Connection error during polling:", error.message);
  }
}

// Get list of installed Windows printers with detailed status via WMI/CIM
async function getInstalledPrinters() {
  const printersList = [];
  if (process.platform !== "win32") {
    return printersList;
  }
  try {
    const cmd = `powershell -Command "Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, PrinterState, WorkOffline, DetectedErrorState, ExtendedPrinterStatus | ConvertTo-Json"`;
    const { stdout } = await execAsync(cmd);
    if (!stdout || !stdout.trim()) return printersList;

    let printers;
    try {
      printers = JSON.parse(stdout);
    } catch (parseErr) {
      console.warn("[Agent] Failed to parse printer status JSON:", parseErr.message);
      return printersList;
    }

    const list = Array.isArray(printers) ? printers : [printers];
    for (const p of list) {
      if (p && p.Name) {
        printersList.push({
          name: p.Name,
          status: p.PrinterStatus,
          state: p.PrinterState,
          workOffline: p.WorkOffline,
          detectedErrorState: p.DetectedErrorState,
          extendedPrinterStatus: p.ExtendedPrinterStatus
        });
      }
    }
  } catch (err) {
    console.warn("[Agent] Failed to retrieve system printers details:", err.message);
  }
  return printersList;
}

// Helper to find exact printer from installed printers (case-insensitive and substring match)
function findInstalledPrinter(configuredName, installedPrinters) {
  if (!configuredName) return null;
  const lowerConfig = configuredName.toLowerCase();
  // 1. Exact case-insensitive match
  let found = installedPrinters.find(p => p.name.toLowerCase() === lowerConfig);
  // 2. Substring match if not found
  if (!found) {
    found = installedPrinters.find(p => p.name.toLowerCase().includes(lowerConfig));
  }
  return found || null;
}

// Helper to check if a printer is available (online, ready, not paused, not WorkOffline, no error)
function checkPrinterAvailability(printerObj) {
  if (!printerObj) {
    return { available: false, reason: "Printer not installed or configured" };
  }
  if (printerObj.workOffline === true) {
    return { available: false, reason: "WorkOffline is True" };
  }
  if (printerObj.status === 7) {
    return { available: false, reason: "PrinterStatus is 7 (Offline)" };
  }
  if (printerObj.detectedErrorState === 9) {
    return { available: false, reason: "DetectedErrorState is 9 (Offline)" };
  }
  if (printerObj.detectedErrorState === 4) {
    return { available: false, reason: "DetectedErrorState is 4 (No Paper)" };
  }
  if (printerObj.detectedErrorState === 8) {
    return { available: false, reason: "DetectedErrorState is 8 (Jammed)" };
  }
  if (printerObj.detectedErrorState === 7) {
    return { available: false, reason: "DetectedErrorState is 7 (Door Open)" };
  }
  if (printerObj.state === 1) {
    return { available: false, reason: "PrinterState is 1 (Paused)" };
  }
  return { available: true, reason: "Online and Ready" };
}

// Convert Image to PDF with high-quality A4 rendering, centered, 300 DPI, white background, preserving aspect ratio
async function convertImageToPdf(imagePath, pdfPath) {
  // Read file as buffer
  const imageBuffer = await fs.promises.readFile(imagePath);
  
  // 300 DPI A4 size in pixels: 8.27" * 300 = 2480 width, 11.69" * 300 = 3508 height.
  // We resize to fit inside A4 dimensions while preserving the aspect ratio.
  const resizedPngBuffer = await sharp(imageBuffer)
    .resize(2480, 3508, { fit: "inside" })
    .withMetadata({ density: 300 })
    .png()
    .toBuffer();

  // Extract dimensions of the resized image
  const metadata = await sharp(resizedPngBuffer).metadata();
  const imgWidth = metadata.width;
  const imgHeight = metadata.height;

  // Create new PDF
  const pdfDoc = await PDFDocument.create();
  
  // Standard A4 dimensions in PDF points (72 points per inch)
  const A4_WIDTH = 595.27;
  const A4_HEIGHT = 841.89;
  
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  // Draw a solid white background rectangle over the entire page
  page.drawRectangle({
    x: 0,
    y: 0,
    width: A4_WIDTH,
    height: A4_HEIGHT,
    color: rgb(1, 1, 1),
  });

  // Embed the PNG buffer
  const pngImage = await pdfDoc.embedPng(resizedPngBuffer);

  // Calculate points dimensions to center the image on the A4 page while preserving aspect ratio
  const scale = Math.min(A4_WIDTH / imgWidth, A4_HEIGHT / imgHeight);
  const displayWidth = imgWidth * scale;
  const displayHeight = imgHeight * scale;
  
  const x = (A4_WIDTH - displayWidth) / 2;
  const y = (A4_HEIGHT - displayHeight) / 2;

  // Draw the image centered
  page.drawImage(pngImage, {
    x: x,
    y: y,
    width: displayWidth,
    height: displayHeight,
  });

  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  await fs.promises.writeFile(pdfPath, pdfBytes);
}

// Claim, Download, and Print Job
async function processJob(job) {
  const jobId = job.id;
  const jobNumber = job.job_number;
  console.log(`[Agent] Attempting to claim Job ${jobNumber}...`);

  try {
    // 1. Claim job atomically
    const claimResponse = await fetch(`${API_BASE_URL}/api/print/agent/claim-job`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AGENT_SECRET_KEY}`,
        "X-Agent-ID": AGENT_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ job_id: jobId }),
    });

    if (claimResponse.status === 409) {
      console.log(`[Agent] Job ${jobNumber} was already claimed by another agent.`);
      return;
    }

    if (!claimResponse.ok) {
      const errData = await claimResponse.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to claim job: HTTP ${claimResponse.status}`);
    }

    const claimData = await claimResponse.json();
    const { file } = claimData;
    console.log(`[Agent] Successfully claimed Job ${jobNumber}. File name: ${file.file_name}`);

    // 2. Download the private file securely to a temporary local file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `print_${jobNumber}_${file.file_name}`);
    console.log(`[Agent] Downloading file to temp location: ${tempFilePath}...`);

    const downloadResponse = await fetch(file.download_url);
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download file from secure storage: HTTP ${downloadResponse.status}`);
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    await fs.promises.writeFile(tempFilePath, Buffer.from(arrayBuffer));
    console.log(`[Agent] Download complete. File size: ${formatBytes(file.file_size)}.`);

    // Check file extension
    const ext = path.extname(file.file_name).toLowerCase();
    const isImage = [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
    let printFilePath = tempFilePath;
    let tempPdfPath = null;

    if (isImage) {
      tempPdfPath = path.join(tempDir, `print_${jobNumber}_converted.pdf`);
      console.log(`[Agent] Converting image (${ext}) to PDF: ${tempPdfPath}`);
      const startConversion = Date.now();
      await convertImageToPdf(tempFilePath, tempPdfPath);
      const conversionDuration = Date.now() - startConversion;
      console.log(`[Agent] Image successfully converted to A4 PDF in ${conversionDuration}ms.`);
      printFilePath = tempPdfPath;
    }

    // 3. Print the document
    try {
      const colorMode = (job.color_mode || "mono").toLowerCase();
      const isColor = colorMode === "color" || colorMode === "colour";
      
      let installedPrinters = [];
      let defaultSysPrinterName = null;

      if (ptp && process.platform === "win32") {
        try {
          installedPrinters = await getInstalledPrinters();
          const defObj = await ptp.getDefaultPrinter();
          if (defObj && defObj.name) {
            defaultSysPrinterName = defObj.name;
          }
        } catch (err) {
          console.warn("[Agent] Failed to retrieve system printers:", err.message);
        }
      }

      // Build prioritized candidate list based on color mode
      const candidates = [];
      if (isColor) {
        candidates.push({ label: "COLOR_PRINTER_1", configuredName: COLOR_PRINTER_1 });
        candidates.push({ label: "COLOR_PRINTER_2", configuredName: COLOR_PRINTER_2 });
      } else {
        candidates.push({ label: "DEFAULT_PRINTER_1", configuredName: DEFAULT_PRINTER_1 });
        candidates.push({ label: "DEFAULT_PRINTER_2", configuredName: DEFAULT_PRINTER_2 });
      }
      
      // Last fallback is the Windows default printer
      candidates.push({ label: "Windows Default Printer", configuredName: defaultSysPrinterName });

      const resolvedPrintersToTry = [];
      const routingLogs = [];

      for (const cand of candidates) {
        if (!cand.configuredName) {
          routingLogs.push(`${cand.label} is not configured.`);
          continue;
        }
        
        const matchedSys = findInstalledPrinter(cand.configuredName, installedPrinters);
        if (!matchedSys) {
          routingLogs.push(`${cand.label} ("${cand.configuredName}") is not installed on this system.`);
          continue;
        }

        const availability = checkPrinterAvailability(matchedSys);
        if (availability.available) {
          resolvedPrintersToTry.push({
            name: matchedSys.name,
            label: cand.label,
            reason: `Printer is online and ready.`
          });
        } else {
          routingLogs.push(`${cand.label} ("${matchedSys.name}") is offline or unavailable: ${availability.reason}`);
        }
      }

      // If no online candidates were found from priorities, try the default printer as final fallback
      if (resolvedPrintersToTry.length === 0 && defaultSysPrinterName) {
        const matchedDefault = findInstalledPrinter(defaultSysPrinterName, installedPrinters);
        const defaultAvailability = checkPrinterAvailability(matchedDefault);
        
        resolvedPrintersToTry.push({
          name: defaultSysPrinterName,
          label: "Windows Default Printer",
          reason: `Final fallback. Default printer is ${defaultAvailability.available ? "Online" : "Offline (" + defaultAvailability.reason + ")"}`
        });
      }

      // If still empty, fall back to "DEFAULT" spooler
      if (resolvedPrintersToTry.length === 0) {
        resolvedPrintersToTry.push({
          name: defaultSysPrinterName || "DEFAULT",
          label: "Last Resort Spooler",
          reason: "No printers found or default printer couldn't be resolved."
        });
      }

      let printSuccess = false;
      let lastPrintErr = null;

      for (let i = 0; i < resolvedPrintersToTry.length; i++) {
        const target = resolvedPrintersToTry[i];
        const selectedPrinterName = target.name;
        
        const primaryLabel = isColor ? "COLOR_PRINTER_1" : "DEFAULT_PRINTER_1";
        const fallbackUsed = target.label === primaryLabel ? "No" : "Yes";

        // Structured console printout
        console.log("\n==========================================");
        console.log(`Job Number: ${jobNumber}`);
        console.log(`File Name: ${file.file_name}`);
        console.log(`Color Mode: ${colorMode}`);
        console.log(`Paper Size: A4`);
        console.log(`Copies: ${job.copies}`);
        console.log("\nSelected Printer:\n" + selectedPrinterName);
        console.log("\nReason for Selection:\n" + `Routed via candidate ${target.label}. ${target.reason}`);
        console.log("\nFallback Used: " + fallbackUsed);
        console.log("==========================================\n");

        if (routingLogs.length > 0) {
          console.log(`[Agent] Routing history/notes:\n  - ${routingLogs.join("\n  - ")}`);
        }

        const startPrintTime = Date.now();
        try {
          console.log(`[Agent] Sending print command to printer "${selectedPrinterName}"...`);
          
          if (ptp && process.platform === "win32") {
            const printOptions = {
              copies: job.copies,
            };
            if (selectedPrinterName && selectedPrinterName !== "DEFAULT") {
              printOptions.printer = selectedPrinterName;
            }
            await ptp.print(printFilePath, printOptions);
            const printDuration = Date.now() - startPrintTime;
            console.log(`[Agent] OS print response: Success (spooler accepted print command)`);
            console.log(`[Agent] Print duration: ${printDuration}ms`);
          } else {
            // Mock Mode
            console.log(`[Agent] [MOCK MODE] Simulating physical printing on "${selectedPrinterName}"...`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            const printDuration = Date.now() - startPrintTime;
            console.log(`[Agent] OS print response: Success (Mock Print Completed)`);
            console.log(`[Agent] Print duration: ${printDuration}ms`);
          }
          
          printSuccess = true;
          break; // Print completed successfully, exit failover loop!
        } catch (printErr) {
          lastPrintErr = printErr;
          const printDuration = Date.now() - startPrintTime;
          let errorLog = `Failure. Error: ${printErr.message}`;
          if (printErr.stdout) errorLog += `\nStdout: ${printErr.stdout}`;
          if (printErr.stderr) errorLog += `\nStderr: ${printErr.stderr}`;
          
          console.warn(`[Agent] OS print response: ${errorLog}`);
          console.warn(`[Agent] Print job failed on "${selectedPrinterName}" in ${printDuration}ms.`);
          
          if (i < resolvedPrintersToTry.length - 1) {
            console.log(`[Agent] Automatic Failover: Trying next printer...`);
          }
        }
      }

      if (!printSuccess) {
        throw lastPrintErr || new Error("Failed to print using any available printers.");
      }

      // 4. Update status to 'printed'
      await updateJobStatus(jobId, "printed");
      console.log(`[Agent] Job ${jobNumber} marked as successfully printed.`);

    } catch (printErr) {
      let detailedError = `Physical printing failed: ${printErr.message}`;
      if (printErr.stdout) {
        detailedError += `\nStdout: ${printErr.stdout}`;
      }
      if (printErr.stderr) {
        detailedError += `\nStderr: ${printErr.stderr}`;
      }
      console.error(`[Agent] Printing failed on physical device for Job ${jobNumber}:`, detailedError);
      await updateJobStatus(jobId, "failed", detailedError);
    } finally {
      // 5. Clean up local temp files
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log(`[Agent] Cleaned up temporary local file.`);
        } catch (cleanupErr) {
          console.warn(`[Agent] Temp file cleanup warning:`, cleanupErr.message);
        }
      }
      if (tempPdfPath && fs.existsSync(tempPdfPath)) {
        try {
          fs.unlinkSync(tempPdfPath);
          console.log(`[Agent] Cleaned up temporary converted PDF file.`);
        } catch (cleanupErr) {
          console.warn(`[Agent] Temp PDF file cleanup warning:`, cleanupErr.message);
        }
      }
    }

  } catch (error) {
    console.error(`[Agent] Error processing Job ${jobNumber}:`, error.message);
    // Attempt to notify server of failure if we have claimed it
    try {
      await updateJobStatus(jobId, "failed", `Agent process failed: ${error.message}`);
    } catch (statusErr) {
      console.error("[Agent] Could not report claim/download failure to server:", statusErr.message);
    }
  }
}

// Update status endpoint
async function updateJobStatus(jobId, status, errorMessage = "") {
  const updateResponse = await fetch(`${API_BASE_URL}/api/print/agent/update-status`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${AGENT_SECRET_KEY}`,
      "X-Agent-ID": AGENT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      job_id: jobId,
      status,
      error_message: errorMessage,
    }),
  });

  if (!updateResponse.ok) {
    throw new Error(`Failed to update status on server to ${status}: HTTP ${updateResponse.status}`);
  }
}

// Size formatter helper
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Auto detect and log every printer at startup
async function detectPrintersAtStartup() {
  console.log("[Agent] Auto-detecting installed Windows printers...");
  if (process.platform !== "win32") {
    console.log("[Agent] Non-Windows OS. Auto-detection is skipped.");
    return;
  }
  const printers = await getInstalledPrinters();
  if (printers.length === 0) {
    console.log("[Agent] No printers found on this system.");
    return;
  }
  for (const p of printers) {
    const availability = checkPrinterAvailability(p);
    console.log(`[Agent] Printer: "${p.name}"`);
    console.log(`  - Status: ${p.status}`);
    console.log(`  - State: ${p.state}`);
    console.log(`  - WorkOffline: ${p.workOffline}`);
    console.log(`  - ErrorState (DetectedErrorState): ${p.detectedErrorState}`);
    console.log(`  - ExtendedPrinterStatus: ${p.extendedPrinterStatus}`);
    console.log(`  - Result: ${availability.available ? "Online/Ready" : "Offline/Unavailable (" + availability.reason + ")"}`);
  }
}

// Start polling cycle
console.log(`[Agent] Starting polling loop. Polling server every ${POLL_INTERVAL / 1000} seconds...`);
detectPrintersAtStartup().then(() => {
  setInterval(pollJobs, POLL_INTERVAL);
  // Initial run
  pollJobs();
});
