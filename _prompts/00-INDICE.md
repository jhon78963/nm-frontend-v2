# Índice de Prompts — Paridad Funcional nm-frontend-v2

> **Producción / cutover:** usa la carpeta [`cutover/`](../cutover/00-INDICE.md) (guías 01–08).
> Este índice `_prompts/` es **histórico** — prompts de migración de features ya implementadas.

> Ejecuta cada prompt en orden en Cursor Agent. Cada archivo es autónomo y contiene toda la
> información necesaria para implementar esa funcionalidad desde cero, respetando la arquitectura
> Angular 22 + DDD + Signals definida en `.cursorrules`.

---

## Estado del gap: Legacy → v2

| # | Funcionalidad faltante | Impacto | Archivo de prompt |
|---|---|---|---|
| 01 | Página de Perfil de Usuario (`/profile`) | Alto | `01-perfil-usuario.md` |
| 02 | Página Home / Dashboard de bienvenida | Medio | `02-dashboard-home.md` |
| 03 | Paso "Ecommerce" en el stepper de Productos | Alto | `03-producto-step-ecommerce.md` |
| 04 | Funcionalidad de Canje/Cambio en Ventas | Alto | `04-ventas-exchange.md` |
| 05 | Reporte de Ventas diario, mensual y por período | Alto | `05-reportes-ventas.md` |
| 06 | Componentes Shared UI faltantes (multi-select, autocomplete-api, chips, tab-view, upload-excel, phone, radio, checkbox, color-picker) | Alto | `06-shared-ui-components.md` |
| 07 | Mejoras del recibo de impresión del POS | Medio | `07-pos-receipt-print.md` |
| 08 | Sección de Sales Report exportable a PDF | Medio | `08-sales-report-pdf.md` |

---

## Funcionalidades que v2 YA tiene correctamente

- Auth completo: login, forgot-password, reset-password, change-password ✅
- Administraciones: roles, users, tenants, warehouses, action-logs ✅
- Directorio: teams, attendance, payroll, customers, vendors ✅
- Inventarios: products CRUD stepper, sizes, colors, purchases, reconciliation ✅
- Ecommerce: publish products, multimedia, WooCommerce sync ✅
- Finanzas POS: carrito, pagos, checkout ✅
- Finanzas: sales list, cash-movements ✅
- Gastos: admin-expenses, accumulated-expenses, month-end transfer ✅
- Reportes: management dashboard, products inventory, financial-summaries ✅
- AI: ai-insights-dashboard ✅ (nuevo, no existe en legacy)

---

## Nota sobre arquitectura

Todos los prompts siguen estrictamente el `.cursorrules`:
- Angular 22, Zoneless, SPA sin SSR
- Signals (`input()`, `output()`, `computed()`, `signal()`)
- `inject()` en lugar de constructores
- `@if`, `@for` en lugar de `*ngIf`, `*ngFor`
- Tailwind en smart components, SCSS + `@apply` en shared/ui
- Adapters en `data-access/` para mapear JSON del backend
- Sin `any`, sin `standalone: true` explícito, sin `OnPush` explícito
