export interface DashboardMetrics {
  todaySales: number;
  todaySalesAmount: number;
  todayExpenses: number;
  lowStockProducts: number;
  pendingPurchases: number;
  activeCustomers: number;
}

export interface QuickAccessItem {
  label: string;
  description: string;
  route: string;
  icon: string;
  permission: string;
  colorClass: string;
}

export type MetricColorVariant = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';

export type MetricValueFormat = 'integer' | 'currency';

export const EMPTY_DASHBOARD_METRICS: DashboardMetrics = {
  todaySales: 0,
  todaySalesAmount: 0,
  todayExpenses: 0,
  lowStockProducts: 0,
  pendingPurchases: 0,
  activeCustomers: 0,
};

export const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  {
    label: 'POS',
    description: 'Cobrar ventas en el punto de venta',
    route: '/finances/pos',
    icon: 'pos',
    permission: 'pos.checkout',
    colorClass: 'orange',
  },
  {
    label: 'Nueva venta',
    description: 'Consultar y registrar ventas del día',
    route: '/finances/sales',
    icon: 'sale',
    permission: 'sale.getAll',
    colorClass: 'green',
  },
  {
    label: 'Inventario',
    description: 'Ver productos, stock y variantes',
    route: '/inventories/products',
    icon: 'inventory',
    permission: 'product.getAll',
    colorClass: 'blue',
  },
  {
    label: 'Nueva compra',
    description: 'Registrar una compra a proveedor',
    route: '/inventories/purchases/register',
    icon: 'purchase',
    permission: 'purchase.registerBulk',
    colorClass: 'purple',
  },
  {
    label: 'Reportes',
    description: 'Resumen gerencial y métricas del negocio',
    route: '/reports',
    icon: 'reports',
    permission: 'report.index',
    colorClass: 'indigo',
  },
  {
    label: 'Directorio',
    description: 'Clientes, equipo y proveedores',
    route: '/directories/customers',
    icon: 'directory',
    permission: 'customer.getAll',
    colorClass: 'teal',
  },
];
