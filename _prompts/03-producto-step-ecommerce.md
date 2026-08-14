# PROMPT 03 — Paso "Ecommerce" en el Stepper de Productos

## Contexto

En `nm-frontend` (legacy), el stepper de creación/edición de productos tiene 5 pasos:
`general → sizes → colors → ecommerce → history`.

El paso `ecommerce` en legacy (`step/ecommerce/:id`) permite:
1. Ver y editar la configuración de publicación del producto en WooCommerce
2. Ver el estado de sincronización (sincronizado / pendiente / error)
3. Publicar / actualizar el producto en WooCommerce desde dentro del stepper
4. Gestionar las variantes (tallas + colores) para publicación
5. Ver la URL del producto en WooCommerce si ya fue publicado

En `nm-frontend-v2`, el `ProductStepperComponent` actualmente tiene los pasos:
`general → sizes → colors → kardex → history`.
El paso `ecommerce` fue omitido, dejando un gap funcional importante porque los usuarios
deben ir a `/ecommerce/products` por separado para publicar, cuando en legacy se hacía
desde el stepper.

---

## Tarea

Agrega el paso **Ecommerce** al stepper de productos de `nm-frontend-v2`, entre `colors` y `kardex`.

---

## Archivos a modificar / crear

### Crear
```
src/app/features/inventories/products/components/
└── product-ecommerce-step/
    ├── product-ecommerce-step.component.ts
    ├── product-ecommerce-step.component.html
    └── product-ecommerce-step.component.scss
```

### Modificar
- `src/app/features/inventories/products/product-stepper.component.ts` (o el archivo que define los pasos del stepper)
- `src/app/features/inventories/inventories.routes.ts` (agregar sub-ruta del paso)

---

## Funcionalidad del paso Ecommerce

### 1. Estado de publicación

Muestra un banner con el estado actual:
- **No publicado**: ícono gris + texto "Este producto aún no ha sido publicado en la tienda online"
- **Publicado**: ícono verde + URL clickeable al producto en WooCommerce
- **Pendiente de sincronización**: ícono amarillo + botón "Sincronizar ahora"
- **Error de sincronización**: ícono rojo + mensaje del error + botón "Reintentar"

### 2. Panel de publicación

Si el producto NO está publicado, muestra un formulario con:
- Toggle "¿Publicar en tienda online?"
- Descripción breve para WooCommerce (textarea, diferente al description interno)
- Precio de venta online (puede diferir del precio de venta regular)
- Al activar el toggle y guardar → llama a `WooCommerceService.syncProduct(productId)`

### 3. Variantes publicadas

Si el producto YA está publicado:
- Tabla de variantes (talla × color) con sus precios y stock en WooCommerce
- Columna de estado de sincronización por variante
- Botón "Sincronizar todo" para refrescar todas las variantes

### 4. Galería de imágenes Woo

Muestra las imágenes actuales del producto que están publicadas en WooCommerce
con opción de reordenar (drag simple) y eliminar.

---

## Integración con servicios existentes

Reutiliza los servicios ya existentes en `features/ecommerce/data-access/`:
- `WooCommerceService` → para sync y estado
- `PublishProductService` → para buscar/crear el producto en Woo
- `PublishVariantService` → para las variantes
- `ProductMediaService` → para las imágenes

El paso solo añade una capa de presentación dentro del stepper, sin duplicar lógica.

---

## Modelo adicional (`publish-product.model.ts`)

Agrega si no existe:
```ts
export interface EcommerceStepState {
  isPublished: boolean;
  wooProductId: number | null;
  wooUrl: string | null;
  syncStatus: 'synced' | 'pending' | 'error' | 'never';
  lastSyncError: string | null;
  lastSyncedAt: string | null;
}
```

---

## Señales del componente

```ts
productId = input.required<number>();
ecommerceState = signal<EcommerceStepState | null>(null);
isLoading = signal(false);
isSyncing = signal(false);
isPublished = computed(() => this.ecommerceState()?.isPublished ?? false);
syncStatus = computed(() => this.ecommerceState()?.syncStatus ?? 'never');
```

---

## Actualización del stepper

Modifica `ProductStepperComponent` para que los pasos sean en este orden:
```
1. General
2. Tallas
3. Colores
4. Ecommerce  ← nuevo, entre Colores y Kardex
5. Kardex
6. Historial
```

El paso Ecommerce solo se muestra si el producto tiene `id` (modo edición), no en el flujo
de creación inicial (cuando aún no hay `:id`).

---

## Ruta a agregar en `inventories.routes.ts`

Dentro del bloque de hijos de `products/:id`:
```ts
{
  path: 'ecommerce',
  loadComponent: () =>
    import('./products/components/product-ecommerce-step/product-ecommerce-step.component')
      .then(m => m.ProductEcommerceStepComponent),
  data: { breadcrumb: 'Ecommerce' }
}
```

---

## Estilos

- Tailwind en el componente (es un componente de `features/`)
- El banner de estado usa colores semánticos: `bg-green-50 border-green-200`, `bg-yellow-50`, etc.
- La tabla de variantes es responsiva (scroll horizontal en mobile)
