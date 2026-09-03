@echo off
title DigiConnect Print Station
cd /d "%~dp0"

REM  The shop owner double-clicks this file. Nothing else.
REM
REM  Ye file akeli kaam nahi karti.
REM
REM  A shop opened the zip in Explorer, dragged this one file onto the
REM  Desktop, and ran it. Node then looked for station.mjs next to it, found
REM  nothing, and printed a module-not-found stack trace with a path in it --
REM  which reads like the program is broken rather than in the wrong place.
REM  It printed fine the day before, from inside the extracted folder.

if not exist "%~dp0station.mjs" goto :nofolder

REM  Node is the only thing this program needs, and a counter PC usually does
REM  not have it. Sending the shop to nodejs.org was where installs died: an
REM  MSI that wants admin rights, on a page with six buttons. This fetches it
REM  instead -- once, into our own folder, no installer, no admin.

call powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0lib\ensure-node.ps1"

set "DCPS_NODE_FILE=%LOCALAPPDATA%\DigiConnectPrintStation\node-path.txt"
if not exist "%DCPS_NODE_FILE%" goto :nonode
set "NODE="
set /p NODE=<"%DCPS_NODE_FILE%"
if not defined NODE goto :nonode
if not exist "%NODE%" goto :nonode

echo.
echo   Starting DigiConnect Print Station...
echo   Leave this window open, or use "Background me chalaiye" once.
echo.

"%NODE%" "%~dp0station.mjs"

REM  If the program stops, the window stays so the reason can be read.
echo.
echo   Print Station has stopped.
pause
exit /b 0

:nonode
echo.
echo   Node.js taiyar nahi ho paya, isliye program shuru nahi kar sakta.
echo   Uparwala message padhiye - usme wajah likhi hai.
echo.
pause
exit /b 1

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
