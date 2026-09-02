import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Colecciones de la tienda',
    data: {
      breadcrumb: 'Colecciones de la tienda',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import(
        './components/store-shop-collections-config/store-shop-collections-config.component'
      ).then((m) => m.StoreShopCollectionsConfigComponent),
  },
];

export default routes;
