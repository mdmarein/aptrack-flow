#!/bin/bash
# Track-Flow · Tracking Param Audit — Script de inicio (Mac/Linux)

echo ""
echo "  🔗  Track-Flow · Tracking Param Audit"
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

# Iniciar servidor
node server.js
