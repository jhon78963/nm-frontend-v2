import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { superAdminOperationalBlockGuard } from './core/auth/super-admin-scope.guard';

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
        canActivate: [roleGuard],
        data: { breadcrumb: 'Administración', roles: ['Admin', 'Super Admin'] },
        loadChildren: () => import('./features/administrations/administrations.routes'),
      },
      {
        path: 'inventories',
        title: 'Inventario',
        canActivate: [superAdminOperationalBlockGuard],
        data: { breadcrumb: 'Inventario' },
        loadChildren: () => import('./features/inventories/inventories.routes'),
      },
      {
        path: 'ecommerce',
        title: 'Ecommerce',
        canActivate: [superAdminOperationalBlockGuard],
        data: { breadcrumb: 'Ecommerce' },
        loadChildren: () => import('./features/ecommerce/ecommerce.routes'),
      },
      {
        path: 'reports',
        title: 'Reportes',
        canActivate: [superAdminOperationalBlockGuard],
        data: { breadcrumb: 'Reportes' },
        loadChildren: () => import('./features/reports/reports.routes'),
      },
      {
        path: 'directories',
        title: 'Directorio',
        canActivate: [superAdminOperationalBlockGuard],
        data: { breadcrumb: 'Directorio' },
        loadChildren: () => import('./features/directories/directories.routes'),
      },
      {
        path: 'finances',
        title: 'Finanzas',
        canActivate: [superAdminOperationalBlockGuard],
        data: { breadcrumb: 'Finanzas' },
        loadChildren: () => import('./features/finances/finances.routes'),
      },
      {
        path: 'expenses',
        title: 'Gastos',
        canActivate: [superAdminOperationalBlockGuard],
        data: { breadcrumb: 'Gastos' },
        loadChildren: () => import('./features/expenses/expenses.routes'),
      },
      {
        path: 'ai',
        title: 'Asistente IA',
        canActivate: [superAdminOperationalBlockGuard],
        data: { breadcrumb: 'Asistente IA' },
        loadChildren: () => import('./features/ai/ai.routes'),
      },
      {
        path: 'profile',
        title: 'Mi Perfil',
        data: { breadcrumb: 'Mi Perfil' },
        loadChildren: () =>
          import('./features/profile/profile.routes').then((m) => m.profileRoutes),
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
        path: 'home',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        title: 'Inicio',
        canActivate: [superAdminOperationalBlockGuard],
        data: { breadcrumb: 'Inicio' },
        loadChildren: () =>
          import('./features/dashboards/dashboards.routes').then(
            (m) => m.dashboardsRoutes,
          ),
      },
      {
        path: 'not-found',
        title: 'No encontrado',
        data: { breadcrumb: 'No encontrado' },
        loadComponent: () =>
          import(
            './features/not-found-pages/components/not-found-page/not-found-page.component'
          ).then((m) => m.NotFoundPageComponent),
      },
      {
        path: '',
        redirectTo: 'dashboard',
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
    redirectTo: '/not-found',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/not-found',
  },
];
