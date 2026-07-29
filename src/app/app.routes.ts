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
        path: 'administrations',
        title: 'Administración',
        data: { breadcrumb: 'Administración' },
        loadChildren: () => import('./features/administrations/administrations.routes'),
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
        path: 'directories',
        title: 'Directorio',
        data: { breadcrumb: 'Directorio' },
        loadChildren: () => import('./features/directories/directories.routes'),
      },
      {
        path: 'finances',
        title: 'Finanzas',
        data: { breadcrumb: 'Finanzas' },
        loadChildren: () => import('./features/finances/finances.routes'),
      },
      {
        path: 'expenses',
        title: 'Gastos',
        data: { breadcrumb: 'Gastos' },
        loadChildren: () => import('./features/expenses/expenses.routes'),
      },
      {
        path: 'financial-summaries',
        redirectTo: 'reports/financial-summaries',
        pathMatch: 'full',
      },
      // Compatibilidad con rutas anteriores
      {
        path: 'administration',
        redirectTo: 'administrations',
        pathMatch: 'prefix',
      },
      {
        path: 'directory',
        redirectTo: 'directories',
        pathMatch: 'prefix',
      },
      {
        path: 'finance',
        redirectTo: 'finances',
        pathMatch: 'prefix',
      },
      {
        path: 'financial-summary',
        redirectTo: 'financial-summaries',
        pathMatch: 'full',
      },
      {
        path: 'sales',
        redirectTo: 'finances/sales',
        pathMatch: 'full',
      },
      {
        path: 'pos',
        redirectTo: 'finances/pos',
        pathMatch: 'full',
      },
      {
        path: 'cash-movements',
        redirectTo: 'finances/cash-movements',
        pathMatch: 'full',
      },
      {
        path: 'sales/pos',
        redirectTo: 'finances/pos',
        pathMatch: 'full',
      },
      {
        path: 'finances/expenses',
        redirectTo: 'expenses',
        pathMatch: 'full',
      },
      {
        path: 'finances/expenses/admin-expenses',
        redirectTo: 'expenses/admin-expenses',
        pathMatch: 'full',
      },
      {
        path: 'finances/expenses/accumulated-expenses',
        redirectTo: 'expenses/accumulated-expenses',
        pathMatch: 'full',
      },
      {
        path: 'finances/cash-movements/admin-expenses',
        redirectTo: 'expenses/admin-expenses',
        pathMatch: 'full',
      },
      {
        path: 'finances/cash-movements/accumulated-expenses',
        redirectTo: 'expenses/accumulated-expenses',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        redirectTo: 'administrations/roles',
        pathMatch: 'full',
      },
      {
        path: '',
        redirectTo: 'administrations/roles',
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
    loadChildren: () => import('./features/not-found-pages/not-found-pages.routes'),
  },
  {
    path: '**',
    redirectTo: '/notfound',
  },
];
