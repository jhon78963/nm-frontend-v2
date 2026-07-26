import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Proveedores',
    data: { breadcrumb: 'Proveedores', permission: 'vendor.getAll' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/vendors-list/vendors-list.component').then(
        (m) => m.VendorsListComponent,
      ),
  },
];

export default routes;
