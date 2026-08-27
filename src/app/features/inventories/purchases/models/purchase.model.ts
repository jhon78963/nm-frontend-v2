/** Opción de talla devuelta por `GET colors/sizes`. */
export interface ProductSizeOption {
  id: string;
  description?: string;
  productSizeId?: string;
  stock?: number;
  barcode?: string | null;
  purchasePrice?: number | null;
  salePrice?: number | null;
  minSalePrice?: number | null;
}

/** Fila de `GET colors/selected`. */
export interface ProductColorOption {
  id: string;
  description: string;
  hash?: string | null;
  isExists: boolean;
  stock: number | null;
  productSizeId: string | null;
}

export interface SizeTypeOption {
  id: string;
  description: string;
}

export type ProductRefPayload =
  | { mode: 'id'; productId: string }
  | { mode: 'temp'; tempId: string };

export type SizeRefPayload =
  | { mode: 'id'; sizeId: string }
  | { mode: 'temp'; tempId: string };

export interface PurchaseCatalogProductCreate {
  tempId: string;
  mode: 'create';
  name: string;
  genderId: string;
  description?: string | null;
  barcode?: string | null;
}

export interface PurchaseCatalogSizeCreate {
  tempId: string;
  mode: 'create';
  description: string;
  sizeTypeId: string;
}

export interface PurchaseCatalogColorCreate {
  tempId: string;
  mode: 'create';
  description: string;
  hash?: string | null;
}

export interface PurchaseLineColorJson {
  quantity: number;
  colorId?: string;
  tempId?: string;
  description?: string;
  hash?: string | null;
}

export interface PurchaseLinePayload {
  lineId: string;
  productRef: ProductRefPayload;
  sizeRef: SizeRefPayload;
  barcode: string | null;
  purchasePrice: number;
  salePrice: number;
  minSalePrice: number;
  colors: PurchaseLineColorJson[];
  subtotal: number;
  productSizeId?: string | null;
}

export interface PurchaseBulkPayload {
  purchase: {
    supplierName: string;
    vendorId?: string | null;
    documentNote: string | null;
    registeredAt: string;
    warehouseId: string;
    currency: string;
  };
  catalogUpserts: {
    products: PurchaseCatalogProductCreate[];
    sizes: PurchaseCatalogSizeCreate[];
    colors: PurchaseCatalogColorCreate[];
  };
  lines: PurchaseLinePayload[];
  totals: { grandSubtotal: number };
}

export interface PurchaseDraftColorVariant {
  id: string;
  displayLabel: string;
  colorMode: 'existing' | 'new';
  colorId: string | null;
  colorTempId: string | null;
  colorHash: string | null;
  quantity: number;
}

export interface PurchaseLineFormValue {
  lineId: string;
  productName: string;
  sizeLabel: string;
  productMode: 'existing' | 'new';
  productId: string | null;
  productTempId: string | null;
  productGenderId: string | null;
  sizeMode: 'existing' | 'new';
  sizeId: string | null;
  sizeTempId: string | null;
  sizeTypeId: string | null;
  productSizeId: string | null;
  barcode: string | null;
  purchasePrice: number;
  salePrice: number;
  minSalePrice: number;
  subtotal: number;
  colors: PurchaseLineColorRowValue[];
}

export interface PurchaseLineColorRowValue {
  displayLabel: string;
  colorId: string | null;
  colorTempId: string | null;
  colorHash: string | null;
  quantity: number;
}

export interface PurchaseRow {
  id: string;
  supplierName: string;
  vendorId: string | null;
  documentNote: string | null;
  registeredAt: string | null;
  warehouseId: string;
  warehouseName?: string;
  currency: string;
  status: PurchaseStatus;
  totalSubtotal: number;
  creationTime: string | null;
  cancelledAt: string | null;
}

export type PurchaseStatus = 'ACTIVE' | 'CANCELLED' | string;

export interface PurchaseLineColorDeltaRow {
  id: string;
  colorId: string;
  colorDescription?: string;
  quantity: number;
}

export interface PurchaseLineRow {
  id: string;
  lineId: string | null;
  productId: string;
  productName?: string;
  sizeId: string;
  sizeDescription?: string;
  sizeTypeId?: string;
  productSizeId: string;
  barcode: string | null;
  purchasePrice: number | null;
  salePrice: number | null;
  minSalePrice: number | null;
  subtotal: number;
  sizeStockDelta: number;
  hasColorBreakdown: boolean;
  colorDeltas?: PurchaseLineColorDeltaRow[];
}

export interface PurchaseLinkedPayment {
  cashMovementId: string;
  amount: number;
  paymentMethod: string;
  description: string;
  date: string | null;
  voucherPath: string | null;
  voucherPaths?: string[];
}

export interface PurchaseDetail extends PurchaseRow {
  cancellationReason: string | null;
  lines: PurchaseLineRow[];
  payloadSnapshot: unknown;
  linkedPayment?: PurchaseLinkedPayment | null;
}

export interface PurchaseListResponse {
  data: PurchaseRow[];
  paginate: { total: number; pages: number };
}

export interface PurchaseRegisterBulkResponse {
  message: string;
  purchaseId: string;
}

export interface PurchaseHeaderPatch {
  documentNote?: string | null;
  registeredAt?: string | null;
  supplierName?: string;
  vendorId?: string | null;
}

export interface PurchaseLinePatch {
  barcode?: string | null;
  purchasePrice: number;
  salePrice?: number | null;
  minSalePrice?: number | null;
  colorDeltas?: { colorId: string; quantity: number }[];
  sizeOnlyQuantity?: number;
}

export function genTempId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
