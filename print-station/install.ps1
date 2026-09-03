<#
  DigiConnect Print Station — one-line install.

      irm https://www.rnos.in/print-station/install.ps1 | iex

  Downloads the program into the shop owner's own folder, puts a shortcut on
  the desktop, and starts it. Nothing here needs administrator rights: a shop
  computer is often a shared machine whose owner does not have them, and
  asking for them would stop half the installs before they began.
#>

$ErrorActionPreference = "Stop"

# The www matters: the bare domain redirects here, and a cross-origin
# redirect strips the Authorization header the agent needs.
$Base    = if ($env:DCPS_BASE) { $env:DCPS_BASE.TrimEnd('/') } else { "https://www.rnos.in" }
$Target  = Join-Path $env:LOCALAPPDATA "DigiConnectPrintStation\app"
$Files   = @(
  "station.mjs",
  "Start Print Station.bat",
  "Background me chalaiye.bat",
  "Background band kijiye.bat",
  "lib/config.mjs",
  "lib/api.mjs",
  "lib/worker.mjs",
  "lib/printer.mjs",
  "lib/page.mjs",
  "lib/log.mjs",
  "lib/version.mjs",
  "lib/ensure-node.ps1",
  "lib/background.ps1",
  "lib/run-hidden.vbs",
  "lib/run-hidden.ps1"
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

# The printing helper is fetched by the program itself on first run — one
# implementation, so a partner who unzipped the bundle from their dashboard
# gets it too. Nothing to check here.

$shortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "DigiConnect Print Station.lnk"
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($shortcut)
$link.TargetPath       = Join-Path $Target "Start Print Station.bat"
$link.WorkingDirectory = $Target
$link.Description      = "Prints what your customers order at your QR counter"
$link.Save()

Write-Host ""
Write-Host "  Installed. A shortcut is on your desktop." -ForegroundColor Green

# Node is fetched by the launcher itself if this computer does not have it,
# so there is nothing to warn about here any more. Sending a shop owner to
# nodejs.org was where installs used to die.
Write-Host "  Opening the settings page..."
Start-Process (Join-Path $Target "Start Print Station.bat")
