import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    title: 'No encontrado',
    loadComponent: () =>
      import('./components/not-found-page/not-found-page.component').then(
        (m) => m.NotFoundPageComponent,
      ),
  },
];

export default routes;
