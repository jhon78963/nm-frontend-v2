# PROMPT 05 — Reportes de Ventas (Diario, Mensual y por Período)

## Contexto

En `nm-frontend` (legacy), el módulo de reportes tiene tres vistas de ventas:
- `/reports/sales` → Reporte de ventas diario y mensual (con tabs)
- `/reports/sales-period` → Reporte de ventas filtrado por rango de fechas

En `nm-frontend-v2`, el módulo de reportes tiene:
- `/reports` → `ManagementDashboardComponent` (dashboard gerencial con gráficos)
- `/reports/products` → Reporte de inventario de productos
- `/reports/financial-summaries` → Resumen financiero

**Los reportes específicos de ventas (diario, mensual, por período) NO existen en v2.**
El `ManagementDashboardComponent` muestra totales pero no un reporte exportable detallado.

---

## Tarea

Crea los reportes de ventas detallados en el feature `reports/`, con dos nuevas rutas:
- `/reports/sales` → Reporte ventas diario + mensual (con tabs)
- `/reports/sales-period` → Reporte por rango de fechas personalizado

---

## Estructura a crear

```
src/app/features/reports/
├── sales-report/
│   ├── components/
│   │   ├── sales-daily-tab/
│   │   │   ├── sales-daily-tab.component.ts
│   │   │   └── sales-daily-tab.component.html
│   │   └── sales-monthly-tab/
│   │       ├── sales-monthly-tab.component.ts
│   │       └── sales-monthly-tab.component.html
│   ├── sales-report.component.ts
│   ├── sales-report.component.html
│   └── sales-report.component.scss
└── sales-period-report/
    ├── sales-period-report.component.ts
    ├── sales-period-report.component.html
    └── sales-period-report.component.scss
```

Y en `data-access/` del feature reports:
```
src/app/features/reports/data-access/
├── sales-report.service.ts      ← nuevo
└── sales-report.adapter.ts      ← nuevo
```

---

## Modelo (`sales-report.model.ts`)

```ts
export interface DailySaleRow {
  hour: string;            // "08:00", "09:00", etc.
  quantity: number;
  total: number;
  cash: number;
  yape: number;
  card: number;
}

export interface DailySalesReport {
  date: string;
  warehouseId: number;
  warehouseName: string;
  rows: DailySaleRow[];
  totals: {
    quantity: number;
    total: number;
    cash: number;
    yape: number;
    card: number;
  };
}

export interface MonthlySaleRow {
  day: number;
  date: string;
  quantity: number;
  total: number;
  cash: number;
  yape: number;
  card: number;
}

export interface MonthlySalesReport {
  month: number;
  year: number;
  warehouseId: number;
  warehouseName: string;
  rows: MonthlySaleRow[];
  totals: {
    quantity: number;
    total: number;
    cash: number;
    yape: number;
    card: number;
  };
}

export interface PeriodSaleRow {
  date: string;
  quantity: number;
  total: number;
  cash: number;
  yape: number;
  card: number;
  products: {
    name: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

export interface PeriodSalesReport {
  from: string;
  to: string;
  warehouseId: number;
  rows: PeriodSaleRow[];
  totals: {
    quantity: number;
    total: number;
    cash: number;
    yape: number;
    card: number;
  };
}

export interface SalesReportFilters {
  date?: string;
  month?: number;
  year?: number;
  warehouseId?: number;
}

export interface SalesPeriodFilters {
  from: string;
  to: string;
  warehouseId?: number;
}
```

---

## Servicio (`sales-report.service.ts`)

- Decorado con `@Service`
- `getDailyReport(filters: SalesReportFilters): Observable<DailySalesReport>`
  → GET `/api/reports/sales/daily`
- `getMonthlyReport(filters: SalesReportFilters): Observable<MonthlySalesReport>`
  → GET `/api/reports/sales/monthly`
- `getPeriodReport(filters: SalesPeriodFilters): Observable<PeriodSalesReport>`
  → GET `/api/reports/sales/period`
- `exportDailyPdf(filters: SalesReportFilters): Observable<Blob>`
  → GET `/api/reports/sales/daily/pdf` (responseType: 'blob')
- `exportMonthlyPdf(filters: SalesReportFilters): Observable<Blob>`
  → GET `/api/reports/sales/monthly/pdf` (responseType: 'blob')
- `exportPeriodPdf(filters: SalesPeriodFilters): Observable<Blob>`
  → GET `/api/reports/sales/period/pdf` (responseType: 'blob')

---

## Componente `SalesReportComponent` (`/reports/sales`)

### Señales

```ts
activeTab = signal<'daily' | 'monthly'>('daily');
selectedDate = signal<string>(today());
selectedMonth = signal<number>(currentMonth());
selectedYear = signal<number>(currentYear());
selectedWarehouseId = signal<number | null>(null);
dailyReport = signal<DailySalesReport | null>(null);
monthlyReport = signal<MonthlySalesReport | null>(null);
isLoading = signal(false);
isExporting = signal(false);
```

### Layout

- **Header**: Título "Reporte de Ventas" + botón "Exportar PDF" (top right)
- **Tabs**: "Diario" y "Mensual" — usando el patrón de tabs nativo de Angular 22 (no PrimeNG)
- **Filtros comunes**: Selector de almacén (si el usuario tiene múltiples)
- **Tab Diario** → `SalesDailyTabComponent`:
  - Date picker para seleccionar el día
  - Tabla con columnas: Hora, Cantidad, Total, Efectivo, Yape, Tarjeta
  - Fila de totales al final
  - Tarjetas de resumen en la parte superior (total ventas, total efectivo, total Yape, total tarjeta)
- **Tab Mensual** → `SalesMonthlyTabComponent`:
  - Selector de mes y año
  - Tabla con columnas: Día, Fecha, Cantidad, Total, Efectivo, Yape, Tarjeta
  - Fila de totales al final
  - Gráfico de barras simple (usando solo CSS/SVG, sin librerías externas) mostrando ventas por día

---

## Componente `SalesPeriodReportComponent` (`/reports/sales-period`)

### Señales

```ts
dateRange = signal<{ from: string; to: string }>({ from: firstDayOfMonth(), to: today() });
selectedWarehouseId = signal<number | null>(null);
report = signal<PeriodSalesReport | null>(null);
expandedRows = signal<Set<string>>(new Set());
isLoading = signal(false);
isExporting = signal(false);
```

### Layout

- **Header**: "Reporte por Período" + botón "Exportar PDF"
- **Filtros**: Fecha desde, Fecha hasta, Selector de almacén, Botón "Buscar"
- **Tabla principal**: Por día (colapsable)
  - Columnas: Fecha, Cantidad de ventas, Total, Efectivo, Yape, Tarjeta
  - Al expandir una fila: muestra sub-tabla de productos vendidos ese día
  - Columnas sub-tabla: Producto, Talla, Color, Cantidad, P. Unitario, Subtotal
- **Fila de totales** al fondo de la tabla principal
- **Panel de resumen** lateral o inferior: total del período con breakdown por método de pago

---

## Rutas a agregar en `reports.routes.ts`

```ts
{
  path: 'sales',
  loadComponent: () =>
    import('./sales-report/sales-report.component')
      .then(m => m.SalesReportComponent),
  canActivate: [permissionGuard('report.sales')],
  data: { breadcrumb: 'Reporte de Ventas' }
},
{
  path: 'sales-period',
  loadComponent: () =>
    import('./sales-period-report/sales-period-report.component')
      .then(m => m.SalesPeriodReportComponent),
  canActivate: [permissionGuard('report.salesPeriod')],
  data: { breadcrumb: 'Ventas por Período' }
}
```

---

## Agregar en el sidebar (`MainLayoutComponent`)

Dentro del grupo "Reportes", agrega:
- "Ventas" → `/reports/sales` (permiso `report.sales`)
- "Ventas por Período" → `/reports/sales-period` (permiso `report.salesPeriod`)

---

## Exportar PDF

Para la exportación PDF, abre el blob en una nueva pestaña usando `window.open(url)` con
`URL.createObjectURL(blob)`. Muestra un toast "Generando PDF..." mientras carga y
"PDF listo" al completar. En caso de error, toast de error.

---

## Estilos

- Tailwind en todos los componentes (son `features/reports/`)
- Las tarjetas de resumen usan fondo de color suave: azul para ventas, verde para efectivo,
  morado para Yape, naranja para tarjeta
- Las tablas usan rayas alternas (`even:bg-gray-50`) para legibilidad
- El gráfico de barras mensual: barras verticales proporcionales al máximo diario, con tooltip
  en hover mostrando el monto exacto
