import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Punto de Venta',
    data: {
      breadcrumb: 'POS',
      permission: 'pos.checkout',
    },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./pages/pos.component').then((m) => m.PosComponent),
  },
];

export default routes;
