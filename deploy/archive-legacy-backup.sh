#!/usr/bin/env bash
# Archivar build legacy ANTES del cutover (T-24 en guía 07).
#
# Uso:
#   LEGACY_DIST=/var/www/nm-frontend/dist/nmaritex-app/browser \
#   BACKUP_DIR=/backups/nm-frontend-20260815 \
#   ./deploy/archive-legacy-backup.sh
#
# También puede archivar nginx:
#   NGINX_CONF=/etc/nginx/sites-available/nm-frontend ./deploy/archive-legacy-backup.sh

set -euo pipefail

cd "$(dirname "$0")/.."

LEGACY_DIST="${LEGACY_DIST:-}"
BACKUP_DIR="${BACKUP_DIR:-}"
NGINX_CONF="${NGINX_CONF:-}"

if [[ -z "$LEGACY_DIST" || -z "$BACKUP_DIR" ]]; then
  echo "Uso:"
  echo "  LEGACY_DIST=<ruta-build-legacy> BACKUP_DIR=<destino-backup> $0"
  echo ""
  echo "Opcional: NGINX_CONF=<ruta-sites-available/nm-frontend>"
  exit 1
fi

if [[ ! -d "$LEGACY_DIST" ]]; then
  echo "ERROR: no existe LEGACY_DIST=$LEGACY_DIST"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "==> Archivando legacy frontend"
echo "    Origen:  $LEGACY_DIST"
echo "    Destino: $BACKUP_DIR/browser"

rsync -av "$LEGACY_DIST/" "${BACKUP_DIR%/}/browser/"

if [[ -n "$NGINX_CONF" && -f "$NGINX_CONF" ]]; then
  cp "$NGINX_CONF" "${BACKUP_DIR%/}/nginx-nm-frontend.conf"
  echo "    nginx:   ${BACKUP_DIR%/}/nginx-nm-frontend.conf"
fi

cat > "${BACKUP_DIR%/}/README.txt" <<EOF
Backup legacy nm-frontend
Fecha: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Origen dist: $LEGACY_DIST
${NGINX_CONF:+Nginx: $NGINX_CONF}

Restaurar con:
  LEGACY_BACKUP=${BACKUP_DIR%/}/browser \\
  DEPLOY_TARGET=/var/www/nm-frontend \\
  ./deploy/rollback-to-legacy.sh
EOF

echo ""
echo "OK — backup en $BACKUP_DIR"
echo "Conservar al menos 30 días antes de borrar."
