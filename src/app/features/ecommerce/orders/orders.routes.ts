import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Pedidos web',
    data: {
      breadcrumb: 'Pedidos web',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./components/ecommerce-orders-list/ecommerce-orders-list.component').then(
        (m) => m.EcommerceOrdersListComponent,
      ),
  },
  {
    path: ':id',
    title: 'Detalle de pedido',
    data: {
      breadcrumb: 'Detalle de pedido',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./components/ecommerce-order-detail/ecommerce-order-detail.component').then(
        (m) => m.EcommerceOrderDetailComponent,
      ),
  },
];

export default routes;
