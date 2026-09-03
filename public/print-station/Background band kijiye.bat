@echo off
title DigiConnect Print Station - background band kijiye
cd /d "%~dp0"

REM  Stops the hidden copy and takes it out of Windows startup. Printing then
REM  happens only while "Start Print Station" is open, as it did before.

if not exist "%~dp0station.mjs" goto :nofolder

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0lib\background.ps1" -Remove
pause
exit /b 0

:nofolder
echo.
echo   Ye file akele nahi chalti. Poori zip Extract kijiye aur folder ke
echo   ANDAR se chalaiye.
echo.
pause
exit /b 1
