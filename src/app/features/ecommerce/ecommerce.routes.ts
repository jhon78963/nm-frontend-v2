import { Routes } from '@angular/router';

const routes: Routes = [
  // WordPress / WooCommerce — desactivado (reemplazado por nm-ecommerce)
  // {
  //   path: 'products',
  //   data: { breadcrumb: 'Publicar productos' },
  //   loadChildren: () => import('./products/products.routes'),
  // },
  // {
  //   path: 'multimedia',
  //   data: { breadcrumb: 'Multimedia' },
  //   loadChildren: () => import('./multimedia/multimedia.routes'),
  // },
  {
    path: 'header',
    data: { breadcrumb: 'Header' },
    loadChildren: () => import('./header-config/header-config.routes'),
  },
  {
    path: 'banners',
    data: { breadcrumb: 'Banners' },
    loadChildren: () => import('./home-banners-config/home-banners-config.routes'),
  },
  { path: 'config', redirectTo: 'header', pathMatch: 'full' },
  { path: '', redirectTo: 'header', pathMatch: 'full' },
];

export default routes;
