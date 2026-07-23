import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Roles y permisos',
    data: { breadcrumb: 'Roles y permisos', permission: 'role.getAll' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import(
        './components/roles-list/roles-list.component'
      ).then((m) => m.RolesListComponent),
  },
  {
    path: ':id/sync',
    title: 'Gestionar permisos',
    data: { breadcrumb: 'Gestionar permisos', permission: 'role.syncPermissions' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import(
        './components/role-sync/role-sync.component'
      ).then((m) => m.RoleSyncComponent),
  },
];

export default routes;
