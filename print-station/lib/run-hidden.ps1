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

Start-Process -FilePath "node" -ArgumentList "`"$station`"" -WorkingDirectory $folder -WindowStyle Hidden
