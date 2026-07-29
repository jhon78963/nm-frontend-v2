import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    title: 'Ventas',
    data: { breadcrumb: 'Ventas' },
    loadChildren: () => import('./lists/lists.routes'),
  },
];

export default routes;
