import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Gastos Administrativos',
    data: {
      breadcrumb: 'Gastos Administrativos',
      permission: 'cashflow.getAdminMonthlyReport',
    },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/admin-expenses/admin-expenses.component').then(
        (m) => m.AdminExpensesComponent,
      ),
  },
];

export default routes;
