import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Boletín',
    data: {
      breadcrumb: 'Boletín',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./components/ecommerce-newsletter-page/ecommerce-newsletter-page.component').then(
        (m) => m.EcommerceNewsletterPageComponent,
      ),
  },
];

export default routes;
