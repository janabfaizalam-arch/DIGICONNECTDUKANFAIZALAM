<#
  Get Node onto this computer without asking the shop to.

  The program is written for Node, and the old answer to a counter PC that
  did not have it was a link to nodejs.org. That is where installs died: the
  installer is an MSI that wants administrator rights the shop assistant does
  not have, the page offers half a dozen buttons, and somebody has to decide
  which one. A shop owner should not have to know what Node is at all.

  So this fetches it: the official Windows ZIP from nodejs.org, which is one
  self-contained node.exe -- no installer, no admin rights, nothing added to
  PATH, nothing else on the machine touched. It lands in the program's own
  AppData folder and is reused forever after, including by every later
  download of the Print Station.

  What is already there wins: a Node installed the normal way is used as-is.

  Writes the chosen node.exe into <AppData>\node-path.txt. The launchers read
  that file rather than parsing this script's output, so progress messages
  can never be mistaken for the answer.
#>
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Windows PowerShell 5.1 still defaults to TLS 1.0 on older builds, and
# nodejs.org refuses that.
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

$appData  = Join-Path $env:LOCALAPPDATA "DigiConnectPrintStation"
$nodeDir  = Join-Path $appData "node"
$nodeExe  = Join-Path $nodeDir "node.exe"
$pathFile = Join-Path $appData "node-path.txt"

function Save-NodePath($exe) {
  New-Item -ItemType Directory -Force -Path $appData | Out-Null
  Set-Content -Path $pathFile -Value $exe -Encoding ASCII
}

# 1. Installed the normal way? Use it and change nothing.
$installed = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if ($installed) {
  Save-NodePath $installed.Source
  exit 0
}

# 2. Fetched here on an earlier run?
if (Test-Path $nodeExe) {
  Save-NodePath $nodeExe
  exit 0
}

Write-Host ""
Write-Host "  Node.js is computer par nahi hai. Khud download kar raha hoon." -ForegroundColor Cyan
Write-Host "  (~35 MB, sirf ek baar. Na installer, na admin password.)"
Write-Host ""

$arch =
  if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64" -or $env:PROCESSOR_ARCHITEW6432 -eq "ARM64") { "arm64" }
  elseif ([Environment]::Is64BitOperatingSystem) { "x64" }
  else { "x86" }

$temp = Join-Path $env:TEMP ("dcps-node-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $temp | Out-Null

try {
  # The version is asked for, never guessed. A hardcoded number goes stale and
  # then 404s on a counter PC, which is the worst place to find out.
  $index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -UseBasicParsing
  $release = $index | Where-Object { $_.lts -and $_.files -contains "win-$arch-zip" } | Select-Object -First 1
  if (-not $release) { throw "nodejs.org has no LTS build for win-$arch." }

  $name = "node-$($release.version)-win-$arch"
  $zip  = Join-Path $temp "$name.zip"

  Write-Host "  ... $($release.version) ($arch)"
  Invoke-WebRequest -Uri "https://nodejs.org/dist/$($release.version)/$name.zip" -OutFile $zip -UseBasicParsing

  <#
    Check what came down before running it.

    This is a program binary arriving over a shop's network, often through
    somebody else's wifi and whatever box is between. The published checksum
    costs one small request and turns a silent corruption -- or a swapped
    file -- into a clear refusal.
  #>
  Write-Host "  ... checking the download"
  $sums = (Invoke-WebRequest -Uri "https://nodejs.org/dist/$($release.version)/SHASUMS256.txt" -UseBasicParsing).Content
  $line = ($sums -split "`n" | Where-Object { $_ -match [regex]::Escape("$name.zip") } | Select-Object -First 1)
  if (-not $line) { throw "nodejs.org did not publish a checksum for $name.zip." }
  $expected = ($line -split '\s+')[0].Trim().ToLower()
  $actual = (Get-FileHash -Path $zip -Algorithm SHA256).Hash.ToLower()
  if ($expected -ne $actual) { throw "The downloaded Node.js does not match its published checksum." }

  Expand-Archive -Path $zip -DestinationPath $temp -Force
  $found = Join-Path $temp "$name\node.exe"
  if (-not (Test-Path $found)) { throw "node.exe was not inside the download." }

  New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
  Copy-Item -Path $found -Destination $nodeExe -Force

  Save-NodePath $nodeExe
  Write-Host ""
  Write-Host "  Node.js taiyar hai. Ab kuch install nahi karna." -ForegroundColor Green
  Write-Host ""
  exit 0
} catch {
  Write-Host ""
  Write-Host "  Node.js download nahi ho paya." -ForegroundColor Yellow
  Write-Host "  $($_.Exception.Message)"
  Write-Host ""
  Write-Host "  Aksar iski wajah dukaan ka internet ya firewall hota hai."
  Write-Host "  Ek baar https://nodejs.org/en/download browser me kholkar dekhiye -"
  Write-Host "  na khule to network hi rok raha hai."
  Write-Host ""
  exit 1
} finally {
  Remove-Item -Path $temp -Recurse -Force -ErrorAction SilentlyContinue
}
