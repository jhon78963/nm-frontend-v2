import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Servicios del home',
    data: {
      breadcrumb: 'Servicios del home',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./components/store-home-services-config/store-home-services-config.component').then(
        (m) => m.StoreHomeServicesConfigComponent,
      ),
  },
];

export default routes;
