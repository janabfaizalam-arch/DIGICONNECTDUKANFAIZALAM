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
const DEFAULT_PRINTER = process.env.DEFAULT_PRINTER || null;
const COLOR_PRINTER = process.env.COLOR_PRINTER || null;
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

// Get printer status map from Windows via WMI/CIM
async function getPrinterStatusMap() {
  const statusMap = new Map();
  if (process.platform !== "win32") {
    return statusMap;
  }
  try {
    const cmd = `powershell -Command "Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, WorkOffline | ConvertTo-Json"`;
    const { stdout } = await execAsync(cmd);
    if (!stdout || !stdout.trim()) return statusMap;
    
    let printers;
    try {
      printers = JSON.parse(stdout);
    } catch (parseErr) {
      console.warn("[Agent] Failed to parse printer status JSON:", parseErr.message);
      return statusMap;
    }
    
    const printersList = Array.isArray(printers) ? printers : [printers];
    for (const printer of printersList) {
      if (printer && printer.Name) {
        // PrinterStatus: 7 is Offline.
        // WorkOffline: true means offline.
        const isOffline = printer.WorkOffline === true || printer.PrinterStatus === 7;
        statusMap.set(printer.Name.toLowerCase(), {
          name: printer.Name,
          isOffline,
          printerStatus: printer.PrinterStatus,
          workOffline: printer.WorkOffline
        });
      }
    }
  } catch (err) {
    console.warn("[Agent] Failed to retrieve printer status map:", err.message);
  }
  return statusMap;
}

// Helper to find exact printer name from system printers
function findSystemPrinter(configuredName, systemPrinters) {
  if (!configuredName) return null;
  const lowerConfig = configuredName.toLowerCase();
  
  // 1. Exact case-insensitive match
  let matched = systemPrinters.find(name => name.toLowerCase() === lowerConfig);
  // 2. Substring match if not found
  if (!matched) {
    matched = systemPrinters.find(name => name.toLowerCase().includes(lowerConfig));
  }
  return matched || null;
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
      let selectedPrinter = null;
      let fallbackLog = [];

      let systemPrinterNames = [];
      let printerStatusMap = new Map();

      if (ptp && process.platform === "win32") {
        try {
          const printers = await ptp.getPrinters();
          systemPrinterNames = printers.map((p) => p.name);
          printerStatusMap = await getPrinterStatusMap();
        } catch (err) {
          console.warn("[Agent] Failed to retrieve system printers:", err.message);
        }
      }

      function isPrinterOnline(systemName) {
        if (!systemName) return false;
        const status = printerStatusMap.get(systemName.toLowerCase());
        if (status) {
          return !status.isOffline;
        }
        return true; // default to online if status is missing but printer is in installed list
      }

      if (colorMode === "color") {
        // 1. Try COLOR_PRINTER
        const colorSysName = findSystemPrinter(COLOR_PRINTER, systemPrinterNames);
        if (colorSysName) {
          if (isPrinterOnline(colorSysName)) {
            selectedPrinter = colorSysName;
          } else {
            fallbackLog.push(`COLOR_PRINTER ("${COLOR_PRINTER}" matched to "${colorSysName}") is offline/unavailable.`);
          }
        } else {
          fallbackLog.push(`COLOR_PRINTER ("${COLOR_PRINTER || "Not Configured"}") was not found in the system.`);
        }

        // 2. Fallback to NETWORK_COLOR_PRINTER
        if (!selectedPrinter) {
          const netColorSysName = findSystemPrinter(NETWORK_COLOR_PRINTER, systemPrinterNames);
          if (netColorSysName) {
            if (isPrinterOnline(netColorSysName)) {
              selectedPrinter = netColorSysName;
            } else {
              fallbackLog.push(`NETWORK_COLOR_PRINTER ("${NETWORK_COLOR_PRINTER}" matched to "${netColorSysName}") is offline/unavailable.`);
            }
          } else {
            fallbackLog.push(`NETWORK_COLOR_PRINTER ("${NETWORK_COLOR_PRINTER || "Not Configured"}") was not found in the system.`);
          }
        }

        // 3. Fallback to Windows default printer
        if (!selectedPrinter) {
          try {
            const defaultPrinterObj = await ptp.getDefaultPrinter();
            if (defaultPrinterObj && defaultPrinterObj.name) {
              selectedPrinter = defaultPrinterObj.name;
              fallbackLog.push(`Falling back to Windows default printer: "${selectedPrinter}".`);
            }
          } catch (err) {
            fallbackLog.push(`Failed to get Windows default printer: ${err.message}`);
          }
        }
      } else {
        // Mono mode: Try DEFAULT_PRINTER
        const monoSysName = findSystemPrinter(DEFAULT_PRINTER, systemPrinterNames);
        if (monoSysName) {
          if (isPrinterOnline(monoSysName)) {
            selectedPrinter = monoSysName;
          } else {
            fallbackLog.push(`DEFAULT_PRINTER ("${DEFAULT_PRINTER}" matched to "${monoSysName}") is offline/unavailable.`);
          }
        } else {
          fallbackLog.push(`DEFAULT_PRINTER ("${DEFAULT_PRINTER || "Not Configured"}") was not found in the system.`);
        }

        // Fallback to Windows default printer
        if (!selectedPrinter) {
          try {
            const defaultPrinterObj = await ptp.getDefaultPrinter();
            if (defaultPrinterObj && defaultPrinterObj.name) {
              selectedPrinter = defaultPrinterObj.name;
              fallbackLog.push(`Falling back to Windows default printer: "${selectedPrinter}".`);
            }
          } catch (err) {
            fallbackLog.push(`Failed to get Windows default printer: ${err.message}`);
          }
        }
      }

      if (fallbackLog.length > 0) {
        console.log(`[Agent] Routing notes for ${colorMode} job:\n  - ${fallbackLog.join("\n  - ")}`);
      }
      console.log(`[Agent] Selected printer for job: "${selectedPrinter || "DEFAULT"}"`);

      let printSuccess = false;
      let printAttempt = 1;
      const maxPrintAttempts = 2;
      let lastPrintErr = null;
      let printDuration = 0;
      let osResponseLog = "";

      while (printAttempt <= maxPrintAttempts && !printSuccess) {
        const startPrintTime = Date.now();
        try {
          if (printAttempt > 1) {
            console.log(`[Agent] Retrying print job (Attempt ${printAttempt}/${maxPrintAttempts})...`);
          }
          console.log(`[Agent] Sending print command to printer "${selectedPrinter || "DEFAULT"}" with ${job.copies} copy(ies)...`);

          if (ptp && process.platform === "win32") {
            const printOptions = {
              copies: job.copies,
            };
            if (selectedPrinter) {
              printOptions.printer = selectedPrinter;
            }
            await ptp.print(printFilePath, printOptions);
            printDuration = Date.now() - startPrintTime;
            osResponseLog = "Success (spooler accepted print command)";
            console.log(`[Agent] OS print response: ${osResponseLog}`);
          } else {
            // Mock Mode
            console.log(`[Agent] [MOCK MODE] Simulating physical printing...`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            printDuration = Date.now() - startPrintTime;
            osResponseLog = "Success (Mock Print Completed)";
            console.log(`[Agent] OS print response: ${osResponseLog}`);
          }
          printSuccess = true;
          console.log(`[Agent] Print duration: ${printDuration}ms`);
        } catch (printErr) {
          lastPrintErr = printErr;
          printDuration = Date.now() - startPrintTime;
          osResponseLog = `Failure (Attempt ${printAttempt}/${maxPrintAttempts}). Error: ${printErr.message}`;
          if (printErr.stdout) osResponseLog += `\nStdout: ${printErr.stdout}`;
          if (printErr.stderr) osResponseLog += `\nStderr: ${printErr.stderr}`;
          
          console.warn(`[Agent] OS print response: ${osResponseLog}`);
          console.warn(`[Agent] Print attempt ${printAttempt} failed in ${printDuration}ms.`);
          printAttempt++;
        }
      }

      if (!printSuccess) {
        throw lastPrintErr;
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

// Start polling cycle
console.log(`[Agent] Starting polling loop. Polling server every ${POLL_INTERVAL / 1000} seconds...`);
setInterval(pollJobs, POLL_INTERVAL);
// Initial run
pollJobs();
