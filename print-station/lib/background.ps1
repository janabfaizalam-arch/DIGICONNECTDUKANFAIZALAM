<#
  Printing that survives the window being closed.

  The counter PC's black window was doing two jobs: running the program, and
  reminding the shop it was running. It did the second badly and the first
  fatally -- one accidental X, or one "clean up the desktop" at closing time,
  and the next customer paid for pages that never came out. Nobody at a busy
  shop should have to guard a console window.

  So the program is started with no window, and again every time the computer
  is switched on. Nothing here needs administrator rights: it writes one
  shortcut into the user's own Startup folder, which is why it works on a
  shared shop machine whose owner is not an admin.

      powershell -ExecutionPolicy Bypass -File lib\background.ps1
      powershell -ExecutionPolicy Bypass -File lib\background.ps1 -Remove
#>
param([switch]$Remove)

$ErrorActionPreference = "Stop"

$folder  = Split-Path -Parent $PSScriptRoot
$startup = [Environment]::GetFolderPath("Startup")
$link    = Join-Path $startup "DigiConnect Print Station.lnk"
$vbs     = Join-Path $folder "lib\run-hidden.vbs"
$ps1     = Join-Path $folder "lib\run-hidden.ps1"
$wscript = Join-Path $env:WINDIR "System32\wscript.exe"
$port    = if ($env:DCPS_PORT) { $env:DCPS_PORT } else { "7171" }

<#
  Stop whichever copy is already running.

  Matched on the command line rather than on "node.exe" alone, because a
  counter PC may be running somebody else's Node program and killing that
  would be a worse bug than the one being fixed here.
#>
function Stop-Station {
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -like "*station.mjs*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Test-Station {
  foreach ($attempt in 1..12) {
    Start-Sleep -Seconds 1
    try {
      return Invoke-RestMethod -Uri "http://localhost:$port/api/state" -TimeoutSec 2
    } catch {
      # Not up yet. Node takes a moment, and listing printers takes longer.
    }
  }
  return $null
}

if (-not (Test-Path (Join-Path $folder "station.mjs"))) {
  Write-Host ""
  Write-Host "  station.mjs nahi mili. Poori zip Extract kijiye aur folder ke" -ForegroundColor Yellow
  Write-Host "  ANDAR se ye file chalaiye." -ForegroundColor Yellow
  Write-Host ""
  exit 1
}

if ($Remove) {
  if (Test-Path $link) { Remove-Item $link -Force }
  Stop-Station
  Write-Host ""
  Write-Host "  Background printing band kar di." -ForegroundColor Yellow
  Write-Host "  Ab print tabhi hoga jab aap khud 'Start Print Station' chalayenge."
  Write-Host ""
  exit 0
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "  Pehle Node.js install kijiye: https://nodejs.org/en/download" -ForegroundColor Yellow
  Write-Host "  ('LTS' wala button.) Uske baad ye file dobara chalaiye."
  Write-Host ""
  exit 1
}

$useVbs = Test-Path $wscript

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($link)
if ($useVbs) {
  $shortcut.TargetPath = $wscript
  $shortcut.Arguments  = "`"$vbs`""
} else {
  $shortcut.TargetPath = "powershell.exe"
  $shortcut.Arguments  = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ps1`""
}
$shortcut.WorkingDirectory = $folder
$shortcut.Description = "Prints what your customers order at your QR counter"
$shortcut.Save()

# Start it now, so the shop does not have to restart the computer to see this
# work. Any copy started from the black window is stopped first, or the new
# one would find the port taken and quit straight away.
Stop-Station
Start-Sleep -Seconds 1
if ($useVbs) {
  Start-Process -FilePath $wscript -ArgumentList "`"$vbs`"" -WindowStyle Hidden
} else {
  Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-WindowStyle","Hidden","-File","`"$ps1`"" -WindowStyle Hidden
}

$state = Test-Station

Write-Host ""
if ($state) {
  Write-Host "  Ho gaya. Print Station ab background me chal raha hai." -ForegroundColor Green
  Write-Host ""
  Write-Host "  * Koi window khuli rakhne ki zaroorat nahi."
  Write-Host "  * Computer on hote hi khud chalu ho jayega."
  if ($state.config -and $state.config.printerName) {
    Write-Host "  * Printer: $($state.config.printerName)"
  }
  Write-Host "  * Haal dekhna ho to: http://localhost:$port"
  Write-Host "  * Band karna ho to 'Background band kijiye' par double-click."
  Write-Host ""
  # The startup shortcut points at this folder. A newer download lands in a
  # new folder with a new key, and the old hidden copy would keep starting
  # with the retired one -- silently, now that there is no window to see it.
  Write-Host "  Jab bhi naya version download karen, us naye folder se ye file"
  Write-Host "  dobara chalaiye - warna purana folder hi chalta rahega."
} else {
  Write-Host "  Startup me daal diya, lekin chalu hua ya nahi ye pakka nahi." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  http://localhost:$port kholkar dekhiye. Page na khule to ek baar"
  Write-Host "  'Start Print Station' se chalaiye - wahan galti likhi hui milegi."
}
Write-Host ""
