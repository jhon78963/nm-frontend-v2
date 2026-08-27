import type {
  PurchaseBulkPayload,
  PurchaseCatalogColorCreate,
  PurchaseCatalogProductCreate,
  PurchaseCatalogSizeCreate,
  PurchaseLineColorJson,
  PurchaseLineFormValue,
  PurchaseLinePayload,
} from '../models/purchase.model';

function toIsoDate(d: Date | string): string {
  if (typeof d === 'string') {
    return d.length >= 10 ? d.slice(0, 10) : d;
  }
  return d.toISOString().slice(0, 10);
}

function lineColorToJson(
  c: PurchaseLineFormValue['colors'][0],
): PurchaseLineColorJson {
  const qty = Number(c.quantity) || 0;
  if (c.colorId != null) {
    return { colorId: c.colorId, quantity: qty };
  }
  if (c.colorTempId) {
    return {
      tempId: c.colorTempId,
      quantity: qty,
      description: c.displayLabel,
      hash: c.colorHash?.trim() || null,
    };
  }
  return { quantity: qty };
}

export function buildPurchaseBulkPayload(
  header: {
    supplierName: string;
    vendorId?: string | null;
    documentNote: string | null;
    registeredAt: Date | string;
    warehouseId: string;
  },
  lines: PurchaseLineFormValue[],
): PurchaseBulkPayload {
  const products: PurchaseCatalogProductCreate[] = [];
  const sizes: PurchaseCatalogSizeCreate[] = [];
  const colors: PurchaseCatalogColorCreate[] = [];
  const seenProductTemp = new Set<string>();
  const seenSizeTemp = new Set<string>();
  const seenColorTemp = new Set<string>();

  for (const line of lines) {
    if (
      line.productMode === 'new' &&
      line.productTempId &&
      !seenProductTemp.has(line.productTempId)
    ) {
      seenProductTemp.add(line.productTempId);
      products.push({
        tempId: line.productTempId,
        mode: 'create',
        name: line.productName,
        genderId: line.productGenderId ?? '',
        description: null,
        barcode: null,
      });
    }
    if (
      line.sizeMode === 'new' &&
      line.sizeTempId &&
      line.sizeTypeId &&
      !seenSizeTemp.has(line.sizeTempId)
    ) {
      seenSizeTemp.add(line.sizeTempId);
      sizes.push({
        tempId: line.sizeTempId,
        mode: 'create',
        description: line.sizeLabel,
        sizeTypeId: line.sizeTypeId,
      });
    }
    for (const c of line.colors) {
      if (c.colorTempId && !seenColorTemp.has(c.colorTempId)) {
        seenColorTemp.add(c.colorTempId);
        colors.push({
          tempId: c.colorTempId,
          mode: 'create',
          description: c.displayLabel,
          hash: c.colorHash?.trim() || null,
        });
      }
    }
  }

  const linePayloads: PurchaseLinePayload[] = lines.map((line) => {
    const productRef =
      line.productMode === 'existing' && line.productId != null
        ? { mode: 'id' as const, productId: line.productId }
        : { mode: 'temp' as const, tempId: line.productTempId! };

    const sizeRef =
      line.sizeMode === 'existing' && line.sizeId != null
        ? { mode: 'id' as const, sizeId: line.sizeId }
        : { mode: 'temp' as const, tempId: line.sizeTempId! };

    return {
      lineId: line.lineId,
      productRef,
      sizeRef,
      barcode: line.barcode,
      purchasePrice: line.purchasePrice,
      salePrice: line.salePrice,
      minSalePrice: line.minSalePrice,
      colors: line.colors.map(lineColorToJson),
      subtotal: line.subtotal,
      productSizeId: line.productSizeId,
    };
  });

  const grandSubtotal = lines.reduce(
    (s, l) => s + (Number(l.subtotal) || 0),
    0,
  );

  const vid = header.vendorId?.trim() || null;

  return {
    purchase: {
      supplierName: header.supplierName.trim(),
      ...(vid != null ? { vendorId: vid } : {}),
      documentNote: header.documentNote?.trim() || null,
      registeredAt: toIsoDate(header.registeredAt),
      warehouseId: header.warehouseId,
      currency: 'PEN',
    },
    catalogUpserts: { products, sizes, colors },
    lines: linePayloads,
    totals: {
      grandSubtotal: Math.round(grandSubtotal * 100) / 100,
    },
  };
}

/** Payload para agregar líneas nuevas a una compra existente (incluye catálogo temporal). */
export function buildPurchaseAppendLinesPayload(
  lines: PurchaseLineFormValue[],
): Pick<PurchaseBulkPayload, 'catalogUpserts' | 'lines' | 'totals'> {
  const built = buildPurchaseBulkPayload(
    {
      supplierName: '',
      documentNote: null,
      registeredAt: new Date(),
        warehouseId: '',
    },
    lines,
  );

  return {
    catalogUpserts: built.catalogUpserts,
    lines: built.lines,
    totals: built.totals,
  };
}
