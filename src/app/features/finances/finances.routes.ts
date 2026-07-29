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
    title: 'Punto de Venta',
    data: { breadcrumb: 'POS' },
    loadChildren: () => import('./pos/pos.routes'),
  },
  {
    path: 'cash-movements',
    title: 'Caja',
    data: { breadcrumb: 'Caja' },
    loadChildren: () => import('./cash-movements/cash-movements.routes'),
  },
  // Compatibilidad
  {
    path: 'sales/pos',
    redirectTo: 'pos',
    pathMatch: 'full',
  },
  { path: '', redirectTo: 'sales', pathMatch: 'full' },
];

export default routes;
