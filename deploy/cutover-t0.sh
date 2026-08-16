#!/usr/bin/env bash
# Playbook T-0 — publicar v2 en servidor (ejecutar EN el servidor o vía SSH).
#
# Uso:
#   DEPLOY_TARGET=/var/www/nm-frontend-v2 ./deploy/cutover-t0.sh
#   BASE_URL=https://adm.novedadesmaritex.net.pe ./deploy/cutover-t0.sh
#
# Variables:
#   DEPLOY_TARGET   — directorio destino en el servidor (requerido en prod)
#   BASE_URL        — URL pública para smoke post-deploy
#   SKIP_NGINX      — 1 para omitir nginx -t && reload
#   DRY_RUN         — 1 para solo mostrar comandos

set -euo pipefail

cd "$(dirname "$0")/.."

DEPLOY_TARGET="${DEPLOY_TARGET:-}"
BASE_URL="${BASE_URL:-}"
SKIP_NGINX="${SKIP_NGINX:-0}"
DRY_RUN="${DRY_RUN:-0}"

OUT="dist/nm-frontend-v2/browser"

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

echo "==> Cutover T-0 — nm-frontend-v2"
echo ""

if [[ ! -f "$OUT/index.html" ]]; then
  echo "ERROR: no hay build en $OUT — ejecuta ./deploy/build-production.sh primero"
  exit 1
fi

if grep -q 'http-equiv="Content-Security-Policy"' "$OUT/index.html"; then
  echo "WARN: index.html tiene meta CSP — nginx debe aplicar CSP en prod"
fi

if [[ -z "$DEPLOY_TARGET" ]]; then
  echo "DEPLOY_TARGET no definido — modo local (solo smoke si BASE_URL está definida)"
else
  echo "Destino: $DEPLOY_TARGET"
  run rsync -av --delete "$OUT/" "${DEPLOY_TARGET%/}/"
fi

if [[ "$SKIP_NGINX" != "1" ]] && command -v nginx >/dev/null 2>&1; then
  run sudo nginx -t
  run sudo systemctl reload nginx
  echo "nginx recargado"
elif [[ "$SKIP_NGINX" == "1" ]]; then
  echo "nginx omitido (SKIP_NGINX=1)"
else
  echo "nginx no disponible en este host — recargar manualmente en el servidor"
fi

if [[ -n "$BASE_URL" ]]; then
  echo ""
  ./deploy/smoke-routes.sh "$BASE_URL"
else
  echo ""
  echo "Smoke HTTP omitido — define BASE_URL=https://tu-dominio para verificar rutas"
fi

echo ""
echo "T-0 deploy completado. Checklist manual:"
echo "  - Login en producción"
echo "  - /finances/pos abre"
echo "  - Venta de prueba o agregar al carrito"
echo "  - Logout"
echo "  - Monitorear logs 30 min (ver cutover/08-rollback-y-post.md)"
