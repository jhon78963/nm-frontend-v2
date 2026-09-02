import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Footer',
    data: {
      breadcrumb: 'Footer',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./components/store-footer-config/store-footer-config.component').then(
        (m) => m.StoreFooterConfigComponent,
      ),
  },
];

export default routes;
