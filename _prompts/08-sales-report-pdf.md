# PROMPT 08 — Exportación PDF desde Reportes de Ventas + Inventario

## Contexto

En `nm-frontend` (legacy), el `ReportsServiceService` tiene métodos para descargar PDFs:
- `getProductsInventoryPdf()` → descarga PDF del inventario de productos
- `getDailySalesReport()` → reporte de ventas diarias
- `getMonthlySalesReport()` → reporte mensual

En `nm-frontend-v2`, el `ProductsInventoryService` tiene lógica de PDF, pero la descarga
de archivos desde el frontend no tiene un manejo centralizado y consistente.

Cada vez que se exporta un PDF o Excel en el sistema, se repite el mismo patrón de:
1. Llamar al endpoint que devuelve un `Blob`
2. Crear un `URL.createObjectURL(blob)`
3. Crear un `<a>` invisible, hacer click y revocar la URL

Este patrón está duplicado en al menos 5 lugares del código y carece de:
- Feedback visual mientras se descarga
- Manejo de errores consistente
- Nombre de archivo con fecha dinámica

---

## Tarea

Crea una utilidad centralizada de descarga de archivos y aplícala en todos los puntos del
sistema donde se descarga PDF o Excel.

---

## Estructura a crear

```
src/app/core/utils/
└── file-download.util.ts
```

Y un componente de botón reutilizable:
```
src/app/shared/ui/export-button/
├── export-button.component.ts
└── export-button.component.scss
```

---

## Utilidad `file-download.util.ts`

```ts
export interface DownloadOptions {
  filename: string;       // nombre sin extensión
  extension: 'pdf' | 'xlsx' | 'csv';
  appendDate?: boolean;   // si true, agrega _YYYY-MM-DD al filename
}

export function downloadFile(blob: Blob, options: DownloadOptions): void {
  // 1. Genera el nombre final
  const date = options.appendDate
    ? `_${new Date().toISOString().slice(0, 10)}`
    : '';
  const fullName = `${options.filename}${date}.${options.extension}`;

  // 2. Crea URL temporal
  const url = URL.createObjectURL(blob);

  // 3. Trigger descarga
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fullName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // 4. Revoca URL después de un tick
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
```

---

## Componente `ExportButtonComponent` (`shared/ui/export-button/`)

Un botón dumb que maneja su propio estado de carga.

### API
```ts
label = input('Exportar');
format = input<'pdf' | 'excel'>('pdf');
disabled = input(false);
isLoading = input(false);
clicked = output<void>();
```

### Comportamiento
- Muestra ícono según `format`: PDF (documento rojo) o Excel (tabla verde)
- Muestra spinner inline cuando `isLoading = true`
- Deshabilitado cuando `disabled = true` o `isLoading = true`
- Al hacer click emite `clicked` (el padre gestiona la lógica de descarga)
- SCSS con `@apply` para los estados hover/disabled/loading

---

## Refactoring: aplicar en todos los puntos de exportación

Busca en el proyecto todos los lugares donde se descarga un archivo (PDF o Excel) y reemplaza
el código duplicado con la función `downloadFile()`. Los lugares conocidos son:

1. `ProductsInventoryService` o su componente → exportar PDF del inventario
2. `PurchaseService` → si tiene exportación del detalle de compra
3. `SalesReportComponent` → reportes de ventas (creado en Prompt 05)
4. Cualquier otro componente que tenga `URL.createObjectURL` o `anchor.click()`

Para cada uno:
1. Elimina el código de descarga inline
2. Importa y usa `downloadFile(blob, { filename: '...', extension: 'pdf', appendDate: true })`

---

## Integración del `ExportButtonComponent`

Reemplaza los botones de exportación existentes en:
- `ProductsInventoryReportComponent` → botón "Exportar PDF"
- `SalesReportComponent` → botones "Exportar PDF" (del Prompt 05)
- `SalesPeriodReportComponent` → botón "Exportar PDF" (del Prompt 05)

Con el nuevo `ExportButtonComponent`, pasando `isLoading` vinculado a la señal de loading
del servicio.

---

## Ejemplo de uso en un componente

```ts
isExporting = signal(false);

onExportPdf(): void {
  this.isExporting.set(true);
  this.salesReportService
    .exportDailyPdf(this.filters())
    .pipe(finalize(() => this.isExporting.set(false)))
    .subscribe({
      next: blob => downloadFile(blob, {
        filename: 'reporte-ventas-diario',
        extension: 'pdf',
        appendDate: true
      }),
      error: () => this.toastService.error('Error al generar el PDF')
    });
}
```

---

## Mejoras adicionales de UX

Agrega un toast informativo durante la descarga:
- Al iniciar: "Generando archivo..." (toast tipo 'info' que no se auto-cierra)
- Al terminar: descarta el toast anterior y muestra "Archivo descargado" (tipo 'success', 3s)
- Al fallar: "Error al generar el archivo. Intenta nuevamente." (tipo 'error', 5s)

Implementa este patrón en el `ToastService` existente o agrega un método
`toastService.loading(message)` que devuelve un ID para poder cerrarlo con
`toastService.dismiss(id)`.
