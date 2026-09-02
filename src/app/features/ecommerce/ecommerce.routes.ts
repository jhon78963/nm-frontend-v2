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
  {
    path: 'services',
    data: { breadcrumb: 'Servicios del home' },
    loadChildren: () => import('./home-services-config/home-services-config.routes'),
  },
  {
    path: 'footer',
    data: { breadcrumb: 'Footer' },
    loadChildren: () => import('./footer-config/footer-config.routes'),
  },
  {
    path: 'social-media',
    data: { breadcrumb: 'Redes sociales del home' },
    loadChildren: () => import('./home-social-media-config/home-social-media-config.routes'),
  },
  {
    path: 'collections',
    data: { breadcrumb: 'Colecciones del home' },
    loadChildren: () => import('./home-collections-config/home-collections-config.routes'),
  },
  {
    path: 'category-products',
    data: { breadcrumb: 'Productos por categoría' },
    loadChildren: () =>
      import('./home-category-products-config/home-category-products-config.routes'),
  },
  {
    path: 'media',
    data: { breadcrumb: 'Media' },
    loadChildren: () => import('./media/media.routes'),
  },
  { path: 'config', redirectTo: 'header', pathMatch: 'full' },
  { path: '', redirectTo: 'header', pathMatch: 'full' },
];

export default routes;
