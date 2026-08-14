# PROMPT 04 — Funcionalidad de Canje / Cambio en Ventas

## Contexto

En `nm-frontend` (legacy), el módulo de ventas tiene un dialog/página de **exchange** (canje o
cambio de prenda) accesible desde la lista de ventas. Permite:
1. Seleccionar una venta existente como origen del canje
2. Elegir qué producto(s) devuelve el cliente
3. Elegir qué producto(s) recibe el cliente (puede ser el mismo con talla/color diferente)
4. Calcular la diferencia de precio y cobrar o devolver el saldo
5. Registrar el canje como una operación contable vinculada a la venta original

En `nm-frontend-v2`, `SalesListComponent` y `SaleService` NO tienen ninguna referencia a
exchange/canje. Esta funcionalidad está completamente ausente.

---

## Tarea

Implementa la funcionalidad completa de **Canje / Cambio** dentro del feature `finances/sales`.

---

## Estructura a crear

```
src/app/features/finances/sales/components/
└── sale-exchange/
    ├── sale-exchange.component.ts
    ├── sale-exchange.component.html
    └── sale-exchange.component.scss
```

Y dentro de `data-access/`:
```
src/app/features/finances/sales/data-access/
├── sale-exchange.service.ts     ← nuevo servicio
└── sale-exchange.adapter.ts     ← nuevo adapter
```

---

## Modelo (`sale.model.ts` — agregar interfaces)

```ts
export interface ExchangeItem {
  saleItemId: number;
  productId: number;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ExchangeNewItem {
  variantId: number;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ExchangePreview {
  originalItems: ExchangeItem[];
  newItems: ExchangeNewItem[];
  originalTotal: number;
  newTotal: number;
  difference: number;   // positivo = cliente paga más, negativo = se devuelve dinero
}

export interface ExchangePayload {
  saleId: number;
  returnItems: { saleItemId: number; quantity: number }[];
  newItems: { variantId: number; quantity: number }[];
  paymentMethod: 'cash' | 'yape' | 'card' | null;  // null si no hay diferencia
  amountPaid: number;
}

export interface ExchangeResponse {
  exchangeId: number;
  newSaleId: number | null;
  refundAmount: number;
  message: string;
}
```

---

## Servicio (`sale-exchange.service.ts`)

- Decorado con `@Service`
- `previewExchange(payload: Omit<ExchangePayload, 'paymentMethod' | 'amountPaid'>): Observable<ExchangePreview>`
  → POST `/api/sales/exchange/preview`
- `confirmExchange(payload: ExchangePayload): Observable<ExchangeResponse>`
  → POST `/api/sales/exchange`
- `searchVariantsForExchange(query: string, warehouseId: number): Observable<ExchangeNewItem[]>`
  → GET `/api/sales/exchange/variants?q={query}&warehouse={warehouseId}`

---

## Componente `SaleExchangeComponent`

Es un **dialog/drawer** que se abre desde el botón "Canje" en la fila de la tabla de ventas.

### Señales

```ts
saleId = input.required<number>();
close = output<void>();
exchangeCompleted = output<ExchangeResponse>();

step = signal<'select-return' | 'select-new' | 'confirm'>('select-return');
originalItems = signal<ExchangeItem[]>([]);
returnSelection = signal<Map<number, number>>(new Map()); // saleItemId → quantity
newItems = signal<ExchangeNewItem[]>([]);
preview = signal<ExchangePreview | null>(null);
isLoadingPreview = signal(false);
isConfirming = signal(false);
searchQuery = signal('');
searchResults = signal<ExchangeNewItem[]>([]);
```

### Flujo en 3 pasos

**Paso 1 — Seleccionar items a devolver**
- Carga los items de la venta original
- Lista los items con checkboxes y campo de cantidad (1 hasta la cantidad original)
- Botón "Siguiente" habilita cuando al menos 1 item está seleccionado

**Paso 2 — Seleccionar items nuevos**
- Buscador de variantes (SKU / nombre de producto)
- Resultados muestran foto thumbnail, nombre, talla, color y precio
- Agregar items a la lista de canje
- Control de cantidad por item añadido
- Botón "Ver resumen" llama a `previewExchange()` y avanza al paso 3

**Paso 3 — Confirmar canje**
- Tabla comparativa: items que devuelve vs items que lleva
- Total devuelto vs total nuevo
- Si `difference > 0`: muestra campo "Cobrar diferencia" con selector de método de pago
- Si `difference < 0`: muestra "Diferencia a devolver: S/ X.XX"
- Si `difference === 0`: "Sin diferencia de precio"
- Botón "Confirmar canje" llama a `confirmExchange()`
- Al completar: emite `exchangeCompleted` y cierra el dialog

---

## Integración en `SalesListComponent`

1. Agrega botón "Canje" en los actions de cada fila de la tabla (icono swap/exchange)
   - Visible solo si la venta tiene `status === 'completed'`
   - Requiere permiso `sale.exchange` (o `sale.update` si no existe uno específico)
2. Abre `SaleExchangeComponent` en un panel lateral/drawer pasando el `saleId`
3. Al recibir `exchangeCompleted`, recarga la tabla y muestra toast de éxito

---

## Estilos

- Tailwind en todos los componentes (son `features/`)
- El stepper de pasos usa indicadores visuales numéricos simples
- El paso activo resaltado con color primario del tema
- La tabla comparativa del paso 3 usa fondo `bg-red-50` para devueltos y `bg-green-50` para nuevos
- Responsive: el drawer ocupa 100% del ancho en mobile, 60% en desktop
