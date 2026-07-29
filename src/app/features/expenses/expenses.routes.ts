import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'admin-expenses',
    data: { breadcrumb: 'Gastos Administrativos' },
    loadChildren: () => import('./admin-expenses/admin-expenses.routes'),
  },
  {
    path: 'accumulated-expenses',
    data: { breadcrumb: 'Egresos Cuenta Acumulada' },
    loadChildren: () => import('./accumulated-expenses/accumulated-expenses.routes'),
  },
  { path: '', redirectTo: 'admin-expenses', pathMatch: 'full' },
];

export default routes;
