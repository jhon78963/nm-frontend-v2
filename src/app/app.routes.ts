import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'inventory',
    pathMatch: 'full',
  },

  // TODO: Cargar AuthLayoutComponent y rutas hijas (login, recover)
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes'),
  },

  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    children: [
      {
        path: 'inventory',
        loadChildren: () => import('./features/inventory/inventory.routes'),
      },
      {
        path: 'sales',
        loadChildren: () => import('./features/sales/sales.routes'),
      },
      {
        path: 'purchases',
        loadChildren: () => import('./features/purchases/purchases.routes'),
      },
    ],
  },

  {
    path: '**',
    redirectTo: '',
  },
];
