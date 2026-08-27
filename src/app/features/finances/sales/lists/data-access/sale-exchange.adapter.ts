import {
  ExchangeItem,
  ExchangeNewItem,
  ExchangePreview,
  ExchangeResponse,
  ProductVariantSelection,
  SaleItem,
} from '../models/sale.model';
import { Product } from '../../../pos/models/pos.model';

function readNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function buildVariantId(productSizeId: string, colorId: string): string {
  return `${productSizeId}_${colorId}`;
}

function parseSizeColor(descriptionFull: string): { size: string; color: string } {
  const match = descriptionFull.match(/\(([^|]+)\|\s*([^)]+)\)/);
  if (match) {
    return {
      size: match[1]?.trim() || '—',
      color: match[2]?.trim() || '—',
    };
  }

  return { size: '—', color: '—' };
}

export function adaptSaleItemToExchangeItem(item: SaleItem): ExchangeItem {
  const { size, color } = parseSizeColor(item.descriptionFull);
  const quantity = item.quantity > 0 ? item.quantity : 1;
  const unitPrice = item.unitPrice;
  const subtotal = item.subtotal > 0 ? item.subtotal : unitPrice * quantity;

  return {
    saleItemId: item.id != null ? String(item.id) : '',
    productId: item.productSizeId != null ? String(item.productSizeId) : '',
    productName: item.productName || item.descriptionFull,
    size,
    color,
    quantity,
    unitPrice,
    subtotal,
  };
}

export function adaptVariantSelectionToExchangeNewItem(
  selection: ProductVariantSelection,
  quantity = 1,
): ExchangeNewItem {
  const unitPrice = selection.salePrice;
  const safeQuantity = quantity > 0 ? quantity : 1;

  return {
    variantId: buildVariantId(selection.productSizeId, selection.colorId),
    productSizeId: selection.productSizeId,
    colorId: selection.colorId,
    productName: selection.name,
    size: selection.sizeName,
    color: selection.colorName,
    quantity: safeQuantity,
    unitPrice,
    subtotal: unitPrice * safeQuantity,
    sku: selection.sku,
    availableQuantity: selection.availableQuantity,
  };
}

export function flattenProductVariants(
  product: Product | undefined,
  query: string,
): ExchangeNewItem[] {
  if (!product?.variants) {
    return [];
  }

  const flat: ExchangeNewItem[] = [];

  for (const [sizeName, variants] of Object.entries(product.variants)) {
    for (const variant of variants) {
      flat.push(
        adaptVariantSelectionToExchangeNewItem({
          productSizeId: variant.product_size_id,
          colorId: variant.color_id,
          name: product.name,
          sizeName,
          colorName: variant.colorName,
          salePrice: variant.price > 0 ? variant.price : product.basePrice,
          sku: variant.sku ?? `${variant.product_size_id}-${variant.color_id}`,
          availableQuantity: variant.inventory?.available_quantity ?? 0,
        }),
      );
    }
  }

  const trimmedQuery = query.trim();
  const exactSku = flat.some((item) => item.sku === trimmedQuery);
  return exactSku ? flat.filter((item) => item.sku === trimmedQuery) : flat;
}

export function buildExchangePreview(
  originalItems: ExchangeItem[],
  returnSelection: Map<string, number>,
  newItems: ExchangeNewItem[],
): ExchangePreview {
  const selectedOriginal = originalItems
    .filter((item) => returnSelection.has(item.saleItemId))
    .map((item) => {
      const quantity = returnSelection.get(item.saleItemId) ?? item.quantity;
      const unitPrice = item.unitPrice;
      return {
        ...item,
        quantity,
        subtotal: unitPrice * quantity,
      };
    });

  const normalizedNewItems = newItems.map((item) => ({
    ...item,
    subtotal: item.unitPrice * item.quantity,
  }));

  const originalTotal = selectedOriginal.reduce((sum, item) => sum + item.subtotal, 0);
  const newTotal = normalizedNewItems.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    originalItems: selectedOriginal,
    newItems: normalizedNewItems,
    originalTotal,
    newTotal,
    difference: newTotal - originalTotal,
  };
}

export function adaptExchangeResponse(raw: unknown, refundAmount = 0): ExchangeResponse {
  const r = raw as Record<string, unknown>;

  return {
    exchangeId: String(r['exchange_id'] ?? r['exchangeId'] ?? ''),
    newSaleId:
      r['new_sale_id'] != null || r['newSaleId'] != null
        ? String(r['new_sale_id'] ?? r['newSaleId'])
        : null,
    refundAmount,
    message: readString(r['message'], 'Cambio registrado correctamente'),
  };
}
