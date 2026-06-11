import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import dotenv from "dotenv";

// Load configuration
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const AGENT_SECRET_KEY = process.env.AGENT_SECRET_KEY;
const AGENT_ID = process.env.AGENT_ID || "shop-front-pc";
const TARGET_PRINTER = process.env.PRINTER_NAME || null;
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

    // 3. Print the document
    try {
      console.log(`[Agent] Printing file to printer: "${TARGET_PRINTER || "DEFAULT"}" with ${job.copies} copy(ies)...`);
      
      if (ptp && process.platform === "win32") {
        const printOptions = {
          copies: job.copies,
        };
        if (TARGET_PRINTER) {
          printOptions.printer = TARGET_PRINTER;
        }
        await ptp.print(tempFilePath, printOptions);
        console.log(`[Agent] Physical print job completed by OS print spooler.`);
      } else {
        // Mock Printing (Simulates printer hardware delay)
        console.log(`[Agent] [MOCK MODE] Simulating physical printing for ${job.copies} copy(ies) of ${file.file_name}...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        console.log(`[Agent] [MOCK MODE] Simulating physical print job complete.`);
      }

      // 4. Update status to 'printed'
      await updateJobStatus(jobId, "printed");
      console.log(`[Agent] Job ${jobNumber} marked as successfully printed.`);

    } catch (printErr) {
      console.error(`[Agent] Printing failed on physical device for Job ${jobNumber}:`, printErr.message);
      await updateJobStatus(jobId, "failed", `Physical printing failed: ${printErr.message}`);
    } finally {
      // 5. Clean up local temp file
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log(`[Agent] Cleaned up temporary local file.`);
        } catch (cleanupErr) {
          console.warn(`[Agent] Temp file cleanup warning:`, cleanupErr.message);
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
