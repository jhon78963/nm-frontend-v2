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
    path: 'config',
    data: { breadcrumb: 'Configuración tienda' },
    loadChildren: () => import('./header-config/header-config.routes'),
  },
  { path: '', redirectTo: 'config', pathMatch: 'full' },
];

export default routes;
