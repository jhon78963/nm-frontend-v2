import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';
import { createPlaceholderRoute } from '../../../core/routing/feature-placeholder.component';

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
  createPlaceholderRoute('Gastos Administrativos', 'admin-expenses'),
  createPlaceholderRoute('Egresos Cuenta Acumulada', 'accumulated-expenses'),
];

export default routes;
