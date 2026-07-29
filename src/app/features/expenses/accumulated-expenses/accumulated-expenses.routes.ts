import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Egresos Cuenta Acumulada',
    data: {
      breadcrumb: 'Egresos Cuenta Acumulada',
      permission: 'cashflow.getAccumulatedExpensesReport',
    },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/accumulated-expenses/accumulated-expenses.component').then(
        (m) => m.AccumulatedExpensesComponent,
      ),
  },
];

export default routes;
