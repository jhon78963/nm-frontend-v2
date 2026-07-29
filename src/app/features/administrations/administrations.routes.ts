import { Routes } from '@angular/router';

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
  {
    path: 'action-logs',
    data: { breadcrumb: 'Historial' },
    loadChildren: () => import('./action-logs/action-logs.routes'),
  },
  { path: '', redirectTo: 'roles', pathMatch: 'full' },
];

export default routes;
