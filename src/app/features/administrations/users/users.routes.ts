import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Usuarios',
    data: { breadcrumb: 'Usuarios', permission: 'user.getAll' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/users-list/users-list.component').then(
        (m) => m.UsersListComponent,
      ),
  },
];

export default routes;
