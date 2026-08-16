#!/usr/bin/env bash
# Smoke tests HTTP tras deploy (rutas path-based v2).
# Uso: ./deploy/smoke-routes.sh https://adm.novedadesmaritex.net.pe

set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "Uso: $0 <base-url>"
  echo "Ejemplo: $0 https://adm.novedadesmaritex.net.pe"
  exit 1
fi

BASE_URL="${BASE_URL%/}"

check() {
  local path="$1"
  local expect="$2"
  local url="${BASE_URL}${path}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [[ "$code" == "$expect" ]]; then
    echo "  OK $code  $path"
  else
    echo "  FAIL $code (esperado $expect)  $path"
    return 1
  fi
}

echo "==> Smoke routes: $BASE_URL"
echo ""

failed=0

# HTML shell (SPA)
check "/" "200" || failed=1
check "/dashboard" "200" || failed=1
check "/finances/pos" "200" || failed=1
check "/inventories/products" "200" || failed=1
check "/auth/login" "200" || failed=1

# Redirects de compatibilidad (Angular devuelve 200 con index.html)
check "/sales" "200" || failed=1
check "/administration/users" "200" || failed=1

# Asset estático
check "/legacy-hash-redirect.js" "200" || failed=1

echo ""
if [[ "$failed" -eq 0 ]]; then
  echo "Smoke tests OK"
  exit 0
fi

echo "Algunos smoke tests fallaron"
exit 1
