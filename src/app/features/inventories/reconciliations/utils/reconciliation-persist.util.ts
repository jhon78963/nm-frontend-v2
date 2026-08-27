import { concat, forkJoin, last, map, Observable, of, switchMap } from 'rxjs';
import type { InventoryReconciliationService } from '../data-access/inventory-reconciliation.service';
import type {
  PendingColorReplace,
  ReconciliationDraft,
  ReconciliationProduct,
} from '../models/inventory-reconciliation.model';
import {
  buildInventoryPayload,
  getActiveColors,
  getActiveSizes,
  hasColorBreakdown,
  isLocalColorId,
  isLocalSizeId,
} from './reconciliation-draft.util';

export function remapLocalSizeIds(
  draft: ReconciliationDraft,
  product: ReconciliationProduct,
): ReconciliationDraft {
  const sizeBySizeId = new Map(product.sizes.map((size) => [size.sizeId, size.id]));

  return {
    ...draft,
    sizes: draft.sizes.map((size) => {
      if (size.isRemoved) return size;
      if (!isLocalSizeId(size.id)) return size;
      return {
        ...size,
        id: sizeBySizeId.get(size.sizeId) ?? size.id,
        isNew: false,
      };
    }),
  };
}

export function resolveLocalColorIds(
  service: InventoryReconciliationService,
  draft: ReconciliationDraft,
): Observable<ReconciliationDraft> {
  const tasks: Array<{ sizeIndex: number; colorIndex: number; label: string }> = [];

  draft.sizes.forEach((size, sizeIndex) => {
    if (size.isRemoved) return;
    size.colors.forEach((color, colorIndex) => {
      if (color.isRemoved || !isLocalColorId(color.colorId)) return;
      tasks.push({
        sizeIndex,
        colorIndex,
        label: color.pendingColorLabel ?? color.description,
      });
    });
  });

  if (tasks.length === 0) {
    return of(draft);
  }

  return forkJoin(tasks.map((task) => service.resolveOrCreateColorId(task.label))).pipe(
    map((resolvedIds) => {
      const next = JSON.parse(JSON.stringify(draft)) as ReconciliationDraft;
      tasks.forEach((task, index) => {
        const color = next.sizes[task.sizeIndex].colors[task.colorIndex];
        color.colorId = resolvedIds[index];
        delete color.pendingColorLabel;
      });
      return next;
    }),
  );
}

function collectServerColorRemovals(draft: ReconciliationDraft) {
  const removals: Array<{ productSizeId: string; colorId: string }> = [];

  for (const size of draft.sizes) {
    if (isLocalSizeId(size.id)) continue;
    for (const color of size.colors) {
      if (color.isRemoved && !color.isNew) {
        removals.push({ productSizeId: size.id, colorId: color.colorId });
      }
    }
  }

  return removals;
}

function collectServerSizeRemovals(draft: ReconciliationDraft) {
  return draft.sizes.filter(
    (size) => size.isRemoved && !size.isNew && !isLocalSizeId(size.id),
  );
}

function collectNewSizes(draft: ReconciliationDraft) {
  return getActiveSizes(draft).filter((size) => size.isNew || isLocalSizeId(size.id));
}

function collectPendingColorReplaces(draft: ReconciliationDraft): PendingColorReplace[] {
  return (draft.pendingColorReplaces ?? []).filter(
    (replace) =>
      !isLocalSizeId(replace.productSizeId) &&
      !isLocalColorId(replace.fromColorId) &&
      !isLocalColorId(replace.toColorId),
  );
}

function collectNewColorLinks(draft: ReconciliationDraft) {
  const links: Array<{ productSizeId: string; colorId: string }> = [];

  for (const size of getActiveSizes(draft)) {
    if (isLocalSizeId(size.id)) continue;
    for (const color of getActiveColors(size)) {
      if (color.isNew) {
        links.push({ productSizeId: size.id, colorId: color.colorId });
      }
    }
  }

  return links;
}

function runSequential<T>(steps: Array<Observable<T>>): Observable<T | null> {
  if (steps.length === 0) {
    return of(null);
  }
  return concat(...steps).pipe(last());
}

export function persistReconciliationDraft(
  service: InventoryReconciliationService,
  productId: string,
  draft: ReconciliationDraft,
): Observable<ReconciliationProduct> {
  const colorRemovals = collectServerColorRemovals(draft);
  const sizeRemovals = collectServerSizeRemovals(draft);
  const newSizes = collectNewSizes(draft);

  const deleteSteps = [
    ...colorRemovals.map((item) => service.removeColorVariant(item.productSizeId, item.colorId)),
    ...sizeRemovals.map((size) => service.removeSize(productId, size.sizeId)),
  ];

  return runSequential(deleteSteps).pipe(
    switchMap(() => {
      if (newSizes.length === 0) {
        return of(null);
      }

      return runSequential(
        newSizes.map((size) =>
          service.addSizeToProduct(productId, size.sizeId, {
            barcode: size.barcode ?? '0',
            stock: hasColorBreakdown(size) ? 0 : size.masterStock,
            purchasePrice: size.purchasePrice ?? 0,
            salePrice: size.salePrice ?? 0,
            minSalePrice: size.minSalePrice ?? 0,
          }),
        ),
      );
    }),
    switchMap(() => service.getProduct(productId)),
    switchMap((product) =>
      resolveLocalColorIds(service, remapLocalSizeIds(draft, product)).pipe(
        map((resolvedDraft) => ({ product, resolvedDraft })),
      ),
    ),
    switchMap(({ resolvedDraft }) => {
      const replaceSteps = collectPendingColorReplaces(resolvedDraft).map((replace) =>
        service.replaceVariantColor(productId, replace.productSizeId, {
          fromColorId: replace.fromColorId,
          toColorId: replace.toColorId,
        }),
      );

      return runSequential(replaceSteps).pipe(map(() => resolvedDraft));
    }),
    switchMap((resolvedDraft) => {
      const addColorSteps = collectNewColorLinks(resolvedDraft).map((link) =>
        service.addColorToProductSize(link.productSizeId, link.colorId, { stock: 0 }),
      );

      return runSequential(addColorSteps).pipe(map(() => resolvedDraft));
    }),
    switchMap((resolvedDraft) =>
      service.bulkUpdate(productId, buildInventoryPayload(resolvedDraft)).pipe(map(() => resolvedDraft)),
    ),
    switchMap(() => service.getProduct(productId)),
  );
}
