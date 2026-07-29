# Módulo de Productos - Inventory

Este módulo implementa la gestión completa de productos siguiendo la arquitectura DDD (Domain-Driven Design) definida en el proyecto.

## Estructura del Módulo

```
products/
├── components/           # Componentes smart de presentación
│   ├── products-list/   # Lista principal de productos
│   ├── product-form/    # Formulario de creación/edición
│   ├── product-form-wrapper/ # Wrapper para integración con stepper
│   ├── product-stepper/ # Navegación multi-paso
│   ├── product-sizes/   # Gestión de tallas
│   ├── product-colors/  # Gestión de colores
│   ├── product-ecommerce/ # Configuración ecommerce
│   └── product-history/ # Historial de cambios
├── data-access/         # Servicios y adapters
│   ├── product.service.ts
│   ├── product-sizes.service.ts
│   ├── product-colors.service.ts
│   ├── product-lookup.service.ts
│   └── product.adapter.ts
├── models/              # Interfaces y tipos
│   └── product.model.ts
└── products.routes.ts   # Configuración de rutas
```

## Rutas Disponibles

- `/inventories/products` - Lista de productos
- `/inventories/products/new` - Crear nuevo producto
- `/inventories/products/:id/general` - Editar información general
- `/inventories/products/:id/sizes` - Gestionar tallas
- `/inventories/products/:id/colors` - Gestionar colores
- `/inventories/products/:id/ecommerce` - Configurar ecommerce
- `/inventories/products/:id/history` - Ver historial

## Características Implementadas

### ✅ Lista de Productos (products-list)
- Búsqueda en tiempo real con debounce
- Filtrado por género
- Paginación completa
- Exportación e importación de Excel
- UI moderna con Tailwind CSS
- Actions: Editar, Tallas, Colores, Ecommerce, Kardex, Historial, Eliminar
- Confirmación de eliminación con diálogo
- Estado vacío personalizado
- Loading states y error handling

### ✅ Formulario de Producto (product-form)
- Signal Forms con validación
- Campos: Nombre, Género, Almacén
- Carga de datos para edición
- Integración con stepper
- Loading y error states
- Validación en tiempo real

### ✅ Stepper Multi-paso (product-stepper)
- Navegación visual entre pasos
- Indicadores de progreso
- Botones anterior/siguiente
- Deshabilita pasos no disponibles
- Responsive design

### 🚧 Componentes Placeholder
Los siguientes componentes tienen la estructura base y pueden expandirse:
- Gestión de tallas (product-sizes)
- Gestión de colores (product-colors)
- Configuración ecommerce (product-ecommerce)
- Historial de cambios (product-history)

## Servicios

### ProductService
Maneja operaciones CRUD de productos:
- `getAll()` - Lista paginada con filtros
- `getOne()` - Obtener producto por ID
- `create()` - Crear nuevo producto
- `update()` - Actualizar producto
- `delete()` - Eliminar producto
- `exportToExcel()` - Exportar productos
- `importFromExcel()` - Importar productos
- `getHistory()` - Obtener historial

### ProductSizesService
Gestión de tallas de productos:
- `getSizes()` - Obtener tallas
- `add()` - Agregar talla
- `update()` - Actualizar talla
- `remove()` - Eliminar talla

### ProductColorsService
Gestión de colores de productos:
- `getColors()` - Obtener colores
- `add()` - Agregar color
- `update()` - Actualizar color
- `remove()` - Eliminar color

### ProductLookupService
Servicios de lookup para catálogos:
- `getGenders()` - Obtener géneros
- `getWarehouses()` - Obtener almacenes
- `getSizeTypes()` - Obtener tipos de talla

## Adaptadores

Todos los datos del backend pasan por adaptadores que:
- Normalizan nombres de propiedades (camelCase)
- Validan tipos de datos
- Proveen valores por defecto
- Aseguran type-safety

## Mejoras de UI/UX

### Diseño Moderno
- Tailwind CSS para layouts
- SCSS para componentes UI
- Colores sky theme (sky-600, sky-700, etc.)
- Sombras y bordes suaves
- Transiciones fluidas

### Iconografía
- SVG icons nativos de Heroicons
- Iconos semánticos para cada acción
- Estados visuales claros

### Responsive Design
- Mobile-first approach
- Flex y Grid layouts
- Breakpoints md: y superiores
- Adaptación de botones y filtros

### Estados de Carga
- Spinners con animación
- Skeleton screens donde aplique
- Feedback visual inmediato
- Estados vacíos descriptivos

### Accesibilidad
- ARIA labels
- Focus visible
- Keyboard navigation
- Mensajes descriptivos

## Patrón de Arquitectura

### Signals
- Estado reactivo con Angular Signals
- Computed values para datos derivados
- Actualizaciones eficientes con `.set()` y `.update()`

### Signal Forms
- Formularios tipados
- Validación declarativa
- Integración con signals
- Mensajes de error contextuales

### Inyección de Dependencias
- Uso de `inject()` en lugar de constructor
- Services con decorador `@Service()`
- Scoped a nivel de componente cuando necesario

### Clean Architecture
- Separación clara de responsabilidades
- Domain models independientes
- Services enfocados en data-access
- Components solo de presentación

## Próximos Pasos

Para completar la implementación:

1. **Expandir gestión de tallas**
   - Tabla editable
   - CRUD completo
   - Filtros por tipo de talla
   - Bulk operations

2. **Expandir gestión de colores**
   - Selector de colores
   - Asignación por talla
   - Control de stock
   - Visualización de variantes

3. **Implementar configuración ecommerce**
   - Sincronización WooCommerce
   - Campos SEO
   - Galería de imágenes
   - Featured/On Sale toggles

4. **Implementar historial**
   - Timeline de cambios
   - Detalles de modificaciones
   - Usuario y fecha
   - Filtros temporales

## Notas de Desarrollo

- El código sigue estrictamente las reglas definidas en `.cursorrules`
- No se usan decoradores legacy (`@Input`, `@Output`, etc.)
- ChangeDetection OnPush es por defecto
- Standalone components únicamente
- Prohibido usar `any`, solo `unknown` cuando sea necesario
- Control flow moderno (`@if`, `@for`, `@switch`)
- Validación A11y con estándares WCAG AA

## Testing

Para probar el módulo:

1. Iniciar el servidor de desarrollo:
   ```bash
   cd nm-frontend-v2
   npm start
   ```

2. Navegar a: `http://localhost:4200/inventories/products`

3. Verificar:
   - Lista de productos carga correctamente
   - Búsqueda funciona con debounce
   - Crear nuevo producto navega al stepper
   - Editar producto carga datos correctamente
   - Exportar/Importar Excel funcionan
   - Eliminación requiere confirmación
