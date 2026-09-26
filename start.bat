@echo off
echo.
echo   [Track-Flow] Tracking Param Audit
echo   -------------------------------------------

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo   [ERROR] Node.js no esta instalado.
  echo   Instalalo desde: https://nodejs.org (version LTS^)
  echo.
  pause
  exit /b 1
)

echo   Node.js detectado OK
echo.

node server.js
pause
