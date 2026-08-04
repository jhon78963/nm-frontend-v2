import {
  AiProductContext,
  AiProductOption,
  DemandPredictionResult,
  PriceOptimizationResult,
} from '../models/ai-prediction.model';

function readNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function readBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
}

export function adaptAiProductOption(raw: unknown): AiProductOption {
  const record = raw as Record<string, unknown>;

  return {
    id: readNumber(record['id']),
    name: readString(record['name']),
    gender: readString(record['gender']),
    stock: readNumber(record['stock']),
    purchasePrice: readNumber(record['purchasePrice'] ?? record['purchase_price']),
    salePrice: readNumber(record['salePrice'] ?? record['sale_price']),
  };
}

export function adaptAiProductSearchResponse(raw: unknown): AiProductOption[] {
  if (!raw || typeof raw !== 'object') {
    return [];
  }

  const record = raw as Record<string, unknown>;
  const data = record['data'];

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(adaptAiProductOption);
}

export function adaptAiProductContext(raw: unknown): AiProductContext {
  const record = raw as Record<string, unknown>;

  return {
    productId: readNumber(record['productId'] ?? record['product_id']),
    productName: readString(record['productName'] ?? record['product_name']),
    currentCost: readNumber(record['currentCost'] ?? record['current_cost']),
    category: readString(record['category']),
    salesLastMonth: readNumber(record['salesLastMonth'] ?? record['sales_last_month']),
    currentStock: readNumber(record['currentStock'] ?? record['current_stock']),
    salePrice: readNumber(record['salePrice'] ?? record['sale_price']),
    canViewCost: readBoolean(record['canViewCost'] ?? record['can_view_cost'], true),
    productAgeDays: readNumber(record['productAgeDays'] ?? record['product_age_days']),
    daysSinceLastSale: readNumber(record['daysSinceLastSale'] ?? record['days_since_last_sale']),
    totalSalesAllTime: readNumber(record['totalSalesAllTime'] ?? record['total_sales_all_time']),
    isDeadStock: readBoolean(record['isDeadStock'] ?? record['is_dead_stock']),
    deadStockTier: readString(record['deadStockTier'] ?? record['dead_stock_tier']),
    deadStockLabel: readString(record['deadStockLabel'] ?? record['dead_stock_label']),
  };
}

export function adaptPriceOptimizationResult(raw: unknown): PriceOptimizationResult {
  const record = raw as Record<string, unknown>;

  return {
    productId: readNumber(record['product_id'] ?? record['productId']),
    suggestedPrice: readNumber(record['suggested_price'] ?? record['suggestedPrice']),
    minimumPrice: readNumber(record['minimum_price'] ?? record['minimumPrice']),
    expectedMarginIncrease: readNumber(
      record['expected_margin_increase'] ?? record['expectedMarginIncrease'],
    ),
    markupOverCostPercent: readNumber(
      record['markup_over_cost_percent'] ?? record['markupOverCostPercent'],
    ),
    recommendationSummary: readString(
      record['recommendation_summary'] ?? record['recommendationSummary'],
    ),
  };
}

export function adaptDemandPredictionResult(raw: unknown): DemandPredictionResult {
  const record = raw as Record<string, unknown>;

  return {
    productId: readNumber(record['product_id'] ?? record['productId']),
    projectedSales: readNumber(record['projected_sales'] ?? record['projectedSales']),
    suggestedPurchaseQuantity: readNumber(
      record['suggested_purchase_quantity'] ?? record['suggestedPurchaseQuantity'],
    ),
  };
}
