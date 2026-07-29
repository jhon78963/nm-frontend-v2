import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Tiendas',
    data: { breadcrumb: 'Tiendas', permission: 'warehouse.getAll' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/warehouses-list/warehouses-list.component').then(
        (m) => m.WarehousesListComponent,
      ),
  },
];

export default routes;
