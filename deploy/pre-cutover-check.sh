#!/usr/bin/env bash
# Verificaciones pre-cutover (T-24 / T-1) — ejecutar en máquina de build o CI.
# Uso: ./deploy/pre-cutover-check.sh
# Opcional: SKIP_E2E=1 para omitir Playwright (~30s)

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
BACKEND_ROOT="${BACKEND_ROOT:-$ROOT/../nm-backend}"
SMOKE_PORT="${SMOKE_PORT:-8765}"
SKIP_E2E="${SKIP_E2E:-0}"

failed=0

run_step() {
  local label="$1"
  shift
  echo ""
  echo "==> $label"
  if "$@"; then
    echo "OK — $label"
  else
    echo "FAIL — $label"
    failed=1
  fi
}

echo "==> nm-frontend-v2: pre-cutover check"
echo "    Repo: $ROOT"

run_step "Unit tests" npm test

if [[ "$SKIP_E2E" == "1" ]]; then
  echo ""
  echo "==> E2E (omitido: SKIP_E2E=1)"
else
  run_step "E2E Playwright" env CI=true E2E_PORT=4321 npx playwright test --workers=1 --retries=0
fi

run_step "Build producción" ./deploy/build-production.sh

run_step "Smoke routes (build local)" bash -c "
  set -euo pipefail
  npx --yes serve -s dist/nm-frontend-v2/browser -l ${SMOKE_PORT} >/tmp/nm-v2-serve.log 2>&1 &
  serve_pid=\$!
  trap 'kill \$serve_pid 2>/dev/null || true' EXIT
  sleep 2
  ./deploy/smoke-routes.sh http://127.0.0.1:${SMOKE_PORT}
"

if [[ -x "$BACKEND_ROOT/deploy/verify-production-env.sh" ]]; then
  run_step "Backend env (dry-run)" "$BACKEND_ROOT/deploy/verify-production-env.sh" --dry
else
  echo ""
  echo "WARN — no se encontró $BACKEND_ROOT/deploy/verify-production-env.sh"
fi

echo ""
if [[ "$failed" -eq 0 ]]; then
  echo "Pre-cutover check OK — listo para ventana T-0 (ver cutover/07-dia-del-cutover.md)"
  exit 0
fi

echo "Pre-cutover check FALLÓ — corregir antes del cutover"
exit 1
