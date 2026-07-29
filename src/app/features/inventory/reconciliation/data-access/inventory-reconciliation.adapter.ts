import type { ProductVariantInventory } from '../../products/models/product.model';
import type {
  CatalogColorOption,
  AutocompleteOption,
  ReconciliationColor,
  ReconciliationPosSalesSummary,
  ReconciliationPosSalesVariant,
  ReconciliationProduct,
  ReconciliationSearchResponse,
  ReconciliationSize,
  ReconciliationUpdateResponse,
} from '../models/inventory-reconciliation.model';

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function readNullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function adaptInventory(raw: unknown): ProductVariantInventory | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  return {
    availableQuantity: readNumber(r['available_quantity'] ?? r['availableQuantity']),
    warehouseId: readNumber(r['warehouse_id'] ?? r['warehouseId']),
  };
}

function adaptColor(raw: unknown): ReconciliationColor {
  const r = raw as Record<string, unknown>;
  return {
    id: readNumber(r['id']),
    colorId: readNumber(r['colorId'] ?? r['color_id']),
    description: readString(r['description'], `Color #${readNumber(r['colorId'] ?? r['color_id'])}`),
    hash: readNullableString(r['hash']),
    inventory: adaptInventory(r['inventory']),
  };
}

function adaptSize(raw: unknown): ReconciliationSize {
  const r = raw as Record<string, unknown>;
  const sizeRaw = r['size'];
  const sizeObj =
    sizeRaw && typeof sizeRaw === 'object'
      ? {
          id: readNumber((sizeRaw as Record<string, unknown>)['id']),
          description: readString((sizeRaw as Record<string, unknown>)['description']),
        }
      : null;

  const colorsRaw = r['colors'];
  const colors = Array.isArray(colorsRaw) ? colorsRaw.map(adaptColor) : [];

  return {
    id: readNumber(r['id']),
    sizeId: readNumber(r['sizeId'] ?? r['size_id']),
    barcode: readNullableString(r['barcode']),
    inventory: adaptInventory(r['inventory']),
    purchasePrice:
      r['purchasePrice'] != null || r['purchase_price'] != null
        ? readNumber(r['purchasePrice'] ?? r['purchase_price'])
        : null,
    salePrice:
      r['salePrice'] != null || r['sale_price'] != null
        ? readNumber(r['salePrice'] ?? r['sale_price'])
        : null,
    minSalePrice:
      r['minSalePrice'] != null || r['min_sale_price'] != null
        ? readNumber(r['minSalePrice'] ?? r['min_sale_price'])
        : null,
    size: sizeObj,
    colors,
  };
}

export function adaptReconciliationProduct(raw: unknown): ReconciliationProduct {
  const r = raw as Record<string, unknown>;
  const sizesRaw = r['sizes'];
  const sizes = Array.isArray(sizesRaw) ? sizesRaw.map(adaptSize) : [];

  return {
    id: readNumber(r['id']),
    name: readString(r['name']),
    barcode: readNullableString(r['barcode']),
    genderId: r['genderId'] != null || r['gender_id'] != null
      ? readNumber(r['genderId'] ?? r['gender_id'])
      : undefined,
    gender: readNullableString(r['gender']),
    warehouseId: r['warehouseId'] != null || r['warehouse_id'] != null
      ? readNumber(r['warehouseId'] ?? r['warehouse_id'])
      : undefined,
    status: readNullableString(r['status']) ?? undefined,
    sizes,
  };
}

function normalizeProductList(raw: unknown): ReconciliationProduct[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(adaptReconciliationProduct);
  if (typeof raw === 'object' && 'data' in raw && Array.isArray((raw as { data: unknown }).data)) {
    return (raw as { data: unknown[] }).data.map(adaptReconciliationProduct);
  }
  return [];
}

export function adaptReconciliationSearchResponse(raw: unknown): ReconciliationSearchResponse {
  const r = raw as Record<string, unknown>;
  return {
    products: normalizeProductList(r['products']),
  };
}

export function adaptReconciliationUpdateResponse(raw: unknown): ReconciliationUpdateResponse {
  const r = raw as Record<string, unknown>;
  const productRaw = r['product'];
  return {
    message: readString(r['message'], 'Inventario actualizado.'),
    product: productRaw ? adaptReconciliationProduct(productRaw) : null,
  };
}

function adaptPosSalesVariant(raw: unknown): ReconciliationPosSalesVariant {
  const r = raw as Record<string, unknown>;
  return {
    productSizeId: readNumber(r['productSizeId'] ?? r['product_size_id']),
    sizeId: readNumber(r['sizeId'] ?? r['size_id']),
    colorId:
      r['colorId'] != null || r['color_id'] != null
        ? readNumber(r['colorId'] ?? r['color_id'])
        : null,
    quantitySold: readNumber(r['quantitySold'] ?? r['quantity_sold']),
    saleCount: readNumber(r['saleCount'] ?? r['sale_count']),
    lastSoldAt: readNullableString(r['lastSoldAt'] ?? r['last_sold_at']),
  };
}

export function adaptPosSalesSummary(raw: unknown): ReconciliationPosSalesSummary {
  const r = raw as Record<string, unknown>;
  const variantsRaw = r['variants'];
  const variants = Array.isArray(variantsRaw)
    ? variantsRaw.map(adaptPosSalesVariant)
    : [];

  return {
    since: readString(r['since']),
    sinceLabel: readString(r['sinceLabel'] ?? r['since_label'], '10/07/2026'),
    variants,
    totalSold: readNumber(r['totalSold'] ?? r['total_sold']),
    hasAnySales: Boolean(r['hasAnySales'] ?? r['has_any_sales']),
  };
}

export function adaptCatalogColor(raw: unknown): CatalogColorOption {
  const r = raw as Record<string, unknown>;
  return {
    id: readNumber(r['id']),
    description: readString(r['description']),
  };
}

export function adaptAutocompleteOption(raw: unknown): AutocompleteOption {
  const r = raw as Record<string, unknown>;
  return {
    id: readNumber(r['id']),
    value: readString(r['value'] ?? r['description']),
  };
}
