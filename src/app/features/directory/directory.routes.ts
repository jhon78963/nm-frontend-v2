import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'team',
    loadChildren: () => import('./team/team.routes'),
  },
  { path: '', redirectTo: 'team', pathMatch: 'full' },
];

export default routes;
