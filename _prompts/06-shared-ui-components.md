# PROMPT 06 — Componentes Shared UI Faltantes

## Contexto

`nm-frontend` (legacy) tiene un `SharedModule` con ~20 componentes de formulario reutilizables.
`nm-frontend-v2` tiene `shared/ui/` con ~14 componentes, pero le faltan los siguientes:

| Componente legacy | Equivalente en v2 | Estado |
|---|---|---|
| `input-multi-select` | ❌ No existe | **FALTA** |
| `input-autocomplete-api` | ❌ No existe | **FALTA** |
| `input-chips-api` | ❌ No existe | **FALTA** |
| `input-phone` | ❌ No existe | **FALTA** |
| `input-radio` | ❌ No existe | **FALTA** |
| `input-checkbox` | ❌ No existe | **FALTA** |
| `input-color-picker` | ❌ No existe | **FALTA** |
| `input-textarea` | ❌ No existe | **FALTA** |
| `tab-view` | ❌ No existe | **FALTA** |
| `upload-excel` | ❌ No existe (solo `file-dropzone` genérico) | **FALTA** |

Estos componentes son **Dumb components puros** que van en `shared/ui/`. Usan clases semánticas
en HTML y estilos con `@apply` en SCSS. No inyectan servicios de negocio.

---

## Reglas para todos los componentes

1. Están en `src/app/shared/ui/`
2. Usan `input()` y `output()` (no `@Input`/`@Output`)
3. Usan `inject()` (no constructores)
4. HTML con clases semánticas. Toda lógica visual en SCSS con `@apply`
5. Accesibilidad WCAG AA: `aria-label`, `aria-describedby`, `role`, foco de teclado
6. TypeScript strict, sin `any`
7. Sin `standalone: true` explícito ni `changeDetection: OnPush` explícito

---

## 1. `MultiSelectComponent` (`shared/ui/multi-select/`)

### API
```ts
options = input.required<{ value: unknown; label: string }[]>();
value = input<unknown[]>([]);
placeholder = input('Seleccionar...');
label = input('');
disabled = input(false);
errorMessage = input('');
valueChange = output<unknown[]>();
```

### Comportamiento
- Dropdown con checkbox por opción
- Muestra las seleccionadas como chips removibles dentro del trigger
- Búsqueda/filtro dentro del dropdown
- Cierra al hacer click fuera (usando `@HostListener` en el `host:` del decorador)
- Soporte de teclado: flechas, espacio, escape

---

## 2. `AutocompleteApiComponent` (`shared/ui/autocomplete-api/`)

### API
```ts
placeholder = input('Buscar...');
label = input('');
minChars = input(2);
debounceMs = input(300);
displayFn = input<(item: unknown) => string>(item => String(item));
disabled = input(false);
errorMessage = input('');
search = output<string>();         // emite el texto de búsqueda (debounced)
selected = output<unknown>();      // emite el item seleccionado
cleared = output<void>();
options = input<unknown[]>([]);
isLoading = input(false);
```

### Comportamiento
- Input de texto con debounce que emite `search`
- Dropdown de resultados que aparece cuando `options` tiene items
- Loading spinner cuando `isLoading = true`
- Botón X para limpiar
- Al seleccionar: rellena el input con `displayFn(item)` y emite `selected`
- Mensaje "Sin resultados" cuando `options.length === 0` y no está cargando

---

## 3. `ChipsApiComponent` (`shared/ui/chips-api/`)

Similar a `AutocompleteApiComponent` pero permite seleccionar múltiples items que se muestran como chips.

### API
```ts
placeholder = input('Agregar...');
label = input('');
minChars = input(2);
debounceMs = input(300);
displayFn = input<(item: unknown) => string>(item => String(item));
disabled = input(false);
errorMessage = input('');
search = output<string>();
selected = output<unknown>();
removed = output<unknown>();
items = input<unknown[]>([]);       // items ya seleccionados (chips mostrados)
options = input<unknown[]>([]);
isLoading = input(false);
```

### Comportamiento
- Área de chips + input de búsqueda al final
- Los chips tienen botón X para remover (emite `removed`)
- Al seleccionar de dropdown: emite `selected` (el padre agrega a `items`)
- Soporte de teclado: Backspace elimina el último chip cuando el input está vacío

---

## 4. `PhoneInputComponent` (`shared/ui/phone-input/`)

### API
```ts
value = input('');
label = input('Teléfono');
placeholder = input('999 999 999');
required = input(false);
disabled = input(false);
errorMessage = input('');
valueChange = output<string>();
```

### Comportamiento
- Prefijo `+51` fijo (Perú) mostrado como texto no editable a la izquierda
- Input numérico que acepta solo dígitos
- Formatea automáticamente como `XXX XXX XXX` mientras escribe
- Valida longitud mínima (9 dígitos para Perú)

---

## 5. `RadioGroupComponent` (`shared/ui/radio-group/`)

### API
```ts
options = input.required<{ value: unknown; label: string; disabled?: boolean }[]>();
value = input<unknown>(null);
label = input('');
name = input.required<string>();
orientation = input<'horizontal' | 'vertical'>('vertical');
disabled = input(false);
errorMessage = input('');
valueChange = output<unknown>();
```

### Comportamiento
- Grupo de radio buttons nativos (`<input type="radio">`)
- Orientación horizontal o vertical
- Cada opción tiene su propio estado disabled
- Accesible: `role="radiogroup"`, `aria-labelledby`

---

## 6. `CheckboxComponent` (`shared/ui/checkbox/`)

### API
```ts
value = input(false);
label = input('');
indeterminate = input(false);
disabled = input(false);
errorMessage = input('');
valueChange = output<boolean>();
```

### Comportamiento
- Checkbox nativo estilizado con Tailwind vía `@apply`
- Soporte de estado `indeterminate` (para select-all en tablas)
- Label clickeable
- Estado de error con borde rojo y mensaje

---

## 7. `ColorPickerInputComponent` (`shared/ui/color-picker-input/`)

### API
```ts
value = input('#000000');
label = input('Color');
disabled = input(false);
errorMessage = input('');
valueChange = output<string>();
```

### Comportamiento
- Input de color nativo (`<input type="color">`) con preview circular del color seleccionado
- Campo de texto editable con el valor hexadecimal
- Sincronización bidireccional: cambiar el picker actualiza el texto y viceversa
- Validación del formato hex (`#RRGGBB`)

---

## 8. `TextareaComponent` (`shared/ui/textarea/`)

### API
```ts
value = input('');
label = input('');
placeholder = input('');
rows = input(3);
maxLength = input<number | null>(null);
required = input(false);
disabled = input(false);
errorMessage = input('');
hint = input('');
valueChange = output<string>();
```

### Comportamiento
- `<textarea>` nativo estilizado
- Contador de caracteres si `maxLength` está definido (`X / maxLength`)
- Auto-resize opcional (`resize: none` por defecto)
- Estados: default, focus, error, disabled — todos con estilos SCSS `@apply`

---

## 9. `TabViewComponent` (`shared/ui/tab-view/`)

### API
```ts
tabs = input.required<{ id: string; label: string; disabled?: boolean; badge?: string | number }[]>();
activeTab = input<string>('');
activeTabChange = output<string>();
```

### Comportamiento
- Barra de tabs horizontal
- El contenido de cada tab es proyectado con `<ng-content select="[tab-id]">`
- O alternativamente usa un patrón de `TabPanelDirective`
- Indicador visual de tab activa (borde inferior coloreado)
- Soporte de teclado: flechas izquierda/derecha navegan entre tabs, Enter/Espacio activan
- Accesible: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`

---

## 10. `ExcelUploadComponent` (`shared/ui/excel-upload/`)

### API
```ts
label = input('Subir archivo Excel');
accept = input('.xlsx,.xls,.csv');
maxSizeMb = input(10);
disabled = input(false);
errorMessage = input('');
fileSelected = output<File>();
```

### Comportamiento
- Zona de drag-and-drop + botón de click para seleccionar
- Ícono de hoja de cálculo (tabla) cuando no hay archivo
- Preview del nombre del archivo seleccionado con su tamaño en KB/MB
- Validación de tipo de archivo (solo acepta los de `accept`)
- Validación de tamaño máximo
- Botón para remover el archivo seleccionado
- Muestra error si el archivo no cumple las validaciones

---

## Orden de implementación recomendado

1. `TextareaComponent` (más sencillo, base para otros)
2. `CheckboxComponent`
3. `RadioGroupComponent`
4. `PhoneInputComponent`
5. `ColorPickerInputComponent`
6. `TabViewComponent`
7. `ExcelUploadComponent`
8. `MultiSelectComponent`
9. `AutocompleteApiComponent`
10. `ChipsApiComponent`

---

## Notas de accesibilidad para todos

- Cada input debe tener un `id` único generado con `crypto.randomUUID()` en el `ngOnInit` equivalente
- El label debe usar `[for]="inputId"` para conectarse con el input
- Los mensajes de error deben tener `id` y el input debe tener `aria-describedby` apuntando a él
- El estado de error se comunica también con `aria-invalid="true"` en el input
