#!/usr/bin/env bash
# Build de producción para nm-frontend-v2.
# Uso: ./deploy/build-production.sh
# Salida: dist/nm-frontend-v2/browser/

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> nm-frontend-v2: build producción"
echo ""

if [[ ! -d node_modules ]]; then
  echo "Instalando dependencias (npm ci)..."
  npm ci
fi

npm run build -- --configuration=production

OUT="dist/nm-frontend-v2/browser"
if [[ ! -f "$OUT/index.html" ]]; then
  if [[ -f "$OUT/index.prod.html" ]]; then
    echo "Renombrando index.prod.html → index.html"
    mv "$OUT/index.prod.html" "$OUT/index.html"
  else
    echo "ERROR: no se encontró $OUT/index.html"
    exit 1
  fi
fi

if grep -q 'http-equiv="Content-Security-Policy"' "$OUT/index.html"; then
  echo "WARN: index.html contiene meta CSP — debería usar index.prod.html (nginx aplica CSP)"
fi

if [[ ! -f "$OUT/legacy-hash-redirect.js" ]]; then
  echo "WARN: falta legacy-hash-redirect.js en el build"
fi

echo ""
echo "OK — artefactos en $OUT"
echo "Deploy ejemplo: rsync -av --delete $OUT/ /var/www/nm-frontend-v2/"
