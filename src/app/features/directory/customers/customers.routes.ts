import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Clientes',
    data: { breadcrumb: 'Clientes', permission: 'customer.getAll' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/customers-list/customers-list.component').then(
        (m) => m.CustomersListComponent,
      ),
  },
];

export default routes;
