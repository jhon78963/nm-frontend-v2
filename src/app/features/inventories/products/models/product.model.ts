export interface ProductVariantInventory {
  availableQuantity: number;
  warehouseId: number;
}

export interface ProductColor {
  id: number;
  description: string;
  hash?: string;
  value?: string;
  stock?: number;
  productSizeId?: number;
  isExists?: boolean;
  price?: number;
  inventory?: ProductVariantInventory;
}

/** Fila editable en la tabla de variantes color × talla. */
export interface ProductColorVariantRow extends ProductColor {
  variantAttached: boolean;
}

export interface ProductColorSizeOption {
  id: number;
  productSizeId?: number;
  description: string;
  stock?: number;
}

export interface CatalogColorCreateData {
  description: string;
  hash: string;
}

export interface ProductSize {
  id: number;
  productSizeId?: number;
  description: string;
  price?: number;
  colors?: ProductColor[];
  inventory?: ProductVariantInventory;
  barcode?: string;
  stock?: number;
  purchasePrice?: number;
  salePrice?: number;
  minSalePrice?: number;
  isExists?: boolean;
}

export interface ProductMediaItem {
  id: number;
  url: string;
  type: 'image' | 'video';
  isPrimary: boolean;
}

export interface Product {
  id: number;
  name: string;
  barcode: string;
  description: string;
  purchasePrice: number;
  salePrice: number;
  minSalePrice: number;
  status: string;
  genderId: number;
  gender: string;
  stock: number;
  sizes: ProductSize[];
  filter: boolean;
  sizeTypeId: number[];
  percentageDiscount: number;
  cashDiscount: number;
  warehouseId: number;
  inventory?: ProductVariantInventory;
  thumbnail?: string | null;
  gallery?: string[];
  media?: ProductMediaItem[];
  isFeatured?: boolean;
  isOnSale?: boolean;
  wooStatus?: 'draft' | 'publish' | null;
  wooCommerce?: {
    productId: number | null;
    lastSyncedAt: string | null;
  };
}

export interface ProductListResponse {
  data: Product[];
  paginate: {
    total: number;
    pages: number;
  };
}

export interface ProductFormData {
  id?: number;
  name: string;
  barcode: string;
  description: string;
  purchasePrice?: number;
  salePrice?: number;
  minSalePrice?: number;
  status: string;
  genderId: number;
  percentageDiscount: number;
  cashDiscount: number;
  isFeatured?: boolean;
  isOnSale?: boolean;
  wooStatus?: 'draft' | 'publish' | null;
  warehouseId: number;
}

export interface ProductSizeFormData {
  barcode?: string;
  stock?: number;
  purchasePrice?: number;
  salePrice?: number;
  minSalePrice?: number;
}

export interface ProductColorFormData {
  stock: number;
}

export interface EcommerceVariantRow {
  sizeId: number;
  sizeLabel: string;
  colorId: number;
  colorLabel: string;
  colorHash: string | null;
  stock: number;
  price: number;
  syncStatus: 'synced' | 'pending';
}

export interface ProductImportResponse {
  message: string;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface Gender {
  id: number;
  description: string;
}

export interface Warehouse {
  id: number;
  name: string;
}

export interface SizeType {
  id: number;
  description: string;
}

export interface ProductFormModel {
  name: string;
  genderId: number;
  warehouseId: number;
}

export type ProductHistorySeverity =
  | 'success'
  | 'info'
  | 'danger'
  | 'warning'
  | 'secondary';

export type ProductHistoryIcon =
  | 'create'
  | 'update'
  | 'delete'
  | 'sale'
  | 'exchange'
  | 'return'
  | 'in'
  | 'out'
  | 'default';

export interface ProductHistoryChange {
  field: string;
  from: string | number;
  to: string | number;
}

export interface ProductHistoryEvent {
  id: number | string;
  date: string;
  time: string;
  user: string;
  actionTitle: string;
  changes: ProductHistoryChange[];
  severity: ProductHistorySeverity;
  icon: ProductHistoryIcon;
}

export interface ProductHistoryResponse {
  success: boolean;
  data: ProductHistoryEvent[];
}
