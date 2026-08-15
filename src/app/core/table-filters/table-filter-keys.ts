/** Claves estables por vista de tabla (no cambiar tras release). */
export const TABLE_FILTER_KEYS = {
  products: 'inventories.products.v1',
  sales: 'finances.sales.v1',
  purchases: 'inventories.purchases.v1',
  colors: 'inventories.colors.v1',
  sizes: 'inventories.sizes.v1',
  customers: 'directories.customers.v1',
  vendors: 'directories.vendors.v1',
  teams: 'directories.teams.v1',
  users: 'administrations.users.v1',
  roles: 'administrations.roles.v1',
  tenants: 'administrations.tenants.v1',
  warehouses: 'administrations.warehouses.v1',
  actionLogs: 'administrations.action-logs.v1',
  productsPublish: 'ecommerce.products-publish.v1',
  productMultimedia: 'ecommerce.product-multimedia.v1',
} as const;
