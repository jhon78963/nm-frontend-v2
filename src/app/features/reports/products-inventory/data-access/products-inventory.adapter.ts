import {
  ProductInventoryColor,
  ProductInventoryItem,
  ProductInventorySize,
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

function adaptColor(raw: unknown): ProductInventoryColor {
  const r = raw as Record<string, unknown>;
  return {
    colorId: toNumber(r['color_id'] ?? r['colorId']),
    color: String(r['color'] ?? ''),
    stock: toNumber(r['stock']),
  };
}

function adaptSize(raw: unknown): ProductInventorySize {
  const r = raw as Record<string, unknown>;
  const colorsRaw = r['colors'];

  return {
    productSizeId: toNumber(r['product_size_id'] ?? r['productSizeId']),
    sizeId: toNumber(r['size_id'] ?? r['sizeId']),
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

export function adaptProductInventoryItem(raw: unknown): ProductInventoryItem {
  const r = raw as Record<string, unknown>;
  const sizesRaw = r['sizes'];

  return {
    id: toNumber(r['id']),
    name: String(r['name'] ?? ''),
    sizes: Array.isArray(sizesRaw) ? sizesRaw.map(adaptSize) : [],
  };
}

export function adaptProductsInventoryList(raw: unknown): ProductInventoryItem[] {
  const envelope = raw as { data?: unknown[]; success?: boolean };
  const data = envelope?.data ?? (Array.isArray(raw) ? raw : []);

  return Array.isArray(data) ? data.map(adaptProductInventoryItem) : [];
}

export function formatColorsSummary(colors: ProductInventoryColor[]): string {
  if (colors.length === 0) {
    return '—';
  }
  return colors.map((color) => `${color.stock} ${color.color}`).join(', ');
}

export function buildProductsInventoryTableRows(
  products: ProductInventoryItem[],
): ProductsInventoryTableRow[] {
  const rows: ProductsInventoryTableRow[] = [];

  for (const product of products) {
    rows.push({ kind: 'product', name: product.name });

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
