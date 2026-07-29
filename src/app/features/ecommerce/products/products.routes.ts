import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Publicar productos',
    data: {
      breadcrumb: 'Publicar productos',
      permissions: ['product.update', 'product.create'],
    },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/products-publish/products-publish.component').then(
        (m) => m.ProductsPublishComponent,
      ),
  },
];

export default routes;
