import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'team',
    loadChildren: () => import('./team/team.routes'),
  },
  {
    path: 'customers',
    loadChildren: () => import('./customers/customers.routes'),
  },
  {
    path: 'vendors',
    loadChildren: () => import('./vendors/vendors.routes'),
  },
  { path: '', redirectTo: 'team', pathMatch: 'full' },
];

export default routes;
