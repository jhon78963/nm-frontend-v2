import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'products',
    data: { breadcrumb: 'Productos' },
    loadChildren: () => import('./products/products.routes'),
  },
  {
    path: 'sizes',
    data: { breadcrumb: 'Tallas' },
    loadChildren: () => import('./sizes/sizes.routes'),
  },
  {
    path: 'colors',
    data: { breadcrumb: 'Colores' },
    loadChildren: () => import('./colors/colors.routes'),
  },
  {
    path: 'reconciliations',
    data: { breadcrumb: 'Actualizar inventario' },
    loadChildren: () => import('./reconciliations/reconciliations.routes'),
  },
  {
    path: 'purchases',
    data: { breadcrumb: 'Compras' },
    loadChildren: () => import('./purchases/purchases.routes'),
  },
  // Compatibilidad
  {
    path: 'reconciliation',
    redirectTo: 'reconciliations',
    pathMatch: 'prefix',
  },
  {
    path: 'purchase',
    redirectTo: 'purchases',
    pathMatch: 'prefix',
  },
  { path: '', redirectTo: 'products', pathMatch: 'full' },
];

export default routes;
