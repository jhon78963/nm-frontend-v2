import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Clientes',
    data: {
      breadcrumb: 'Clientes',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./components/ecommerce-customers-list/ecommerce-customers-list.component').then(
        (m) => m.EcommerceCustomersListComponent,
      ),
  },
  {
    path: ':id',
    title: 'Detalle de cliente',
    data: {
      breadcrumb: 'Detalle de cliente',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./components/ecommerce-customer-detail/ecommerce-customer-detail.component').then(
        (m) => m.EcommerceCustomerDetailComponent,
      ),
  },
];

export default routes;
