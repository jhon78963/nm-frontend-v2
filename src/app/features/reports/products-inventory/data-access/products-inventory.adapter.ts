import {
  ColorPurchaseSuggestion,
  ProductInventoryAi,
  ProductInventoryColor,
  ProductInventoryItem,
  ProductInventorySize,
  ProductsInventoryAiSummary,
  ProductsInventoryTableRow,
} from '../models/products-inventory.model';

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readId(value: unknown): string {
  return value != null ? String(value) : '';
}

function adaptColor(raw: unknown): ProductInventoryColor {
  const r = raw as Record<string, unknown>;
  return {
    colorId: readId(r['color_id'] ?? r['colorId']),
    color: String(r['color'] ?? ''),
    stock: toNumber(r['stock']),
  };
}

function adaptSize(raw: unknown): ProductInventorySize {
  const r = raw as Record<string, unknown>;
  const colorsRaw = r['colors'];

  return {
    productSizeId: readId(r['product_size_id'] ?? r['productSizeId']),
    sizeId: readId(r['size_id'] ?? r['sizeId']),
    size: String(r['size'] ?? '—'),
    barcode:
      r['barcode'] === null || r['barcode'] === undefined || r['barcode'] === ''
        ? null
        : String(r['barcode']),
    purchasePrice: toNullableNumber(r['purchase_price'] ?? r['purchasePrice']),
    salePrice: toNullableNumber(r['sale_price'] ?? r['salePrice']),
    minSalePrice: toNullableNumber(r['min_sale_price'] ?? r['minSalePrice']),
    stock: toNumber(r['stock']),
    colors: Array.isArray(colorsRaw) ? colorsRaw.map(adaptColor) : [],
  };
}

function adaptAi(raw: unknown): ProductInventoryAi | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const r = raw as Record<string, unknown>;

  return {
    suggestedPrice: toNullableNumber(r['suggested_price'] ?? r['suggestedPrice']),
    suggestedMinPrice: toNullableNumber(
      r['suggested_min_price'] ?? r['minimum_price'] ?? r['suggestedMinPrice'],
    ),
    suggestedPurchaseQuantity: toNullableNumber(
      r['suggested_purchase_quantity'] ?? r['suggestedPurchaseQuantity'],
    ),
    projectedSales: toNullableNumber(r['projected_sales'] ?? r['projectedSales']),
    isDeadStock: Boolean(r['is_dead_stock'] ?? r['isDeadStock']),
    priceError:
      r['price_error'] != null && r['price_error'] !== ''
        ? String(r['price_error'])
        : null,
    demandError:
      r['demand_error'] != null && r['demand_error'] !== ''
        ? String(r['demand_error'])
        : null,
  };
}

export function adaptProductInventoryItem(raw: unknown): ProductInventoryItem {
  const r = raw as Record<string, unknown>;
  const sizesRaw = r['sizes'];

  return {
    id: readId(r['id']),
    name: String(r['name'] ?? ''),
    sizes: Array.isArray(sizesRaw) ? sizesRaw.map(adaptSize) : [],
    ai: adaptAi(r['ai']),
  };
}

export function adaptProductsInventoryList(raw: unknown): ProductInventoryItem[] {
  const envelope = raw as { data?: unknown[] | { products?: unknown[] }; success?: boolean };
  const nested = envelope?.data;

  if (nested && typeof nested === 'object' && !Array.isArray(nested) && 'products' in nested) {
    const products = (nested as { products?: unknown[] }).products;
    return Array.isArray(products) ? products.map(adaptProductInventoryItem) : [];
  }

  const data = Array.isArray(nested) ? nested : Array.isArray(raw) ? raw : [];

  return data.map(adaptProductInventoryItem);
}

export function adaptProductsInventoryAiSummary(raw: unknown): ProductsInventoryAiSummary | null {
  const envelope = raw as {
    data?: { ai_summary?: Record<string, unknown> };
  };
  const summary = envelope?.data?.ai_summary;
  if (!summary) {
    return null;
  }

  return {
    processed: toNumber(summary['processed']),
    errors: toNumber(summary['errors']),
    deadStockCount: toNumber(summary['dead_stock_count'] ?? summary['deadStockCount']),
  };
}

export function formatColorsSummary(colors: ProductInventoryColor[]): string {
  if (colors.length === 0) {
    return '—';
  }
  return colors.map((color) => `${color.stock} ${color.color}`).join(', ');
}

export function distributeByColor(
  colors: ProductInventoryColor[],
  total: number,
): ColorPurchaseSuggestion[] | null {
  if (colors.length === 0 || total <= 0) {
    return null;
  }
  const base = Math.floor(total / colors.length);
  const remainder = total - base * colors.length;
  return colors.map((c, i) => ({
    color: c.color,
    quantity: base + (i < remainder ? 1 : 0),
  }));
}

export function buildProductsInventoryTableRows(
  products: ProductInventoryItem[],
): ProductsInventoryTableRow[] {
  const rows: ProductsInventoryTableRow[] = [];

  for (const product of products) {
    const isDeadStock = product.ai?.isDeadStock ?? false;

    rows.push({ kind: 'product', name: product.name, isDeadStock });

    const aiSuggestedPrice = product.ai?.suggestedPrice ?? null;
    const aiSuggestedMinPrice = product.ai?.suggestedMinPrice ?? null;
    const aiSuggestedPurchase = product.ai?.suggestedPurchaseQuantity ?? null;
    const aiPriceError = product.ai?.priceError ?? null;

    if (product.sizes.length === 0) {
      rows.push({
        kind: 'size',
        size: '—',
        barcode: null,
        purchasePrice: null,
        salePrice: null,
        minSalePrice: null,
        sizeStock: 0,
        colorsSummary: '—',
        colorsStockSum: null,
        stockMismatch: false,
        aiSuggestedPrice,
        aiSuggestedMinPrice,
        aiSuggestedPurchase,
        colorPurchases: null,
        aiPriceError,
        isDeadStock,
      });
      continue;
    }

    for (const size of product.sizes) {
      const colorsStockSum = size.colors.length
        ? size.colors.reduce((acc, color) => acc + color.stock, 0)
        : null;
      const stockMismatch =
        colorsStockSum !== null && colorsStockSum !== size.stock;

      rows.push({
        kind: 'size',
        size: size.size,
        barcode: size.barcode,
        purchasePrice: size.purchasePrice,
        salePrice: size.salePrice,
        minSalePrice: size.minSalePrice,
        sizeStock: size.stock,
        colorsSummary: formatColorsSummary(size.colors),
        colorsStockSum,
        stockMismatch,
        aiSuggestedPrice,
        aiSuggestedMinPrice,
        aiSuggestedPurchase,
        colorPurchases: distributeByColor(size.colors, aiSuggestedPurchase ?? 0),
        aiPriceError,
        isDeadStock,
      });
    }
  }

  return rows;
}

export function countStockMismatches(products: ProductInventoryItem[]): number {
  let count = 0;

  for (const product of products) {
    for (const size of product.sizes) {
      const colorsStockSum = size.colors.length
        ? size.colors.reduce((acc, color) => acc + color.stock, 0)
        : null;
      if (colorsStockSum !== null && colorsStockSum !== size.stock) {
        count += 1;
      }
    }
  }

  return count;
}

export function countDeadStockProducts(products: ProductInventoryItem[]): number {
  return products.filter((product) => product.ai?.isDeadStock).length;
}
