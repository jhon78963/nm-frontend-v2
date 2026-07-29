import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/inventory-reconciliation/inventory-reconciliation.component').then(
        (m) => m.InventoryReconciliationComponent,
      ),
    data: { breadcrumb: 'Actualizar inventario' },
  },
  {
    path: ':productId',
    loadComponent: () =>
      import('./components/inventory-reconciliation/inventory-reconciliation.component').then(
        (m) => m.InventoryReconciliationComponent,
      ),
    data: { breadcrumb: 'Actualizar inventario' },
  },
];

export default routes;
