import { Routes } from '@angular/router';
import { permissionGuard } from '../../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Ventas',
    data: {
      breadcrumb: 'Ventas',
      permissions: ['sale.getAll', 'sale.get'],
    },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/sales-list/sales-list.component').then(
        (m) => m.SalesListComponent,
      ),
  },
];

export default routes;
