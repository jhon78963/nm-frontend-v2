import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Configuración tienda',
    data: {
      breadcrumb: 'Configuración tienda',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./components/store-header-config/store-header-config.component').then(
        (m) => m.StoreHeaderConfigComponent,
      ),
  },
];

export default routes;
