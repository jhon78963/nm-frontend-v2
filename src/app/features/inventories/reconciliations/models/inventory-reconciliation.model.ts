import type { ProductVariantInventory } from '../../products/models/product.model';

export interface ReconciliationProduct {
  id: string;
  name: string;
  barcode: string | null;
  genderId?: string;
  gender?: string | null;
  warehouseId?: string;
  status?: string;
  sizes: ReconciliationSize[];
}

export interface ReconciliationSize {
  id: string;
  sizeId: string;
  barcode: string | null;
  inventory?: ProductVariantInventory;
  purchasePrice?: number | null;
  salePrice?: number | null;
  minSalePrice?: number | null;
  size: { id: string; description: string } | null;
  colors: ReconciliationColor[];
}

export interface ReconciliationColor {
  id: string;
  colorId: string;
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
  productSizeId: string;
  sizeId: string;
  colorId: string | null;
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
  colorId: string;
  description: string;
  stock: number;
  baselineStock: number;
  stockReviewed: boolean;
  posSoldQty: number;
  posSaleCount: number;
  posLastSoldAt: string | null;
}

export interface ReconciliationSizeDraft {
  id: string;
  sizeId: string;
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
  productId: string;
  name: string;
  sku: string | null;
  sizes: ReconciliationSizeDraft[];
}

export interface ReconciliationUpdatePayload {
  sizes: Array<{
    id: string;
    stock?: number;
    barcode?: string | null;
    purchasePrice?: number | null;
    salePrice?: number | null;
    minSalePrice?: number | null;
    colors?: Array<{ colorId: string; stock: number }>;
  }>;
}

export interface ReplaceVariantColorBody {
  fromColorId: string;
  toColorId: string;
}

export interface CatalogColorOption {
  id: string;
  description: string;
}

export interface AutocompleteOption {
  id: string;
  value: string;
}

export interface ReconciliationNavigationState {
  productId: string;
  productName: string;
  barcode?: string;
  gender?: string;
}
