#!/usr/bin/env bash
# Monitoreo post-cutover — días 0–3 y semana 1 (guía 08).
#
# Uso:
#   BASE_URL=https://adm.novedadesmaritex.net.pe ./deploy/post-cutover-check.sh
#
# Opcional API:
#   API_URL=https://api.novedadesmaritex.net.pe ./deploy/post-cutover-check.sh

set -euo pipefail

cd "$(dirname "$0")/.."

BASE_URL="${BASE_URL:-}"
API_URL="${API_URL:-}"

if [[ -z "$BASE_URL" ]]; then
  echo "Uso: BASE_URL=https://adm.tu-dominio.com $0"
  echo "Opcional: API_URL=https://api.tu-dominio.com"
  exit 1
fi

echo "==> Post-cutover check — $(date)"
echo "    Frontend: $BASE_URL"
echo ""

failed=0

echo "--- Smoke rutas v2 (path routing) ---"
if ./deploy/smoke-routes.sh "$BASE_URL"; then
  echo ""
else
  failed=1
fi

if [[ -n "$API_URL" ]]; then
  echo "--- API health ---"
  API_URL="${API_URL%/}"
  api_code=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/health" 2>/dev/null || echo "000")
  if [[ "$api_code" == "200" || "$api_code" == "204" ]]; then
    echo "  OK $api_code  ${API_URL}/api/health"
  else
    # Algunos backends no exponen /health — intentar csrf como señal viva
    csrf_code=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/sanctum/csrf-cookie" 2>/dev/null || echo "000")
    if [[ "$csrf_code" == "204" || "$csrf_code" == "200" ]]; then
      echo "  OK $csrf_code  ${API_URL}/sanctum/csrf-cookie (sin /health)"
    else
      echo "  WARN API no responde como esperado (health=$api_code csrf=$csrf_code)"
    fi
  fi
  echo ""
fi

echo "--- Checklist manual (marcar en cutover/08-rollback-y-post.md) ---"
echo "  [ ] Login en producción"
echo "  [ ] POS: agregar producto al carrito"
echo "  [ ] Sin picos 5xx en nginx error log"
echo "  [ ] Sin excepciones nuevas en storage/logs/laravel.log"
echo "  [ ] Usuarios sin errores CORS/419 en consola"
echo "  [ ] Caja confirma impresión de ticket (si aplica)"
echo ""

if [[ "$failed" -eq 0 ]]; then
  echo "Post-cutover HTTP check OK"
  exit 0
fi

echo "Post-cutover check con fallos — evaluar rollback (deploy/rollback-to-legacy.sh)"
exit 1
