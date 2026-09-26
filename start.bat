@echo off
echo.
echo   [APTrack-Flow] Tracking Param Audit
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

:: Matar cualquier instancia previa en el puerto 3300 — Node cachea los
:: modulos require() en memoria al arrancar, asi que un proceso viejo sigue
:: sirviendo codigo desactualizado aunque los archivos ya se hayan actualizado.
for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":3300" ^| findstr "LISTENING"') do (
  echo   Cerrando instancia anterior en el puerto 3300 (PID %%P^)...
  taskkill /F /PID %%P >nul 2>&1
)

node server.js
pause
