import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'change-password',
    title: 'Cambiar contraseña',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    data: { breadcrumb: 'Cambiar contraseña' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import(
            './features/auth/components/change-password/change-password.component'
          ).then((m) => m.ChangePasswordComponent),
      },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    children: [
      {
        path: 'administration',
        title: 'Administración',
        data: { breadcrumb: 'Administración' },
        loadChildren: () => import('./features/administration/administration.routes'),
      },
      {
        path: 'inventories',
        title: 'Inventario',
        data: { breadcrumb: 'Inventario' },
        loadChildren: () => import('./features/inventories/inventories.routes'),
      },
      {
        path: 'ecommerce',
        title: 'Ecommerce',
        data: { breadcrumb: 'Ecommerce' },
        loadChildren: () => import('./features/ecommerce/ecommerce.routes'),
      },
      {
        path: 'reports',
        title: 'Reportes',
        data: { breadcrumb: 'Reportes' },
        loadChildren: () => import('./features/reports/reports.routes'),
      },
      {
        path: 'directory',
        title: 'Directorio',
        data: { breadcrumb: 'Directorio' },
        loadChildren: () => import('./features/directory/directory.routes'),
      },
      {
        path: 'sales/pos',
        title: 'POS',
        data: { breadcrumb: 'POS' },
        loadChildren: () => import('./features/sales/pos/pos.routes'),
      },
      {
        path: 'sales',
        title: 'Ventas',
        data: { breadcrumb: 'Ventas' },
        loadChildren: () => import('./features/sales/sales.routes'),
      },
      {
        path: 'finance',
        title: 'Módulo Financiero',
        data: { breadcrumb: 'Módulo Financiero' },
        loadChildren: () => import('./features/finance/finance.routes'),
      },
      {
        path: 'financial-summary',
        title: 'Resumen Financiero',
        data: { breadcrumb: 'Resumen Financiero' },
        loadChildren: () => import('./features/financial-summary/financial-summary.routes'),
      },
      {
        path: 'dashboard',
        redirectTo: 'administration/roles',
        pathMatch: 'full',
      },
      {
        path: '',
        redirectTo: 'administration/roles',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'auth',
    data: { breadcrumb: 'Auth' },
    loadChildren: () => import('./features/auth/auth.routes'),
  },
  {
    path: 'notfound',
    loadChildren: () => import('./features/notfound/notfound.routes'),
  },
  {
    path: '**',
    redirectTo: '/notfound',
  },
];
