import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Banners',
    data: {
      breadcrumb: 'Banners',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./components/store-home-banners-config/store-home-banners-config.component').then(
        (m) => m.StoreHomeBannersConfigComponent,
      ),
  },
];

export default routes;
