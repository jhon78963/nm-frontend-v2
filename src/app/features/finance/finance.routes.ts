import { Routes } from '@angular/router';
import { createPlaceholderRoute } from '../../core/routing/feature-placeholder.component';

const routes: Routes = [
  {
    path: 'sales',
    title: 'Ventas',
    data: { breadcrumb: 'Ventas' },
    loadChildren: () => import('./sales/sales.routes'),
  },
  {
    path: 'pos',
    redirectTo: 'sales/pos',
    pathMatch: 'full',
  },
  {
    path: 'cash-movements',
    data: { breadcrumb: 'Movimientos de Caja' },
    children: [
      createPlaceholderRoute('Movimientos de Caja', ''),
      createPlaceholderRoute('Gastos Administrativos', 'admin-expenses'),
      createPlaceholderRoute('Egresos Cuenta Acumulada', 'accumulated-expenses'),
    ],
  },
  { path: '', redirectTo: 'sales', pathMatch: 'full' },
];

export default routes;
