import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Productos por categoría',
    data: {
      breadcrumb: 'Productos por categoría',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import(
        './components/store-home-category-products-config/store-home-category-products-config.component'
      ).then((m) => m.StoreHomeCategoryProductsConfigComponent),
  },
];

export default routes;
