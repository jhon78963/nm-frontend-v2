# PROMPT 07 — Mejoras del Recibo de Impresión del POS

## Contexto

En `nm-frontend` (legacy), el POS tiene dos archivos especializados para impresión:
- `print-receipt.component` → componente visual del recibo
- `print-receipt.print-document.ts` → utilidad que genera un documento HTML limpio para impresora
  térmica y dispara `window.print()` con estilos `@media print` inyectados dinámicamente

En `nm-frontend-v2`, el `PosComponent` tiene funcionalidad de impresión pero es básica.
Al revisar el servicio `PosService`, la impresión parece invocar directamente el endpoint del
backend que devuelve el HTML del ticket, pero no tiene la capa de formateo para impresoras
térmicas ni el manejo correcto de `window.print()`.

---

## Tarea

Implementa un sistema de impresión de tickets robusto para el POS de `nm-frontend-v2`:

1. Utilidad `ReceiptPrinter` (en `features/finances/pos/utils/receipt-printer.ts`)
2. Componente `PosReceiptPreviewComponent` para preview antes de imprimir
3. Soporte para dos formatos: **Ticket 80mm** (impresora térmica) y **A4** (impresora estándar)

---

## Estructura a crear

```
src/app/features/finances/pos/
├── components/
│   └── pos-receipt-preview/
│       ├── pos-receipt-preview.component.ts
│       ├── pos-receipt-preview.component.html
│       └── pos-receipt-preview.component.scss
└── utils/
    └── receipt-printer.ts
```

---

## Modelo — agregar en `pos.model.ts`

```ts
export interface ReceiptData {
  receiptNumber: string;
  documentType: 'boleta' | 'factura' | 'ticket';
  date: string;
  time: string;
  cashierName: string;
  warehouseName: string;
  warehouseAddress: string;
  warehouseRuc: string;
  customerName: string | null;
  customerDocument: string | null;
  items: ReceiptItem[];
  subtotal: number;
  igv: number;
  total: number;
  payments: ReceiptPayment[];
  change: number;
}

export interface ReceiptItem {
  description: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ReceiptPayment {
  method: 'Efectivo' | 'Yape' | 'Tarjeta';
  amount: number;
}

export type PrintFormat = 'thermal-80mm' | 'a4';
```

---

## Utilidad `receipt-printer.ts`

```ts
export class ReceiptPrinter {
  static print(data: ReceiptData, format: PrintFormat = 'thermal-80mm'): void
  static getHtml(data: ReceiptData, format: PrintFormat): string
  private static buildThermalHtml(data: ReceiptData): string
  private static buildA4Html(data: ReceiptData): string
  private static getThermalStyles(): string
  private static getA4Styles(): string
}
```

### `print()` — implementación

1. Llama a `getHtml(data, format)`
2. Crea un `<iframe>` invisible con `display: none`
3. Escribe el HTML dentro del iframe usando `contentDocument.write()`
4. Espera a que el iframe cargue (`onload`)
5. Llama a `iframe.contentWindow.print()`
6. Elimina el iframe después de 1 segundo

**NO usar `window.print()` directamente** porque afecta toda la página.

### `buildThermalHtml()` — estilos para ticket 80mm

El HTML debe incluir `<style>` con:
```css
@page { margin: 0; size: 80mm auto; }
body { font-family: 'Courier New', monospace; font-size: 10px; width: 72mm; margin: 0 auto; }
.divider { border-top: 1px dashed #000; margin: 4px 0; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.row { display: flex; justify-content: space-between; }
```

Contenido del ticket:
1. Logo/nombre del negocio (centrado, en negrita)
2. RUC y dirección
3. Línea divisoria
4. Número de comprobante y tipo de documento
5. Fecha, hora y nombre del cajero
6. Datos del cliente (si tiene)
7. Línea divisoria
8. Tabla de items: descripción, talla/color, cantidad × precio = subtotal
9. Línea divisoria
10. Subtotal, IGV, **TOTAL** (en negrita grande)
11. Línea divisoria
12. Desglose de pagos y vuelto
13. Mensaje de cierre centrado: "¡Gracias por su compra!"

### `buildA4Html()` — formato A4

Similar pero con más espacio, logo más grande, y tabla HTML con bordes.

---

## Componente `PosReceiptPreviewComponent`

### API
```ts
receiptData = input.required<ReceiptData>();
isOpen = input(false);
close = output<void>();
printed = output<void>();
```

### Layout
- Dialog/modal centrado con overlay
- Vista previa del ticket (iframe con el HTML generado o renderizado directamente)
- Dos botones: "Imprimir Ticket 80mm" y "Imprimir A4"
- Botón "Cerrar" (no imprime)
- Atajo de teclado: `Ctrl+P` / `Cmd+P` dispara la impresión en 80mm por defecto
- Al hacer click en cualquier botón de impresión: llama a `ReceiptPrinter.print()`, emite `printed` y cierra

---

## Integración en `PosComponent`

1. Después de un checkout exitoso, el servicio ya devuelve los datos de la venta
2. Mapea la respuesta a `ReceiptData` usando un adapter
3. Abre `PosReceiptPreviewComponent` con los datos del recibo
4. Si el usuario tiene configurada la opción "imprimir automáticamente", dispara la impresión sin
   mostrar el preview (configurable via `AuthService` o `localStorage`)

---

## Sanitización del contenido

El HTML generado para el iframe NO debe incluir scripts externos ni imágenes remotas para
garantizar que funcione offline. El logo del negocio debe ser un texto en ASCII art o un SVG
inline simple.

---

## Compatibilidad con el backend existente

Si `SaleService` ya tiene un método que devuelve el HTML del ticket desde el backend
(`/api/sales/:id/receipt` → `responseType: 'text'`), el `ReceiptPrinter` puede recibir
ese HTML directamente y envolverlo en los estilos de impresión apropiados en lugar de
generar el HTML desde cero. Implementa ambas variantes:
- `ReceiptPrinter.printFromHtml(rawHtml: string, format: PrintFormat): void`
- `ReceiptPrinter.print(data: ReceiptData, format: PrintFormat): void`
