import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/products-list/products-list.component').then(
        (m) => m.ProductsListComponent,
      ),
    data: { breadcrumb: 'Productos' },
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./components/product-stepper/product-stepper.component').then(
        (m) => m.ProductStepperComponent,
      ),
    data: { breadcrumb: 'Nuevo Producto' },
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
    path: ':id',
    loadComponent: () =>
      import('./components/product-stepper/product-stepper.component').then(
        (m) => m.ProductStepperComponent,
      ),
    data: { breadcrumb: 'Editar Producto' },
    children: [
      {
        path: 'general',
        loadComponent: () =>
          import('./components/product-form-wrapper/product-form-wrapper.component').then(
            (m) => m.ProductFormWrapperComponent,
          ),
        data: { breadcrumb: 'General' },
      },
      {
        path: 'sizes',
        loadComponent: () =>
          import('./components/product-sizes/product-sizes.component').then(
            (m) => m.ProductSizesComponent,
          ),
        data: { breadcrumb: 'Tallas' },
      },
      {
        path: 'colors',
        loadComponent: () =>
          import('./components/product-colors/product-colors.component').then(
            (m) => m.ProductColorsComponent,
          ),
        data: { breadcrumb: 'Colores' },
      },
      {
        path: 'ecommerce',
        loadComponent: () =>
          import('./components/product-ecommerce/product-ecommerce.component').then(
            (m) => m.ProductEcommerceComponent,
          ),
        data: { breadcrumb: 'Ecommerce' },
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./components/product-history/product-history.component').then(
            (m) => m.ProductHistoryComponent,
          ),
        data: { breadcrumb: 'Historial' },
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
