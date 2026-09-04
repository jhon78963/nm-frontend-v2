import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Cupones',
    data: {
      breadcrumb: 'Cupones',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./components/ecommerce-coupons-page/ecommerce-coupons-page.component').then(
        (m) => m.EcommerceCouponsPageComponent,
      ),
  },
];

export default routes;
