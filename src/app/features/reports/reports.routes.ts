import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/permission.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Reporte Gerencial',
    data: { breadcrumb: 'Reportes', permission: 'report.index' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import(
        './management/components/management-dashboard/management-dashboard.component'
      ).then((m) => m.ManagementDashboardComponent),
  },
  {
    path: 'products',
    title: 'Inventario por producto',
    data: {
      breadcrumb: 'Productos (inventario)',
      permission: 'report.products',
    },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import(
        './products-inventory/components/products-inventory-report/products-inventory-report.component'
      ).then((m) => m.ProductsInventoryReportComponent),
  },
  {
    path: 'financial-summaries',
    data: { breadcrumb: 'Resumen Financiero' },
    loadChildren: () => import('./financial-summaries/financial-summaries.routes'),
  },
  {
    path: 'sales',
    title: 'Reporte de Ventas',
    data: { breadcrumb: 'Reporte de Ventas', permission: 'report.sales' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./sales-report/sales-report.component').then(
        (m) => m.SalesReportComponent,
      ),
  },
  {
    path: 'sales-period',
    title: 'Ventas por Período',
    data: { breadcrumb: 'Ventas por Período', permission: 'report.sales' },
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./sales-period-report/sales-period-report.component').then(
        (m) => m.SalesPeriodReportComponent,
      ),
  },
];

export default routes;
