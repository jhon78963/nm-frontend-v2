import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { breadcrumb: 'Productos', permission: 'product.getAll' },
    loadComponent: () =>
      import('./components/products-list/products-list.component').then(
        (m) => m.ProductsListComponent,
      ),
  },
  {
    path: 'new',
    canActivate: [permissionGuard],
    data: { breadcrumb: 'Nuevo Producto', permission: 'product.create' },
    loadComponent: () =>
      import('./components/product-stepper/product-stepper.component').then(
        (m) => m.ProductStepperComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/product-form-wrapper/product-form-wrapper.component').then(
            (m) => m.ProductFormWrapperComponent,
          ),
      },
    ],
  },
  {
    path: 'edit/:id',
    redirectTo: ':id/general',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/product-stepper/product-stepper.component').then(
        (m) => m.ProductStepperComponent,
      ),
    data: { breadcrumb: 'Editar Producto' },
    children: [
      {
        path: 'general',
        canActivate: [permissionGuard],
        data: { breadcrumb: 'General', permission: 'product.get' },
        loadComponent: () =>
          import('./components/product-form-wrapper/product-form-wrapper.component').then(
            (m) => m.ProductFormWrapperComponent,
          ),
      },
      {
        path: 'sizes',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: 'Tallas',
          permissions: ['productSize.add', 'productSize.modify'],
        },
        loadComponent: () =>
          import('./components/product-sizes/product-sizes.component').then(
            (m) => m.ProductSizesComponent,
          ),
      },
      {
        path: 'colors',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: 'Colores',
          permissions: ['productSizeColor.add', 'productSizeColor.modify'],
        },
        loadComponent: () =>
          import('./components/product-colors/product-colors.component').then(
            (m) => m.ProductColorsComponent,
          ),
      },
      {
        path: 'ecommerce',
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Ecommerce', permission: 'product.update' },
        loadComponent: () =>
          import('./components/product-ecommerce-step/product-ecommerce-step.component').then(
            (m) => m.ProductEcommerceStepComponent,
          ),
      },
      {
        path: 'kardex',
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Kardex', permission: 'inventoryKardex.index' },
        loadComponent: () =>
          import('./components/product-kardex/product-kardex.component').then(
            (m) => m.ProductKardexComponent,
          ),
      },
      {
        path: 'history',
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Historial', permission: 'productHistory.index' },
        loadComponent: () =>
          import('./components/product-history/product-history.component').then(
            (m) => m.ProductHistoryComponent,
          ),
      },
      {
        path: '',
        redirectTo: 'general',
        pathMatch: 'full',
      },
    ],
  },
];

export default routes;
