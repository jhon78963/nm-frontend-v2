import { Product, Variant } from '../models/pos.model';

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function extractPosSearchRows(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object');
  }

  if (raw && typeof raw === 'object' && 'data' in raw) {
    const data = (raw as { data?: unknown }).data;
    return Array.isArray(data)
      ? data.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      : [];
  }

  return [];
}

function buildColorStockMap(balances: unknown): Map<string, number> {
  const map = new Map<string, number>();
  if (!Array.isArray(balances)) return map;

  for (const balance of balances) {
    const row = balance as Record<string, unknown>;
    const colorId = readString(row['colorId']);
    if (!colorId) continue;
    map.set(colorId, Math.max(0, Math.trunc(readNumber(row['quantity']))));
  }

  return map;
}

function isPosProduct(raw: unknown): raw is Product {
  return (
    !!raw &&
    typeof raw === 'object' &&
    'variants' in raw &&
    (raw as Product).variants != null &&
    typeof (raw as Product).variants === 'object'
  );
}

function resolveMasterQuantity(
  balances: Map<string, number>,
  linkedColorIds: Set<string>,
  hasLinkedColors: boolean,
): number {
  if (!hasLinkedColors) {
    let total = 0;
    for (const qty of balances.values()) total += qty;
    return total;
  }

  let masterQty = 0;
  for (const [colorId, qty] of balances.entries()) {
    if (!linkedColorIds.has(colorId)) {
      masterQty += qty;
    }
  }
  return masterQty;
}

function buildVariantsForSize(
  row: Record<string, unknown>,
  warehouseId: string,
): Variant[] {
  const productSizeId = readString(row['id']);
  const salePrice = readNumber(row['salePrice']);
  const minSalePrice =
    row['minSalePrice'] != null && row['minSalePrice'] !== ''
      ? readNumber(row['minSalePrice'])
      : null;
  const barcode = readString(row['barcode']);
  const balances = buildColorStockMap(row['inventoryBalances']);
  const productSizeColors = Array.isArray(row['productSizeColors'])
    ? row['productSizeColors']
    : [];

  const variants: Variant[] = [];
  let hasColorVariants = false;

  for (const psc of productSizeColors) {
    const pscRow = psc as Record<string, unknown>;
    const color = pscRow['color'] as Record<string, unknown> | undefined;
    if (!color) continue;

    const colorId = readString(color['id'] ?? pscRow['colorId']);
    if (!colorId) continue;

    const qty = balances.get(colorId) ?? 0;
    if (qty <= 0) continue;

    hasColorVariants = true;
    variants.push({
      product_size_id: productSizeId,
      color_id: colorId,
      colorName: readString(color['description'], 'Color'),
      hex: readString(color['hash'], '#000000'),
      inventory: {
        available_quantity: qty,
        warehouse_id: warehouseId,
      },
      price: salePrice,
      minSalePrice: minSalePrice,
      sku: barcode,
    });
  }

  if (!hasColorVariants) {
    const linkedColorIds = new Set(
      productSizeColors
        .map((psc) => {
          const pscRow = psc as Record<string, unknown>;
          const color = pscRow['color'] as Record<string, unknown> | undefined;
          return readString(color?.['id'] ?? pscRow['colorId']);
        })
        .filter((colorId) => colorId !== ''),
    );

    const masterQty = resolveMasterQuantity(
      balances,
      linkedColorIds,
      productSizeColors.length > 0,
    );

    if (masterQty > 0) {
      variants.push({
        product_size_id: productSizeId,
        color_id: '0',
        colorName: 'Único',
        hex: '#E5E7EB',
        inventory: {
          available_quantity: masterQty,
          warehouse_id: warehouseId,
        },
        price: salePrice,
        minSalePrice: minSalePrice,
        sku: barcode,
      });
    }
  }

  return variants;
}

function pickPrimaryProductGroup(
  rows: Record<string, unknown>[],
  scannedSku: string,
): Record<string, unknown>[] {
  const byProduct = new Map<string, Record<string, unknown>[]>();

  for (const row of rows) {
    const product = row['product'] as Record<string, unknown> | undefined;
    const productId = readString(product?.['id'] ?? row['productId']);
    if (!productId) continue;

    const group = byProduct.get(productId) ?? [];
    group.push(row);
    byProduct.set(productId, group);
  }

  if (byProduct.size <= 1) {
    return rows;
  }

  const normalizedSku = scannedSku.trim();
  if (normalizedSku) {
    for (const group of byProduct.values()) {
      const matchesSku = group.some(
        (row) => readString(row['barcode']) === normalizedSku,
      );
      if (matchesSku) return group;
    }
  }

  return byProduct.values().next().value ?? rows;
}

export function adaptPosSearchResponse(
  raw: unknown,
  scannedSku: string,
  warehouseId: string,
): Product | undefined {
  if (isPosProduct(raw)) {
    return raw;
  }

  const rows = pickPrimaryProductGroup(extractPosSearchRows(raw), scannedSku);
  if (!rows.length) return undefined;

  const firstProduct = rows[0]['product'] as Record<string, unknown> | undefined;
  const productId = readString(firstProduct?.['id'] ?? rows[0]['productId']);
  const productName = readString(firstProduct?.['name'], 'Producto');

  const variants: Record<string, Variant[]> = {};
  let basePrice: number | null = null;

  for (const row of rows) {
    const size = row['size'] as Record<string, unknown> | undefined;
    const sizeName = readString(size?.['description'], 'Único');
    const sizeVariants = buildVariantsForSize(row, warehouseId);
    if (!sizeVariants.length) continue;

    const salePrice = readNumber(row['salePrice']);
    if (salePrice > 0) {
      basePrice = basePrice == null ? salePrice : Math.min(basePrice, salePrice);
    }

    if (!variants[sizeName]) {
      variants[sizeName] = [];
    }
    variants[sizeName].push(...sizeVariants);
  }

  if (!Object.keys(variants).length) {
    return undefined;
  }

  return {
    id: productId,
    sku: scannedSku.trim(),
    name: productName,
    basePrice: basePrice ?? 0,
    variants,
  };
}
