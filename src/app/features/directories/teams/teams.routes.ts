import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Equipo',
    data: { breadcrumb: 'Equipo', permission: 'team.getAll' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/teams-list/teams-list.component').then(
        (m) => m.TeamsListComponent,
      ),
  },
  {
    path: 'asistencia/:teamId',
    title: 'Asistencia',
    data: {
      breadcrumb: 'Asistencia',
      permissions: ['team.getAttendanceByMonth', 'team.storeAttendance'],
    },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/team-attendance/team-attendance.component').then(
        (m) => m.TeamAttendanceComponent,
      ),
  },
  {
    path: 'pagos/:teamId',
    title: 'Pagos',
    data: {
      breadcrumb: 'Pagos',
      permission: 'team.getPaymentByMonth',
    },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/team-payroll/team-payroll.component').then(
        (m) => m.TeamPayrollComponent,
      ),
  },
];

export default routes;
