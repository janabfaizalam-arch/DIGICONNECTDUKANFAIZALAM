@echo off
title DigiConnect Print Station
cd /d "%~dp0"

REM  The shop owner double-clicks this file. Nothing else.
REM
REM  Node is the only thing this program needs, and a counter PC usually does
REM  not have it. Rather than failing with "node is not recognised" — which
REM  tells a shop owner nothing — this checks first and sends them to the one
REM  page that fixes it.

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   DigiConnect Print Station needs Node.js, which is not installed yet.
  echo.
  echo   Opening the download page. Install it, then run this file again.
  echo   Choose the "LTS" button and click Next until it finishes.
  echo.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)

echo.
echo   Starting DigiConnect Print Station...
echo   Leave this window open. Closing it stops printing.
echo.

node "%~dp0station.mjs"

REM  If the program stops, the window stays so the reason can be read.
echo.
echo   Print Station has stopped.
pause
