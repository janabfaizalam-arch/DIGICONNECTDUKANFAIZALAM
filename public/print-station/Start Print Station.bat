@echo off
title DigiConnect Print Station
cd /d "%~dp0"

REM  The shop owner double-clicks this file. Nothing else.
REM
REM  Node is the only thing this program needs, and a counter PC usually does
REM  not have it. Rather than failing with "node is not recognised", which
REM  tells a shop owner nothing -- this checks first and sends them to the one
REM  page that fixes it.

REM  Ye file akeli kaam nahi karti.
REM
REM  A shop opened the zip in Explorer, dragged this one file onto the
REM  Desktop, and ran it. Node then looked for station.mjs next to it, found
REM  nothing, and printed a module-not-found stack trace with a path in it --
REM  which reads like the program is broken rather than in the wrong place.
REM  It printed fine the day before, from inside the extracted folder.

if not exist "%~dp0station.mjs" goto :nofolder

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
exit /b 0

:nofolder
echo.
echo   Ye file akele nahi chalti.
echo.
echo   Lagta hai "Start Print Station" ko zip se nikal kar alag rakh diya gaya
echo   hai. Iske saath station.mjs aur lib folder bhi hone chahiye.
echo.
echo   Kya kariye:
echo     1. Downloads me DigiConnect-Print-Station...zip par right-click
echo     2. "Extract All" -^> Extract
echo     3. Jo folder bane, uske ANDAR jaiye
echo     4. Wahin se "Start Print Station" par double-click
echo.
echo   Abhi ye yahan se chalane ki koshish hui:
echo   %~dp0
echo.
pause
exit /b 1
