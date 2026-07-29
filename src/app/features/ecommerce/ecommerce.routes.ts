import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'products',
    data: { breadcrumb: 'Publicar productos' },
    loadChildren: () => import('./products/products.routes'),
  },
  {
    path: 'multimedia',
    data: { breadcrumb: 'Multimedia' },
    loadChildren: () => import('./multimedia/multimedia.routes'),
  },
  { path: '', redirectTo: 'products', pathMatch: 'full' },
];

export default routes;
