import { Routes } from '@angular/router';
import { createPlaceholderRoute } from '../../core/routing/feature-placeholder.component';

const routes: Routes = [
  {
    path: 'products',
    data: { breadcrumb: 'Productos' },
    loadChildren: () => import('../inventory/products/products.routes'),
  },
  createPlaceholderRoute('Tallas', 'sizes'),
  createPlaceholderRoute('Colores', 'colors'),
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
