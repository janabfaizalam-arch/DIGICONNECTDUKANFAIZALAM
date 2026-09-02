<#
  DigiConnect Print Station — one-line install.

      irm https://rnos.in/print-station/install.ps1 | iex

  Downloads the program into the shop owner's own folder, puts a shortcut on
  the desktop, and starts it. Nothing here needs administrator rights: a shop
  computer is often a shared machine whose owner does not have them, and
  asking for them would stop half the installs before they began.
#>

$ErrorActionPreference = "Stop"

$Base    = if ($env:DCPS_BASE) { $env:DCPS_BASE.TrimEnd('/') } else { "https://rnos.in" }
$Target  = Join-Path $env:LOCALAPPDATA "DigiConnectPrintStation\app"
$Files   = @(
  "station.mjs",
  "Start Print Station.bat",
  "lib/config.mjs",
  "lib/api.mjs",
  "lib/worker.mjs",
  "lib/printer.mjs",
  "lib/page.mjs",
  "lib/log.mjs"
)

Write-Host ""
Write-Host "  DigiConnect Print Station" -ForegroundColor Cyan
Write-Host "  Installing to $Target"
Write-Host ""

New-Item -ItemType Directory -Force -Path (Join-Path $Target "lib") | Out-Null

foreach ($file in $Files) {
  $url  = "$Base/print-station/$([uri]::EscapeDataString($file) -replace '%2F','/')"
  $dest = Join-Path $Target ($file -replace '/', '\')
  Write-Host "  ... $file"
  Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
}

# SumatraPDF is what lets a print run without a window opening and a human
# clicking Print. Without it Windows can still print, but not copies or paper
# size — so the absence is worth naming here rather than discovering later.
$sumatra = @(
  "C:\Program Files\SumatraPDF\SumatraPDF.exe",
  "C:\Program Files (x86)\SumatraPDF\SumatraPDF.exe",
  "$env:LOCALAPPDATA\SumatraPDF\SumatraPDF.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

$shortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "DigiConnect Print Station.lnk"
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($shortcut)
$link.TargetPath       = Join-Path $Target "Start Print Station.bat"
$link.WorkingDirectory = $Target
$link.Description      = "Prints what your customers order at your QR counter"
$link.Save()

Write-Host ""
Write-Host "  Installed. A shortcut is on your desktop." -ForegroundColor Green
if (-not $sumatra) {
  Write-Host ""
  Write-Host "  Recommended: install SumatraPDF (free, 2 MB) from" -ForegroundColor Yellow
  Write-Host "  https://www.sumatrapdfreader.org/download-free-pdf-viewer" -ForegroundColor Yellow
  Write-Host "  Without it, copies and paper size cannot be set automatically."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "  Node.js is not installed yet. Get the LTS build from" -ForegroundColor Yellow
  Write-Host "  https://nodejs.org/en/download and then open the desktop shortcut." -ForegroundColor Yellow
  exit
}

Write-Host "  Opening the settings page..."
Start-Process (Join-Path $Target "Start Print Station.bat")
