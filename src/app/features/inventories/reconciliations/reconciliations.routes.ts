import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/auth/permission.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: {
      breadcrumb: 'Actualizar inventario',
      permission: 'inventoryReconciliation.search',
    },
    loadComponent: () =>
      import('./components/inventory-reconciliation/inventory-reconciliation.component').then(
        (m) => m.InventoryReconciliationComponent,
      ),
  },
  {
    path: ':productId',
    canActivate: [permissionGuard],
    data: {
      breadcrumb: 'Actualizar inventario',
      permission: 'inventoryReconciliation.search',
    },
    loadComponent: () =>
      import('./components/inventory-reconciliation/inventory-reconciliation.component').then(
        (m) => m.InventoryReconciliationComponent,
      ),
  },
];

export default routes;
