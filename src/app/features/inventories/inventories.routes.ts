import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'products',
    data: { breadcrumb: 'Productos' },
    loadChildren: () => import('../inventory/products/products.routes'),
  },
  {
    path: 'sizes',
    data: { breadcrumb: 'Tallas' },
    loadChildren: () => import('../inventory/sizes/sizes.routes'),
  },
  {
    path: 'colors',
    data: { breadcrumb: 'Colores' },
    loadChildren: () => import('../inventory/colors/colors.routes'),
  },
  {
    path: 'reconciliation',
    data: { breadcrumb: 'Actualizar inventario' },
    loadChildren: () => import('../inventory/reconciliation/reconciliation.routes'),
  },
  {
    path: 'purchase',
    data: { breadcrumb: 'Compras' },
    loadChildren: () => import('../inventory/purchase/purchase.routes'),
  },
  { path: '', redirectTo: 'products', pathMatch: 'full' },
];

export default routes;
