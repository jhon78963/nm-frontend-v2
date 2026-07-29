import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Control de Caja',
    data: {
      breadcrumb: 'Control de Caja',
      permission: 'cashflow.getDaily',
    },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/cash-register/cash-register.component').then(
        (m) => m.CashRegisterComponent,
      ),
  },
];

export default routes;
