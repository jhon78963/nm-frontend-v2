# PROMPT 01 — Página de Perfil de Usuario

## Contexto

El frontend legacy (`nm-frontend`) tiene una página `/profile` accesible desde el menú superior
autenticado. En `nm-frontend-v2` esta página no existe: la ruta `/profile` no está definida en
ningún archivo de rutas y el `MainLayoutComponent` no tiene enlace a ella.

La información del usuario autenticado ya se expone desde `AuthService` (signal `currentUser`).

---

## Tarea

Crea la funcionalidad completa de **Perfil de Usuario** dentro del dominio `features/profile/`
siguiendo la arquitectura DDD del proyecto.

---

## Estructura a crear

```
src/app/features/profile/
├── components/
│   └── avatar-upload/
│       ├── avatar-upload.component.ts
│       └── avatar-upload.component.scss
├── data-access/
│   ├── profile.service.ts
│   └── profile.adapter.ts
├── models/
│   └── profile.model.ts
├── profile.component.ts
├── profile.component.html
├── profile.component.scss
└── profile.routes.ts
```

---

## Modelo (`profile.model.ts`)

```ts
export interface ProfileData {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  warehouse: string;
  createdAt: string;
}

export interface UpdateProfilePayload {
  name: string;
  email: string;
  phone: string | null;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}
```

---

## Servicio (`profile.service.ts`)

- Decorado con `@Service` (NO `@Injectable({providedIn: 'root'})`)
- Métodos:
  - `getProfile(): Observable<ProfileData>` → GET `/api/profile`
  - `updateProfile(payload: UpdateProfilePayload): Observable<ProfileData>` → PUT `/api/profile`
  - `updatePassword(payload: UpdatePasswordPayload): Observable<void>` → PUT `/api/profile/password`
  - `uploadAvatar(file: File): Observable<{ avatarUrl: string }>` → POST `/api/profile/avatar` (multipart)

---

## Adapter (`profile.adapter.ts`)

Crea la función `adaptProfile(raw: unknown): ProfileData` que mapea el JSON crudo del backend.

---

## Componente principal (`profile.component.ts`)

Vista dividida en dos secciones (tabs o cards laterales):

### Sección 1 — Información personal
- Avatar circular con botón de cámara para subir imagen (usa `AvatarUploadComponent`)
- Campos editables: Nombre, Email, Teléfono
- Campos solo lectura: Rol, Almacén, Fecha de registro
- Formulario con **Signal Forms** (`@angular/forms/signals`)
- Botón "Guardar cambios" con estado de loading

### Sección 2 — Cambiar contraseña
- Campos: Contraseña actual, Nueva contraseña, Confirmar nueva contraseña
- Validación: mínimo 8 caracteres, las dos nuevas deben coincidir
- Formulario con **Signal Forms**
- Botón "Actualizar contraseña" con estado de loading

---

## Sub-componente `AvatarUploadComponent`

- `input()` → `avatarUrl: string | null`
- `output()` → `fileSelected: OutputEmitterRef<File>`
- Muestra imagen circular con las iniciales del nombre si no hay avatar
- Click abre un `<input type="file" accept="image/*">` oculto
- Preview inmediato de la imagen seleccionada antes de subir

---

## Rutas (`profile.routes.ts`)

```ts
export const profileRoutes: Routes = [
  {
    path: '',
    component: ProfileComponent,
    canActivate: [authGuard],
    data: { breadcrumb: 'Mi Perfil' }
  }
];
```

---

## Registro en `app.routes.ts`

Agrega la ruta lazy dentro del bloque del `MainLayout`:

```ts
{
  path: 'profile',
  loadChildren: () =>
    import('./features/profile/profile.routes').then(m => m.profileRoutes)
}
```

---

## Enlace en `MainLayoutComponent`

En el menú de usuario (dropdown del avatar en el topbar), agrega un enlace `[routerLink]="['/profile']"` con ícono de usuario y texto "Mi perfil".

---

## Estilos

- Usa Tailwind directamente en el HTML del componente smart (profile.component)
- `AvatarUploadComponent` pertenece a `features/profile/components/` (no a `shared/ui/`), puede usar SCSS inline
- Diseño responsive: en mobile una columna, en desktop dos columnas lado a lado

---

## Validaciones de accesibilidad (WCAG AA)

- El botón de upload del avatar debe tener `aria-label="Cambiar foto de perfil"`
- Los inputs del formulario deben tener `id` y `<label [for]="...">` asociados
- El estado de error de validación debe usar `aria-describedby` apuntando al mensaje de error
