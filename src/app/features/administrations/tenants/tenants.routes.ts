import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Clientes',
    data: { breadcrumb: 'Clientes', permission: 'tenant.getAll' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/tenants-list/tenants-list.component').then(
        (m) => m.TenantsListComponent,
      ),
  },
];

export default routes;
