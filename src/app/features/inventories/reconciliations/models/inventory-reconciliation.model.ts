import type { ProductVariantInventory } from '../../products/models/product.model';

export interface ReconciliationProduct {
  id: number;
  name: string;
  barcode: string | null;
  genderId?: number;
  gender?: string | null;
  warehouseId?: number;
  status?: string;
  sizes: ReconciliationSize[];
}

export interface ReconciliationSize {
  id: number;
  sizeId: number;
  barcode: string | null;
  inventory?: ProductVariantInventory;
  purchasePrice?: number | null;
  salePrice?: number | null;
  minSalePrice?: number | null;
  size: { id: number; description: string } | null;
  colors: ReconciliationColor[];
}

export interface ReconciliationColor {
  id: number;
  colorId: number;
  description: string;
  hash?: string | null;
  inventory?: ProductVariantInventory;
}

export interface ReconciliationSearchResponse {
  products: ReconciliationProduct[];
}

export interface ReconciliationUpdateResponse {
  message: string;
  product: ReconciliationProduct | null;
}

export interface ReconciliationPosSalesVariant {
  productSizeId: number;
  sizeId: number;
  colorId: number | null;
  quantitySold: number;
  saleCount: number;
  lastSoldAt: string | null;
}

export interface ReconciliationPosSalesSummary {
  since: string;
  sinceLabel: string;
  variants: ReconciliationPosSalesVariant[];
  totalSold: number;
  hasAnySales: boolean;
}

export interface ReconciliationColorDraft {
  colorId: number;
  description: string;
  stock: number;
  baselineStock: number;
  stockReviewed: boolean;
  posSoldQty: number;
  posSaleCount: number;
  posLastSoldAt: string | null;
}

export interface ReconciliationSizeDraft {
  id: number;
  sizeId: number;
  sizeLabel: string;
  barcode: string | null;
  masterStock: number;
  serverMasterStock: number;
  shelfInconsistentOnLoad: boolean;
  purchasePrice: number | null;
  salePrice: number | null;
  minSalePrice: number | null;
  colors: ReconciliationColorDraft[];
  posSoldQty: number;
  posSaleCount: number;
  posLastSoldAt: string | null;
}

export interface ReconciliationDraft {
  productId: number;
  name: string;
  sku: string | null;
  sizes: ReconciliationSizeDraft[];
}

export interface ReconciliationUpdatePayload {
  sizes: Array<{
    id: number;
    stock?: number;
    barcode?: string | null;
    purchasePrice?: number | null;
    salePrice?: number | null;
    minSalePrice?: number | null;
    colors?: Array<{ colorId: number; stock: number }>;
  }>;
}

export interface ReplaceVariantColorBody {
  fromColorId: number;
  toColorId: number;
}

export interface CatalogColorOption {
  id: number;
  description: string;
}

export interface AutocompleteOption {
  id: number;
  value: string;
}

export interface ReconciliationNavigationState {
  productId: number;
  productName: string;
  barcode?: string;
  gender?: string;
}
