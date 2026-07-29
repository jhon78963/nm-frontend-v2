import { Routes } from '@angular/router';
import { createPlaceholderRoute } from '../../core/routing/feature-placeholder.component';

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
    children: [
      createPlaceholderRoute('Compras', ''),
      createPlaceholderRoute('Nueva compra', 'register'),
    ],
  },
  { path: '', redirectTo: 'products', pathMatch: 'full' },
];

export default routes;
