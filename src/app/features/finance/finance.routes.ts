import { Routes } from '@angular/router';

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
    loadChildren: () => import('./cash-movements/cash-movements.routes'),
  },
  { path: '', redirectTo: 'sales', pathMatch: 'full' },
];

export default routes;
