import { Routes } from '@angular/router';
import { createPlaceholderRoute } from '../../core/routing/feature-placeholder.component';

const routes: Routes = [
  createPlaceholderRoute('Productos', 'products'),
  createPlaceholderRoute('Tallas', 'sizes'),
  createPlaceholderRoute('Colores', 'colors'),
  createPlaceholderRoute('Actualizar inventario', 'reconciliation'),
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
