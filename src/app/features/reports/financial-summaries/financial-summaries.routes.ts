import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Resumen Financiero',
    data: {
      breadcrumb: 'Resumen Financiero',
      permission: 'financialSummary.getSummary',
    },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import(
        './components/financial-summary-dashboard/financial-summary-dashboard.component'
      ).then((m) => m.FinancialSummaryDashboardComponent),
  },
];

export default routes;
