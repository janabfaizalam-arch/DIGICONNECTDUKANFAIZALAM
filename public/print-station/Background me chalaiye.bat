@echo off
title DigiConnect Print Station - background me chalaiye
cd /d "%~dp0"

REM  Double-click this once, and the black window is never needed again.
REM
REM  The program keeps running with no window, and starts by itself every
REM  time the computer is switched on. Undo it with "Background band kijiye".

if not exist "%~dp0station.mjs" goto :nofolder

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0lib\background.ps1"
pause
exit /b 0

:nofolder
echo.
echo   Ye file akele nahi chalti.
echo.
echo   Poori zip ko "Extract All" kijiye, aur jo folder bane uske ANDAR se
echo   ye file chalaiye - station.mjs aur lib isi ke saath hone chahiye.
echo.
echo   Abhi ye yahan se chalane ki koshish hui:
echo   %~dp0
echo.
pause
exit /b 1
