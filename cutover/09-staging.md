# 09 — Entorno staging (QA antes de producción)

**Objetivo:** Validar nm-frontend-v2 + backend + motor IA con datos reales **sin tocar producción**.

Staging es el paso entre las guías **06** (tests) y **07** (cutover prod). Aquí pruebas login, POS, reportes e **AI Insights** contra una copia de la BD.

---

## URLs

| Servicio | URL |
|----------|-----|
| Admin SPA v2 | https://adm-staging.novedadesmaritex.net.pe/ |
| API Laravel | https://api-staging.novedadesmaritex.net.pe/api |
| Motor IA (FastAPI) | https://ai.novedadesmaritex.net.pe/ |
| Upload (compartido con prod) | https://upload.novedadesmaritex.net.pe |

El frontend **no** llama al motor IA directamente. Usa el proxy Laravel:

- `GET /api/ai/products/{id}/context`
- `POST /api/ai/predict/price`
- `POST /api/ai/predict/demand`

---

## Infraestructura en el VPS

| Recurso | Ruta / nombre |
|---------|----------------|
| Backend staging | `/var/www/nm-backend-staging` |
| Frontend v2 staging | `/var/www/nm-ecom-admin-staging-deploy` |
| Motor IA | `/var/www/nm-ai-engine` (systemd: `nm-ai-engine`) |
| Base de datos | `staging_nm_db` (clon de `nm_db`) |

Scripts en `deploy/` (raíz del monorepo):

| Script | Cuándo |
|--------|--------|
| `setup-staging-first-time.sh` | Una sola vez — BD, nginx, AI engine, `.env` |
| `deploy-staging.sh` | Cada deploy a staging |

```bash
cd /Users/zero/Desktop/zero-project/deploy

# Primera vez (ya ejecutado si staging está arriba)
./setup-staging-first-time.sh

# Deploys siguientes
./deploy-staging.sh
```

---

## Build local (frontend staging)

```bash
cd nm-frontend-v2
npm run build:staging
```

Usa `src/environments/environment.staging.ts`:

- API: `https://api-staging.novedadesmaritex.net.pe/api`
- Upload: `https://upload.novedadesmaritex.net.pe` (prod compartido)

---

## Variables `.env` (backend staging)

En `/var/www/nm-backend-staging/.env`:

```env
APP_ENV=staging
APP_DEBUG=false
APP_URL=https://api-staging.novedadesmaritex.net.pe
DB_DATABASE=staging_nm_db

FRONTEND_URL=https://adm-staging.novedadesmaritex.net.pe
SANCTUM_STATEFUL_DOMAINS=adm-staging.novedadesmaritex.net.pe,api-staging.novedadesmaritex.net.pe
CORS_ALLOWED_ORIGINS=https://adm-staging.novedadesmaritex.net.pe

AI_ENGINE_URL=http://127.0.0.1:8010
AI_ENGINE_API_KEY=<misma clave que nm_ai_engine>
AI_ENGINE_TIMEOUT=30
```

Motor IA (`/var/www/nm-ai-engine/.env`):

```env
ENVIRONMENT=staging
DATABASE_URL=postgresql+psycopg2://USER:PASS@127.0.0.1:5432/staging_nm_db
API_KEY=<misma clave que Laravel>
```

---

## Checklist QA en staging

Usa las mismas credenciales que prod (BD clonada). **No** uses datos de clientes reales en tickets de prueba si vas a imprimir.

### Auth y navegación

- [ ] Login en https://adm-staging.novedadesmaritex.net.pe/
- [ ] Refresh de sesión (recargar página sin perder sesión)
- [ ] Logout y re-login
- [ ] Menú lateral carga sin errores de consola (CSP)

### Módulos críticos (guía 06 manual)

- [ ] POS — buscar producto, agregar al carrito, checkout de prueba
- [ ] Productos — listado, edición, imágenes
- [ ] Ventas — listado y detalle
- [ ] Reportes — al menos un reporte con datos
- [ ] Administración — usuarios/roles (solo lectura si no quieres cambiar staging)

### AI Insights

- [ ] Abrir `/ai` o módulo AI Insights
- [ ] Contexto de producto carga (`/api/ai/products/{id}/context`)
- [ ] Predicción de precio responde sin error 500
- [ ] Predicción de demanda responde sin error 500
- [ ] Health del motor: `curl https://ai.novedadesmaritex.net.pe/health`

### API directa (opcional)

```bash
# Debe devolver 422 (validación), no 404/502
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://api-staging.novedadesmaritex.net.pe/api/auth/login \
  -H "Content-Type: application/json" -d '{}'
```

---

## Refrescar datos de staging

Si prod avanzó y quieres una copia fresca:

```bash
# En el VPS (cuidado: borra cambios en staging_nm_db)
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'staging_nm_db' AND pid <> pg_backend_pid();"
sudo -u postgres psql -c "DROP DATABASE staging_nm_db;"
sudo -u postgres psql -c "CREATE DATABASE staging_nm_db WITH TEMPLATE nm_db OWNER zero;"
```

Luego en staging backend: `php artisan migrate --force` por si hay migraciones nuevas.

---

## Smoke rápido post-deploy

```bash
curl -s -o /dev/null -w "adm: %{http_code}\n" https://adm-staging.novedadesmaritex.net.pe/
curl -s -o /dev/null -w "api: %{http_code}\n" https://api-staging.novedadesmaritex.net.pe/
curl -s https://ai.novedadesmaritex.net.pe/health
```

Esperado: `adm: 200`, `api: 200`, JSON con `"status":"ok"`.

---

## Cuándo pasar a producción (guía 07)

- [ ] Checklist de esta guía completado
- [ ] Sin incidencias bloqueantes en staging 24–48 h
- [ ] Backup legacy archivado (guía 08, T-24)
- [ ] Ventana de cutover acordada (guía 07)

---

## Notas técnicas

- **NumPy en el VPS:** la CPU del servidor no soporta wheels X86_V2; `setup-staging-first-time.sh` compila numpy desde fuente si hace falta (`build-essential` requerido).
- **Upload:** staging usa el mismo servicio de upload que prod; las imágenes ya existentes se ven igual.
- **Módulo AI en Laravel:** vive en `nm-backend/app/Ai/`; se despliega con `git pull` en staging (o rsync si la rama aún no está en remoto).
