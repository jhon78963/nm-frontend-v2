# PROMPT 02 — Página Home / Dashboard de Bienvenida

## Contexto

En `nm-frontend` (legacy) existe una página raíz `/` con `home.component` que actúa como
dashboard de bienvenida. En `nm-frontend-v2` la ruta `/` redirige directamente a
`/administrations/roles`, lo cual es correcto como fallback, pero NO existe una página de
dashboard real accesible desde el menú.

El `MainLayoutComponent` tiene un sidebar con grupos de navegación pero no tiene un enlace "Inicio"
ni un dashboard de métricas rápidas.

El reporte de management ya existe en `/reports` (`ManagementDashboardComponent`) pero es un
reporte avanzado. El Home debe ser una vista de bienvenida con métricas resumidas del día.

---

## Tarea

Crea la página **Dashboard de Inicio** en `features/dashboards/` con métricas rápidas del día y
accesos directos a las secciones más usadas.

---

## Estructura a crear

```
src/app/features/dashboards/
├── components/
│   ├── metric-card/
│   │   ├── metric-card.component.ts
│   │   └── metric-card.component.scss
│   └── quick-access-grid/
│       ├── quick-access-grid.component.ts
│       └── quick-access-grid.component.scss
├── data-access/
│   ├── dashboard-home.service.ts
│   └── dashboard-home.adapter.ts
├── models/
│   └── dashboard-home.model.ts
├── dashboard-home.component.ts
├── dashboard-home.component.html
└── dashboards.routes.ts   ← reemplaza el stub vacío existente
```

---

## Modelo (`dashboard-home.model.ts`)

```ts
export interface DashboardMetrics {
  todaySales: number;
  todaySalesAmount: number;
  todayExpenses: number;
  lowStockProducts: number;
  pendingPurchases: number;
  activeCustomers: number;
}

export interface QuickAccessItem {
  label: string;
  description: string;
  route: string;
  icon: string;
  permission: string;
  colorClass: string;
}
```

---

## Servicio (`dashboard-home.service.ts`)

- Decorado con `@Service`
- `getMetrics(): Observable<DashboardMetrics>` → GET `/api/dashboard/metrics`
- Si el endpoint no existe aún en el backend, el servicio debe retornar datos vacíos (ceros) sin
  lanzar error, usando `catchError(() => of(emptyMetrics))`

---

## Componente principal

### Layout en 3 secciones:

**1. Header de bienvenida**
- "Buenos días / tardes / noches, {nombre}" (derivado de la hora con `computed()`)
- Subtexto con la fecha actual y el almacén activo
- Muestra el rol del usuario

**2. Grilla de métricas del día (6 `MetricCardComponent`)**
- Ventas hoy (cantidad y monto total)
- Gastos hoy
- Productos con stock bajo (< 5 unidades)
- Compras pendientes
- Clientes activos este mes

Cada `MetricCardComponent` recibe:
- `input()` → `label: string`, `value: number | string`, `icon: string`, `colorVariant: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'`
- Estado de loading con skeleton

**3. Accesos rápidos (`QuickAccessGridComponent`)**
- Grid de tarjetas clickeables que llevan a las secciones principales
- Filtradas por permisos del usuario (usa `AuthService.hasPermission()`)
- Accesos: POS, Nueva Venta, Inventario, Nueva Compra, Reportes, Directorio
- Cada tarjeta tiene ícono, título y descripción corta

---

## `MetricCardComponent` (en `features/dashboards/components/`)

- Es un smart component que puede usar SCSS + Tailwind
- Muestra skeleton cuando `isLoading = true`
- Animación de contador al cargar el valor (`@defer` para la animación)

---

## Rutas (`dashboards.routes.ts`) — reemplaza el stub existente

```ts
export const dashboardsRoutes: Routes = [
  {
    path: '',
    component: DashboardHomeComponent,
    canActivate: [authGuard],
    data: { breadcrumb: 'Inicio' }
  }
];
```

---

## Registro en `app.routes.ts`

Cambia el redirect de la ruta raíz:
```ts
// Antes:
{ path: '', redirectTo: '/administrations/roles', pathMatch: 'full' }

// Después:
{ path: '', redirectTo: '/dashboard', pathMatch: 'full' }
```

Y asegúrate que la ruta `dashboard` apunte al nuevo módulo:
```ts
{
  path: 'dashboard',
  loadChildren: () =>
    import('./features/dashboards/dashboards.routes').then(m => m.dashboardsRoutes)
}
```

---

## Enlace en `MainLayoutComponent`

Agrega "Inicio" como primer ítem del sidebar (sin requerir permiso especial, solo `authGuard`),
con ícono de casa (`home`) y ruta `/dashboard`.

---

## Estilos

- Tailwind en todo el componente smart
- `MetricCardComponent` usa SCSS con variables de color por variante
- Responsive: 2 columnas en mobile, 3 en tablet, 6 en desktop para las métricas
- Quick access: 2 columnas en mobile, 3 en desktop
