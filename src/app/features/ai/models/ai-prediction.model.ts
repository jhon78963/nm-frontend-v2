export type AiInsightTab = 'price' | 'demand';

export interface AiProductOption {
  id: string;
  name: string;
  gender: string;
  stock: number;
  purchasePrice: number;
  salePrice: number;
}

/** Contexto resuelto por el backend desde la base de datos. */
export interface AiProductContext {
  productId: string;
  productName: string;
  currentCost: number;
  category: string;
  salesLastMonth: number;
  currentStock: number;
  salePrice: number;
  canViewCost: boolean;
  productAgeDays: number;
  daysSinceLastSale: number;
  totalSalesAllTime: number;
  isDeadStock: boolean;
  deadStockTier: string;
  deadStockLabel: string;
}

export interface PriceOptimizationResult {
  productId: string;
  suggestedPrice: number;
  minimumPrice: number;
  expectedMarginIncrease: number;
  markupOverCostPercent: number;
  recommendationSummary: string;
}

export interface DemandPredictionResult {
  productId: string;
  projectedSales: number;
  suggestedPurchaseQuantity: number;
}

export const DEFAULT_HORIZON_DAYS = 30;
