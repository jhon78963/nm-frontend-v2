import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'teams',
    loadChildren: () => import('./teams/teams.routes'),
  },
  {
    path: 'customers',
    loadChildren: () => import('./customers/customers.routes'),
  },
  {
    path: 'vendors',
    loadChildren: () => import('./vendors/vendors.routes'),
  },
  // Compatibilidad
  {
    path: 'team',
    redirectTo: 'teams',
    pathMatch: 'full',
  },
  { path: '', redirectTo: 'teams', pathMatch: 'full' },
];

export default routes;
