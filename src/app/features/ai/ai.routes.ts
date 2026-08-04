import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Asistente IA',
    data: {
      breadcrumb: 'Asistente IA',
      permissions: ['product.get', 'product.getAll'],
    },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import(
        './components/ai-insights-dashboard/ai-insights-dashboard.component'
      ).then((m) => m.AiInsightsDashboardComponent),
  },
];

export default routes;
