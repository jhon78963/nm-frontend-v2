import type {
  ReconciliationColorDraft,
  ReconciliationDraft,
  ReconciliationProduct,
  ReconciliationSizeDraft,
} from '../models/inventory-reconciliation.model';

export function normalizeDraftPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeDraftBarcode(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

export function cloneProductToDraft(product: ReconciliationProduct): ReconciliationDraft {
  return {
    productId: product.id,
    name: product.name ?? '',
    sku: product.barcode ?? null,
    sizes: (product.sizes ?? []).map((size) => {
      const colors = (size.colors ?? []).map((color) => {
        const stock = Math.max(
          0,
          Math.trunc(
            Number(color.inventory?.availableQuantity ?? 0),
          ),
        );
        return {
          colorId: color.colorId,
          description: color.description ?? `Color #${color.colorId}`,
          stock,
          baselineStock: stock,
          stockReviewed: false,
          posSoldQty: 0,
          posSaleCount: 0,
          posLastSoldAt: null,
        };
      });

      const sumColors = colors.reduce((acc, color) => acc + color.stock, 0);
      const master = Math.max(
        0,
        Math.trunc(Number(size.inventory?.availableQuantity ?? 0)),
      );

      return {
        id: size.id,
        sizeId: size.sizeId,
        sizeLabel: size.size?.description ?? `Talla #${size.sizeId}`,
        barcode: size.barcode != null ? String(size.barcode) : '',
        masterStock: master,
        serverMasterStock: master,
        shelfInconsistentOnLoad: colors.length > 0 && sumColors !== master,
        purchasePrice: normalizeDraftPrice(size.purchasePrice),
        salePrice: normalizeDraftPrice(size.salePrice),
        minSalePrice: normalizeDraftPrice(size.minSalePrice),
        colors,
        posSoldQty: 0,
        posSaleCount: 0,
        posLastSoldAt: null,
      };
    }),
  };
}

export function colorStockSum(size: ReconciliationSizeDraft): number {
  return size.colors.reduce((acc, color) => acc + (Number(color.stock) || 0), 0);
}

export function hasColorBreakdown(size: ReconciliationSizeDraft): boolean {
  return size.colors.length > 0;
}

export function effectiveSizeStock(size: ReconciliationSizeDraft): number {
  if (hasColorBreakdown(size)) {
    return colorStockSum(size);
  }
  return Math.max(0, Math.trunc(Number(size.masterStock) || 0));
}

export function isColorZeroStock(color: ReconciliationColorDraft): boolean {
  return Math.max(0, Math.trunc(Number(color.stock) || 0)) === 0;
}

export function isSizeZeroStock(size: ReconciliationSizeDraft): boolean {
  return effectiveSizeStock(size) === 0;
}

export function compareLabelAsc(a: string, b: string): number {
  return (a ?? '').localeCompare(b ?? '', 'es', {
    sensitivity: 'base',
    numeric: true,
  });
}

export function sizeSortRank(size: ReconciliationSizeDraft): number {
  if (!isSizeZeroStock(size)) return 0;
  return size.posSoldQty > 0 ? 1 : 2;
}

export function colorSortRank(color: ReconciliationColorDraft): number {
  if (!isColorZeroStock(color)) return 0;
  return color.posSoldQty > 0 ? 1 : 2;
}

export function compareSizeRows(
  a: ReconciliationSizeDraft,
  b: ReconciliationSizeDraft,
): number {
  const rankDiff = sizeSortRank(a) - sizeSortRank(b);
  if (rankDiff !== 0) return rankDiff;
  return compareLabelAsc(a.sizeLabel, b.sizeLabel);
}

export function compareColorRows(
  a: ReconciliationColorDraft,
  b: ReconciliationColorDraft,
): number {
  const rankDiff = colorSortRank(a) - colorSortRank(b);
  if (rankDiff !== 0) return rankDiff;
  return compareLabelAsc(a.description, b.description);
}

export function sortedSizes(draft: ReconciliationDraft | null): ReconciliationSizeDraft[] {
  if (!draft) return [];
  return [...draft.sizes].sort(compareSizeRows);
}

export function sortedColors(size: ReconciliationSizeDraft): ReconciliationColorDraft[] {
  return [...size.colors].sort(compareColorRows);
}

export function buildInventoryPayload(draft: ReconciliationDraft) {
  const sizes = draft.sizes.map((size) => {
    const prices = {
      purchasePrice: normalizeDraftPrice(size.purchasePrice),
      salePrice: normalizeDraftPrice(size.salePrice),
      minSalePrice: normalizeDraftPrice(size.minSalePrice),
    };
    const barcode = normalizeDraftBarcode(size.barcode);

    if (size.colors.length > 0) {
      return {
        id: size.id,
        colors: size.colors.map((color) => ({
          colorId: color.colorId,
          stock: Math.max(0, Math.trunc(Number(color.stock) || 0)),
        })),
        barcode,
        ...prices,
      };
    }

    return {
      id: size.id,
      stock: Math.max(0, Math.trunc(Number(size.masterStock) || 0)),
      barcode,
      ...prices,
    };
  });

  return { sizes };
}

export function captureDraftSnapshot(
  draft: ReconciliationDraft | null,
): ReconciliationDraft | null {
  if (!draft) return null;
  return JSON.parse(JSON.stringify(draft)) as ReconciliationDraft;
}

export function mergeDraftPreservingEdits(
  previous: ReconciliationDraft,
  fresh: ReconciliationDraft,
  colorReplace?: {
    productSizeId: string;
    fromColorId: string;
    toColorId: string;
  },
): ReconciliationDraft {
  const prevBySizeId = new Map(previous.sizes.map((size) => [size.id, size]));

  return {
    ...fresh,
    sizes: fresh.sizes.map((freshSize) => {
      const prevSize = prevBySizeId.get(freshSize.id);
      if (!prevSize) return freshSize;

      const prevColorsById = new Map(
        prevSize.colors.map((color) => [color.colorId, color]),
      );

      return {
        ...freshSize,
        barcode: prevSize.barcode,
        purchasePrice: prevSize.purchasePrice,
        salePrice: prevSize.salePrice,
        minSalePrice: prevSize.minSalePrice,
        masterStock: prevSize.masterStock,
        serverMasterStock: freshSize.serverMasterStock,
        colors: freshSize.colors.map((freshColor) => {
          const prevColor = prevColorsById.get(freshColor.colorId);
          if (prevColor) {
            return {
              ...freshColor,
              stock: prevColor.stock,
              baselineStock: prevColor.baselineStock,
              stockReviewed: prevColor.stockReviewed,
            };
          }

          if (
            colorReplace &&
            freshSize.id === colorReplace.productSizeId &&
            freshColor.colorId === colorReplace.toColorId
          ) {
            const replacedFrom = prevColorsById.get(colorReplace.fromColorId);
            if (replacedFrom) {
              return {
                ...freshColor,
                stock: replacedFrom.stock,
                baselineStock: freshColor.stock,
                stockReviewed: replacedFrom.stockReviewed,
              };
            }
          }

          return freshColor;
        }),
      };
    }),
  };
}
