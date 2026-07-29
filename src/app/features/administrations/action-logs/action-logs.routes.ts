import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Historial de acciones',
    data: { breadcrumb: 'Historial', permission: 'audit.getAll' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/action-logs-list/action-logs-list.component').then(
        (m) => m.ActionLogsListComponent,
      ),
  },
];

export default routes;
