@echo off
setlocal
cd /d "%~dp0"
echo Mira Setup 0.1.0 (Windows x64)
echo.
if not exist "Mira-Setup-0.1.0-win-x64.exe" (
  echo ERROR: Mira-Setup-0.1.0-win-x64.exe not found in this folder.
  pause
  exit /b 1
)
start "" "Mira-Setup-0.1.0-win-x64.exe"
endlocal
