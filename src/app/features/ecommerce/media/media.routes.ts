import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    title: 'Media',
    data: { breadcrumb: 'Media' },
    loadComponent: () =>
      import('./components/media-library-page/media-library-page.component').then(
        (m) => m.MediaLibraryPageComponent,
      ),
  },
];

export default routes;
