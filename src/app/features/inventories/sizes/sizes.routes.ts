import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Tallas',
    data: { breadcrumb: 'Tallas', permissions: ['size.getAll', 'size.get'] },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/sizes-list/sizes-list.component').then(
        (m) => m.SizesListComponent,
      ),
  },
];

export default routes;
