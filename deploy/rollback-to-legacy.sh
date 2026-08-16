#!/usr/bin/env bash
# Rollback rápido a legacy (< 15 min) — guía 08.
#
# Cuándo: login roto, POS no vende, CORS masivo, 5xx en todas las rutas.
#
# Uso:
#   LEGACY_BACKUP=/backups/nm-frontend-20260815/browser \
#   DEPLOY_TARGET=/var/www/nm-frontend \
#   BASE_URL=https://adm.novedadesmaritex.net.pe \
#   ./deploy/rollback-to-legacy.sh
#
# Variables:
#   LEGACY_BACKUP   — carpeta browser/ del backup (requerido)
#   DEPLOY_TARGET   — directorio web activo (requerido)
#   NGINX_BACKUP    — opcional: nginx-nm-frontend.conf del backup
#   BASE_URL        — smoke HTTP post-rollback
#   SKIP_NGINX      — 1 para omitir nginx reload
#   DRY_RUN         — 1 para solo mostrar comandos

set -euo pipefail

cd "$(dirname "$0")/.."

LEGACY_BACKUP="${LEGACY_BACKUP:-}"
DEPLOY_TARGET="${DEPLOY_TARGET:-}"
NGINX_BACKUP="${NGINX_BACKUP:-}"
BASE_URL="${BASE_URL:-}"
SKIP_NGINX="${SKIP_NGINX:-0}"
DRY_RUN="${DRY_RUN:-0}"

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

echo "==> ROLLBACK a nm-frontend legacy"
echo ""

if [[ -z "$LEGACY_BACKUP" || -z "$DEPLOY_TARGET" ]]; then
  echo "ERROR: define LEGACY_BACKUP y DEPLOY_TARGET"
  echo ""
  echo "Ejemplo:"
  echo "  LEGACY_BACKUP=/backups/nm-frontend-20260815/browser \\"
  echo "  DEPLOY_TARGET=/var/www/nm-frontend \\"
  echo "  NGINX_BACKUP=/backups/nm-frontend-20260815/nginx-nm-frontend.conf \\"
  echo "  BASE_URL=https://adm.novedadesmaritex.net.pe \\"
  echo "  $0"
  exit 1
fi

if [[ ! -f "$LEGACY_BACKUP/index.html" ]]; then
  echo "ERROR: no hay index.html en $LEGACY_BACKUP"
  exit 1
fi

echo "Restaurando build legacy..."
echo "  Desde: $LEGACY_BACKUP"
echo "  Hacia: $DEPLOY_TARGET"
run rsync -av --delete "${LEGACY_BACKUP%/}/" "${DEPLOY_TARGET%/}/"

if [[ -n "$NGINX_BACKUP" && -f "$NGINX_BACKUP" ]]; then
  echo ""
  echo "Restaurando nginx desde $NGINX_BACKUP"
  run sudo cp "$NGINX_BACKUP" /etc/nginx/sites-available/nm-frontend
elif [[ -n "$NGINX_BACKUP" ]]; then
  echo "WARN: NGINX_BACKUP no encontrado — restaurar nginx manualmente"
fi

if [[ "$SKIP_NGINX" != "1" ]] && command -v nginx >/dev/null 2>&1; then
  run sudo nginx -t
  run sudo systemctl reload nginx
  echo "nginx recargado"
fi

if [[ -n "$BASE_URL" ]]; then
  echo ""
  echo "==> Smoke legacy (HTTP)"
  BASE_URL="${BASE_URL%/}"
  check() {
    local path="$1"
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")
    if [[ "$code" == "200" ]]; then
      echo "  OK $code  $path"
    else
      echo "  FAIL $code  $path"
      return 1
    fi
  }
  failed=0
  check "/" || failed=1
  check "/index.html" || failed=1
  if [[ "$failed" -ne 0 ]]; then
    echo "Smoke legacy con fallos — verificar manualmente login y POS"
    exit 1
  fi
  echo "Smoke HTTP OK — verificar login y POS en navegador"
fi

echo ""
echo "Rollback completado."
echo "  1. Verificar https://.../#/ (legacy hash routing)"
echo "  2. Login + POS"
echo "  3. Comunicar al equipo y documentar causa raíz"
echo "  4. Si revertiste CORS/Sanctum en backend: php artisan config:cache"
