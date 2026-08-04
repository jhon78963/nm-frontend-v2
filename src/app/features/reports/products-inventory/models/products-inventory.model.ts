export interface ProductInventoryColor {
  colorId: number;
  color: string;
  stock: number;
}

export interface ProductInventorySize {
  productSizeId: number;
  sizeId: number;
  size: string;
  barcode: string | null;
  purchasePrice: number | null;
  salePrice: number | null;
  minSalePrice: number | null;
  stock: number;
  colors: ProductInventoryColor[];
}

export interface ProductInventoryAi {
  suggestedPrice: number | null;
  suggestedMinPrice: number | null;
  suggestedPurchaseQuantity: number | null;
  projectedSales: number | null;
  isDeadStock: boolean;
  priceError: string | null;
  demandError: string | null;
}

export interface ProductInventoryItem {
  id: number;
  name: string;
  sizes: ProductInventorySize[];
  ai?: ProductInventoryAi;
}

export interface ProductsInventoryAiSummary {
  processed: number;
  errors: number;
  deadStockCount: number;
}

export interface ColorPurchaseSuggestion {
  color: string;
  quantity: number;
}

export type ProductsInventoryTableRow =
  | { kind: 'product'; name: string; isDeadStock: boolean }
  | {
      kind: 'size';
      size: string;
      barcode: string | null;
      purchasePrice: number | null;
      salePrice: number | null;
      minSalePrice: number | null;
      sizeStock: number;
      colorsSummary: string;
      colorsStockSum: number | null;
      stockMismatch: boolean;
      aiSuggestedPrice: number | null;
      aiSuggestedMinPrice: number | null;
      aiSuggestedPurchase: number | null;
      colorPurchases: ColorPurchaseSuggestion[] | null;
      aiPriceError: string | null;
      isDeadStock: boolean;
    };
