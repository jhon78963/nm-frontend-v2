import { Routes } from '@angular/router';
import { createPlaceholderRoute } from '../../core/routing/feature-placeholder.component';

const routes: Routes = [
  {
    path: 'roles',
    data: { breadcrumb: 'Roles y permisos' },
    loadChildren: () =>
      import('./roles/roles.routes'),
  },
  {
    path: 'users',
    data: { breadcrumb: 'Usuarios' },
    loadChildren: () =>
      import('./users/users.routes'),
  },
  createPlaceholderRoute('Clientes', 'tenants'),
  createPlaceholderRoute('Tiendas', 'warehouses'),
  createPlaceholderRoute('Historial', 'action-logs'),
  { path: '', redirectTo: 'roles', pathMatch: 'full' },
];

export default routes;
