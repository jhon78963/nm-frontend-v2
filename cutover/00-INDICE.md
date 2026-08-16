# Cutover: reemplazar nm-frontend (legacy) por nm-frontend-v2

Guías ejecutables para pasar a producción con v2. Ejecutar **en orden** salvo que se indique lo contrario.

## Estado actual (auditoría)

| Área | Legacy | v2 | Estado cutover |
|------|--------|-----|----------------|
| Módulos de negocio | ✅ | ✅ (~90%+) | Listo |
| Auth Sanctum + CSRF | ✅ | ✅ | Listo |
| `permissionGuard` en productos/reconciliación | ✅ | ✅ | **Hecho** (guía 01) |
| `warehouseInterceptor` | ✅ | ✅ | **Hecho** (guía 02) |
| `errorInterceptor` (419/403) | ✅ | ✅ | **Hecho** (guía 02) |
| `roleGuard` en administración | ✅ | ✅ | **Hecho** (guía 01) |
| CSP + nginx seguridad | ✅ | ✅ | **Hecho** (guía 03) |
| E2E / CI | ✅ | ✅ | **Hecho** (guía 06, 12/12) |
| Routing hash → path | hash | path | **Hecho** (guía 05) |
| Backend env prod | ✅ | ✅ | **Hecho** (guía 04) |

## Orden de ejecución

| # | Archivo | Qué hace | Estado |
|---|---------|----------|--------|
| 1 | [01-guards-y-permisos.md](./01-guards-y-permisos.md) | Paridad de guards con legacy | ✅ |
| 2 | [02-interceptors-http.md](./02-interceptors-http.md) | Warehouse + errores HTTP globales | ✅ |
| 3 | [03-seguridad-csp-nginx.md](./03-seguridad-csp-nginx.md) | CSP, headers, plantilla nginx v2 | ✅ |
| 4 | [04-backend-env.md](./04-backend-env.md) | CORS, Sanctum, sesión en producción | ✅ |
| 5 | [05-deploy-y-routing.md](./05-deploy-y-routing.md) | Build, nginx path routing, redirects | ✅ |
| 6 | [06-tests-y-qa.md](./06-tests-y-qa.md) | E2E, checklist manual por módulo | ✅ auto / ⏳ QA manual staging |
| 7 | [07-dia-del-cutover.md](./07-dia-del-cutover.md) | Playbook del día D | ⏳ ventana prod |
| 8 | [08-rollback-y-post.md](./08-rollback-y-post.md) | Rollback y monitoreo post-cutover | ✅ scripts listos |
| 9 | [09-staging.md](./09-staging.md) | QA en staging antes del cutover prod | ✅ desplegado / ⏳ checklist manual |

## Scripts de deploy

| Script | Cuándo |
|--------|--------|
| `./deploy/pre-cutover-check.sh` | T-24 / T-1 — build, smoke, unit (+ E2E si no `SKIP_E2E=1`) |
| `./deploy/build-production.sh` | Generar artefactos en `dist/nm-frontend-v2/browser/` |
| `./deploy/cutover-t0.sh` | T-0 — rsync + nginx reload + smoke en prod |
| `./deploy/archive-legacy-backup.sh` | T-24 — backup legacy antes del cutover |
| `./deploy/rollback-to-legacy.sh` | Emergencia — restaurar legacy (&lt; 15 min) |
| `./deploy/post-cutover-check.sh` | T+0 a día 3 — smoke + checklist manual |
| `./deploy/smoke-routes.sh <url>` | Smoke HTTP post-deploy |

## Cómo usar estas guías

1. Abre cada `.md` en orden.
2. Marca los checkboxes `[ ]` → `[x]` al completar.
3. Los prompts en `_prompts/` son **históricos**. Usa `cutover/` para producción.

## Criterio de “listo para cutover”

- [x] Ítems **01**–**05** completados en repo
- [x] E2E automatizado (**06**) — 12/12 passing
- [ ] Checklist **06** manual en staging con datos reales → ver **09**
- [ ] Ventana **07** acordada + backup legacy archivado (`npm run archive:legacy`)
- [x] Plan **08** documentado + scripts rollback/monitoreo
