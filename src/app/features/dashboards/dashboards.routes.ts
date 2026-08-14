import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';
import { DashboardHomeComponent } from './dashboard-home.component';

export const dashboardsRoutes: Routes = [
  {
    path: '',
    title: 'Inicio',
    component: DashboardHomeComponent,
    canActivate: [authGuard],
    data: { breadcrumb: 'Inicio' },
  },
];
