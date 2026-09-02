import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Colecciones del home',
    data: {
      breadcrumb: 'Colecciones del home',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import(
        './components/store-home-collections-config/store-home-collections-config.component'
      ).then((m) => m.StoreHomeCollectionsConfigComponent),
  },
];

export default routes;
