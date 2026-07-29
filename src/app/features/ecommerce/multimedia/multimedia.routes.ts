import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Multimedia',
    data: {
      breadcrumb: 'Multimedia',
      permission: 'product.update',
    },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/product-multimedia/product-multimedia.component').then(
        (m) => m.ProductMultimediaComponent,
      ),
  },
];

export default routes;
