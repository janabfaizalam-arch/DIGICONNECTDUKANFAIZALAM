<#
  The same hidden start, for a Windows without VBScript.

  VBScript is on its way out of Windows, and a shop that has already removed
  it would otherwise get a startup entry that silently does nothing. This is
  the fallback the shortcut points at in that case.
#>
$ErrorActionPreference = "Stop"

$folder = Split-Path -Parent $PSScriptRoot
$station = Join-Path $folder "station.mjs"
if (-not (Test-Path $station)) { exit 1 }

# Whatever ensure-node.ps1 settled on -- often a node.exe this program
# fetched itself, which is not on PATH.
$pathFile = Join-Path $env:LOCALAPPDATA "DigiConnectPrintStation\node-path.txt"
$node = if (Test-Path $pathFile) { (Get-Content -Path $pathFile -TotalCount 1).Trim() } else { "node" }
if (-not $node) { $node = "node" }

Start-Process -FilePath $node -ArgumentList "`"$station`"" -WorkingDirectory $folder -WindowStyle Hidden
