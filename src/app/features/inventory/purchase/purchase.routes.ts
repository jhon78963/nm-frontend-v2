import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Compras',
    data: { breadcrumb: 'Compras', permissions: ['purchase.getAll', 'purchase.get'] },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/purchases-list/purchases-list.component').then(
        (m) => m.PurchasesListComponent,
      ),
  },
  {
    path: 'register',
    title: 'Nueva compra',
    data: { breadcrumb: 'Nueva compra', permission: 'purchase.registerBulk' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/purchase-register/purchase-register.component').then(
        (m) => m.PurchaseRegisterComponent,
      ),
  },
  {
    path: 'edit/:id',
    title: 'Editar compra',
    data: { breadcrumb: 'Editar compra', permission: 'purchase.update' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/purchase-register/purchase-register.component').then(
        (m) => m.PurchaseRegisterComponent,
      ),
  },
  {
    path: ':id',
    title: 'Detalle de compra',
    data: { breadcrumb: 'Detalle', permission: 'purchase.get' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./components/purchase-detail/purchase-detail.component').then(
        (m) => m.PurchaseDetailComponent,
      ),
  },
];

export default routes;
