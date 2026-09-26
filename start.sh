#!/bin/bash
# APTrack-Flow · Tracking Param Audit — Script de inicio (Mac/Linux)

echo ""
echo "  🔗  APTrack-Flow · Tracking Param Audit"
echo "  ─────────────────────────────────"

# Verificar Node.js
if ! command -v node &> /dev/null; then
  echo ""
  echo "  [ERROR] Node.js no está instalado."
  echo "  Instalalo desde: https://nodejs.org (versión LTS)"
  echo ""
  exit 1
fi

NODE_VERSION=$(node -e "process.stdout.write(process.version.replace('v','').split('.')[0])")
if [ "$NODE_VERSION" -lt 18 ]; then
  echo ""
  echo "  [ERROR] Node.js $NODE_VERSION detectado. Se requiere v18 o superior."
  echo "  Actualizá desde: https://nodejs.org"
  echo ""
  exit 1
fi

echo "  Node.js $(node --version) ✓"
echo ""

# Matar cualquier instancia previa en el puerto — Node cachea los módulos
# require() en memoria al arrancar, así que un proceso viejo sigue sirviendo
# código desactualizado aunque los archivos en disco ya se hayan actualizado.
PORT="${PORT:-3300}"
OLD_PIDS=$(lsof -ti tcp:"$PORT" 2>/dev/null)
if [ -n "$OLD_PIDS" ]; then
  echo "  Cerrando instancia(s) anterior(es) en el puerto $PORT (PID: $(echo $OLD_PIDS | tr '\n' ' '))…"
  kill $OLD_PIDS 2>/dev/null
  sleep 1
  # Si algún proceso no murió con SIGTERM, forzar con SIGKILL
  STILL=$(lsof -ti tcp:"$PORT" 2>/dev/null)
  if [ -n "$STILL" ]; then
    kill -9 $STILL 2>/dev/null
    sleep 1
  fi
fi

# Iniciar servidor
node server.js
