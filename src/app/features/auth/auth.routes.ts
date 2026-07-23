import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/guest.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
      {
        path: 'login',
        title: 'Iniciar sesión',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./components/login/login.component').then(
            (m) => m.LoginComponent,
          ),
      },
    ],
  },
];

export default routes;
