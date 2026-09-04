export interface ProductVariantInventory {
  availableQuantity: number;
  warehouseId: string;
}

export interface ProductColor {
  id: string;
  description: string;
  hash?: string;
  value?: string;
  stock?: number;
  productSizeId?: string;
  isExists?: boolean;
  price?: number;
  inventory?: ProductVariantInventory;
}

/** Fila editable en la tabla de variantes color × talla. */
export interface ProductColorVariantRow extends ProductColor {
  variantAttached: boolean;
}

export interface ProductColorSizeOption {
  id: string;
  productSizeId?: string;
  description: string;
  stock?: number;
}

export interface CatalogColorCreateData {
  description: string;
  hash: string;
}

export interface ProductSize {
  id: string;
  productSizeId?: string;
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
  id: string;
  url: string;
  type: 'image' | 'video';
  isPrimary: boolean;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  description: string;
  shortDescription?: string;
  additionalInfo?: string;
  purchasePrice: number;
  salePrice: number;
  minSalePrice: number;
  status: string;
  genderId: string;
  gender: string;
  stock: number;
  sizes: ProductSize[];
  filter: boolean;
  sizeTypeId: string[];
  percentageDiscount: number;
  cashDiscount: number;
  warehouseId: string;
  inventory?: ProductVariantInventory;
  thumbnail?: string | null;
  gallery?: string[];
  media?: ProductMediaItem[];
  isFeatured?: boolean;
  isOnSale?: boolean;
  isNew?: boolean;
  wooStatus?: 'draft' | 'publish' | null;
  offerPrice?: number | null;
  wooCommerce?: {
    productId: string | null;
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
  id?: string;
  name: string;
  barcode: string;
  description: string;
  shortDescription?: string;
  additionalInfo?: string;
  purchasePrice?: number;
  salePrice?: number;
  minSalePrice?: number;
  status: string;
  genderId: string;
  percentageDiscount: number;
  cashDiscount: number;
  offerPrice?: number | null;
  isFeatured?: boolean;
  isOnSale?: boolean;
  isNew?: boolean;
  wooStatus?: 'draft' | 'publish' | null;
  warehouseId: string;
}

/** Campos aceptados por POST/PATCH /products en el backend. */
export interface ProductApiWritePayload {
  name?: string;
  description?: string;
  shortDescription?: string;
  additionalInfo?: string;
  barcode?: string;
  genderId?: string;
  vendorId?: string;
  warehouseId?: string;
  isFeatured?: boolean;
  isOnSale?: boolean;
  isNew?: boolean;
  wooStatus?: 'draft' | 'publish' | null;
  status?: string;
  percentageDiscount?: number;
  cashDiscount?: number;
  offerPrice?: number | null;
  sizes?: unknown[];
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
  sizeId: string;
  sizeLabel: string;
  colorId: string;
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
  id: string;
  description: string;
}

export interface Warehouse {
  id: string;
  name: string;
}

export interface SizeType {
  id: string;
  description: string;
}

export interface ProductFormModel {
  name: string;
  genderId: string;
  warehouseId: string;
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
  id: string;
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
