import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';
import { ProfileComponent } from './profile.component';

export const profileRoutes: Routes = [
  {
    path: '',
    title: 'Mi Perfil',
    component: ProfileComponent,
    canActivate: [authGuard],
    data: { breadcrumb: 'Mi Perfil' },
  },
];
