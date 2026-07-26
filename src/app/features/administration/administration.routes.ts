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
  {
    path: 'tenants',
    data: { breadcrumb: 'Clientes' },
    loadChildren: () =>
      import('./tenants/tenants.routes'),
  },
  {
    path: 'warehouses',
    data: { breadcrumb: 'Tiendas' },
    loadChildren: () =>
      import('./warehouses/warehouses.routes'),
  },
  createPlaceholderRoute('Historial', 'action-logs'),
  { path: '', redirectTo: 'roles', pathMatch: 'full' },
];

export default routes;
