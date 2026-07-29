import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'pos',
    title: 'Punto de Venta',
    data: { breadcrumb: 'POS' },
    loadChildren: () => import('./pos/pos.routes'),
  },
  {
    path: '',
    title: 'Ventas',
    data: { breadcrumb: 'Ventas' },
    loadChildren: () => import('./list/list.routes'),
  },
];

export default routes;
