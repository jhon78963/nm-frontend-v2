import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/pos.component').then((m) => m.PosComponent),
  },
];

export default routes;
