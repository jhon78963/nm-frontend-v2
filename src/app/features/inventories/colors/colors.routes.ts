import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Colores',
    data: { breadcrumb: 'Colores', permissions: ['color.getAll', 'color.get'] },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/colors-list/colors-list.component').then(
        (m) => m.ColorsListComponent,
      ),
  },
];

export default routes;
