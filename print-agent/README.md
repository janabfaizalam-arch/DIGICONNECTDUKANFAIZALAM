# DigiConnect Dukan — Windows Local Print Agent

This print agent runs on the shop's local Windows PC. It polls the server for paid print jobs, claims them, downloads the document securely, and prints them silently using the system's physical printers.

## Prerequisites

1. **Node.js**: Ensure Node.js (version 18 or higher) is installed on the computer.
2. **Physical Printer**: Ensure your printer is connected, turned on, and configured as the default printer in Windows (or remember its exact name to target it).

## Setup Instructions

1. **Install Dependencies**:
   Open a terminal/command prompt inside this folder and run:
   ```bash
   npm install
   ```

2. **Configuration**:
   Copy `.env.example` to a new file named `.env`:
   ```bash
   copy .env.example .env
   ```
   Open the `.env` file in a text editor and fill in your settings:
   - `API_BASE_URL`: The URL of your deployed website (e.g. `https://yourdomain.com` or `http://localhost:3000` during development).
   - `AGENT_SECRET_KEY`: The secret key matching the `PRINT_AGENT_SECRET_KEY` on your server.
   - `AGENT_ID`: A unique name representing this computer (e.g. `main-counter-pc`).
   - `DEFAULT_PRINTER_1`: The exact name of your primary black & white printer.
   - `DEFAULT_PRINTER_2`: The exact name of your secondary fallback black & white printer.
   - `COLOR_PRINTER_1`: The exact name of your primary color printer.
   - `COLOR_PRINTER_2`: The exact name of your secondary fallback color printer.

3. **Start the Agent**:
   Run the following command to start polling:
   ```bash
   npm start
   ```

## Key Behaviors

- **Startup Auto-Detection & Printer Health Validation**: The agent scans all installed Windows printers on startup, checking their existence, status (online/ready), paused state, and WMI error codes. Any unavailable or offline printers are logged.
- **Intelligent Color/Mono Routing**: The agent reads the job's `color_mode` and routes `mono`/`black`/`bw` jobs to the black & white printer pool and `color`/`colour` jobs to the color printer pool.
- **Automatic failover**: If a preferred printer is offline, paused, or encounters a printing error at spool time, the agent automatically attempts printing to the fallback candidate in priority order (Primary -> Secondary -> Windows Default Printer) without requiring user intervention.
- **Secure File Retrieval**: It never stores public URLs on the server. The agent gets a temporary, signed download link that expires in 5 minutes.
- **Fail-safe Print Recovery**: If all failover targets fail, the agent logs the error to the database and marks the job status as `failed` so the admin is notified.
- **Automatic Cleanup**: Files downloaded to the local `temp` folder (and any temporary converted A4 PDFs) are deleted immediately after printing is spool-completed or fails.
