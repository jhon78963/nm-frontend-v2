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
      import('./components/ecommerce-customers-placeholder/ecommerce-customers-placeholder.component').then(
        (m) => m.EcommerceCustomersPlaceholderComponent,
      ),
  },
];

export default routes;
