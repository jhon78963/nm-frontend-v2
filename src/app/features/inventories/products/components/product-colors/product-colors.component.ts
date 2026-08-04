import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, concat, of } from 'rxjs';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ProductColorsService } from '../../data-access/product-colors.service';
import {
  ProductColorSizeOption,
  ProductColorVariantRow,
} from '../../models/product.model';

type ColorFilterStatus = 'all' | 'active' | 'inactive';

interface StoredSizeSelection {
  id: number;
  productSizeId?: number;
  description?: string;
  stock?: number;
  productId: number;
}

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => void;
}

interface ColorFieldSnapshot {
  stock: number;
  isExists: boolean;
}

const SELECTED_SIZE_KEY = 'selectedSize';

@Component({
  selector: 'app-product-colors',
  imports: [FormsModule, RouterLink, ButtonComponent, ConfirmDialogComponent],
  templateUrl: './product-colors.component.html',
})
export class ProductColorsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly colorsService = inject(ProductColorsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  private catalogSelectedSizeId: number | null = null;

  protected readonly productId = signal<number | null>(null);
  protected readonly loadingSizes = signal(true);
  protected readonly saving = signal(false);
  protected readonly sizes = signal<ProductColorSizeOption[]>([]);
  protected readonly colors = signal<ProductColorVariantRow[]>([]);
  protected readonly catalogColorsPending = signal(false);
  protected readonly selectedSize = signal<ProductColorSizeOption | null>(null);
  protected readonly sizeSearch = signal('');
  protected readonly filterStatus = signal<ColorFilterStatus>('all');
  protected readonly highlightedColorId = signal<number | null>(null);
  protected readonly colorJumpSearch = signal('');
  protected readonly colorJumpOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmLoading = signal(false);
  protected readonly confirmState = signal<ConfirmState | null>(null);
  protected readonly createModalOpen = signal(false);
  protected readonly creatingColor = signal(false);
  protected readonly newColorDescription = signal('');
  protected readonly newColorHash = signal('#000000');

  private readonly panelStockSourceEpoch = signal(0);
  private readonly colorRevisionEpoch = signal(0);
  private readonly selectedColorIds = signal<Set<number>>(new Set());
  private readonly initialColorSnapshots = new Map<number, ColorFieldSnapshot>();
  private readonly colorJumpInputRef = viewChild<ElementRef<HTMLInputElement>>('colorJumpInput');

  protected readonly filteredSizeOptions = computed(() => {
    const query = this.sizeSearch().trim().toLowerCase();
    const rows = this.sizes();
    if (!query) {
      return rows;
    }
    return rows.filter((size) =>
      size.description.toLowerCase().includes(query),
    );
  });

  protected readonly selectedColors = computed(() =>
    this.colors().filter((color) => this.selectedColorIds().has(color.id)),
  );

  protected readonly removableSelectedColors = computed(() =>
    this.selectedColors().filter((color) => !!color.isExists),
  );

  protected readonly linkedColors = computed(() => {
    this.colorRevisionEpoch();
    this.selectedColorIds();
    return this.colors().filter((color) => this.isColorLinked(color));
  });

  protected readonly totalAssignedStock = computed(() => {
    this.colorRevisionEpoch();
    this.selectedColorIds();
    if (this.catalogColorsPending()) {
      return 0;
    }
    return this.colors().reduce((acc, color) => {
      if (!this.isColorLinked(color)) {
        return acc;
      }
      return acc + (Number(color.stock) || 0);
    }, 0);
  });

  protected readonly masterProductSizeStock = computed(() => {
    this.panelStockSourceEpoch();
    const size = this.selectedSize();
    const id = size?.id;
    if (id == null) {
      return 0;
    }

    const row = this.sizes().find((item) => Number(item.id) === Number(id));
    if (
      row != null &&
      row.stock !== undefined &&
      row.stock !== null &&
      `${row.stock}`.trim() !== ''
    ) {
      const n = Number(row.stock);
      if (!Number.isNaN(n)) {
        return Math.max(0, Math.trunc(n));
      }
    }

    return Math.max(0, Math.trunc(Number(size?.stock ?? 0) || 0));
  });

  protected readonly remainingStock = computed(
    () => this.masterProductSizeStock() - this.totalAssignedStock(),
  );

  protected readonly isStockBalanced = computed(
    () => this.totalAssignedStock() === this.masterProductSizeStock(),
  );

  protected readonly effectiveStockBalancedForPanel = computed(
    () => this.catalogColorsPending() || this.isStockBalanced(),
  );

  protected readonly stockAssignPercent = computed(() => {
    const master = this.masterProductSizeStock();
    const assigned = this.totalAssignedStock();
    if (this.catalogColorsPending() || master <= 0) {
      return assigned > 0 && !this.catalogColorsPending() ? 100 : 0;
    }
    const pct = (assigned / master) * 100;
    return Math.min(100, Math.round(pct));
  });

  protected readonly progressBarClass = computed(() => {
    if (this.catalogColorsPending() || this.isStockBalanced()) {
      return 'bg-emerald-500';
    }
    if (this.remainingStock() < 0) {
      return 'bg-red-500';
    }
    return 'bg-amber-500';
  });

  protected readonly variantVsMasterRatioPercent = computed((): number | null => {
    if (this.catalogColorsPending()) {
      return null;
    }
    const master = this.masterProductSizeStock();
    if (master <= 0) {
      return null;
    }
    return Math.round((this.totalAssignedStock() / master) * 100);
  });

  protected readonly filteredColors = computed(() => {
    this.colorRevisionEpoch();
    this.selectedColorIds();
    const status = this.filterStatus();
    return this.colors().filter((color) => {
      const stockNum = Number(color.stock) || 0;
      const linked = this.isColorLinked(color);
      if (status === 'all') {
        return true;
      }
      if (status === 'active') {
        return linked && stockNum > 0;
      }
      return linked && stockNum === 0;
    });
  });

  protected readonly dirtyColorCount = computed(() => {
    this.colorRevisionEpoch();
    return this.colors().filter((color) => this.isColorDirty(color)).length;
  });

  protected readonly hasPendingWork = computed(
    () => this.dirtyColorCount() > 0 || this.selectedCount() > 0,
  );

  protected readonly showBalanceWarning = computed(
    () => !this.catalogColorsPending() && !this.isStockBalanced() && this.hasPendingWork(),
  );

  protected readonly showReadyToSaveBanner = computed(
    () =>
      !this.catalogColorsPending() &&
      this.isStockBalanced() &&
      this.dirtyColorCount() > 0,
  );

  protected readonly colorJumpSuggestions = computed(() => {
    const q = this.colorJumpSearch().trim().toLowerCase();
    const rows = this.colors();
    if (!q) {
      return rows.slice(0, 50);
    }
    return rows
      .filter((color) =>
        String(color.description ?? '')
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 60);
  });

  protected readonly selectedCount = computed(() => this.selectedColorIds().size);
  protected readonly activeVariantCount = computed(
    () =>
      this.linkedColors().filter((color) => (Number(color.stock) || 0) > 0)
        .length,
  );

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('id');
    this.productId.set(id ? Number(id) : null);

    const productId = this.productId();
    if (productId) {
      this.loadSizes();
      this.restoreSelectedSize(productId);
    } else {
      this.loadingSizes.set(false);
    }
  }

  protected onSizeSearchInput(value: string): void {
    this.sizeSearch.set(value);
    this.loadSizes(value);
  }

  protected onSizeSelect(sizeId: string): void {
    if (!sizeId) {
      this.clearSizeSelection();
      return;
    }

    const sid = Number(sizeId);
    const size = this.sizes().find((item) => Number(item.id) === sid);
    if (!size) {
      return;
    }

    this.catalogSelectedSizeId = sid;
    this.selectedSize.set(size);
    this.persistSelectedSizeSnapshot();
    this.catalogColorsPending.set(true);
    this.colors.set([]);
    this.clearColorSelection();
    this.bumpPanelStockSourceEpoch();
    this.loadColors(sid);
  }

  protected setFilterStatus(status: ColorFilterStatus): void {
    this.filterStatus.set(status);
  }

  protected isFilterActive(status: ColorFilterStatus): boolean {
    return this.filterStatus() === status;
  }

  protected isColorSelected(color: ProductColorVariantRow): boolean {
    return this.selectedColorIds().has(color.id);
  }

  protected isColorDirty(color: ProductColorVariantRow): boolean {
    return !this.isColorAtInitialValues(color);
  }

  protected toggleColorSelection(
    color: ProductColorVariantRow,
    checked: boolean,
  ): void {
    if (checked) {
      this.markColorSelected(color.id);
      this.bumpColorRevisionEpoch();
      return;
    }

    this.unmarkColorSelected(color.id);
    if (!color.isExists) {
      const snapshot = this.initialColorSnapshots.get(color.id);
      this.patchColorRow(color.id, { stock: snapshot?.stock ?? 0 });
    } else {
      this.bumpColorRevisionEpoch();
    }
  }

  protected onStockChange(
    color: ProductColorVariantRow,
    rawStock: number | string | null | undefined,
  ): void {
    const stockNum = Math.max(
      0,
      Math.trunc(Number(rawStock === '' || rawStock == null ? 0 : rawStock) || 0),
    );
    this.patchColorRow(color.id, { stock: stockNum });

    const updated = this.colors().find((row) => row.id === color.id);
    if (!updated) {
      return;
    }

    if (this.isColorAtInitialValues(updated)) {
      this.unmarkColorSelected(updated.id);
    } else {
      this.markColorSelected(updated.id);
    }

    this.bumpColorRevisionEpoch();
  }

  protected onColorJumpInput(value: string): void {
    this.colorJumpSearch.set(value);
    this.colorJumpOpen.set(true);
  }

  protected onColorJumpFocus(): void {
    this.colorJumpOpen.set(true);
  }

  protected onColorJumpBlur(): void {
    setTimeout(() => this.colorJumpOpen.set(false), 150);
  }

  protected onColorJumpKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }

    const q = this.colorJumpSearch().trim().toLowerCase();
    if (!q) {
      return;
    }

    const rows = this.colors();
    const exact = rows.find(
      (color) =>
        String(color.description ?? '')
          .trim()
          .toLowerCase() === q,
    );
    const suggestions = this.colorJumpSuggestions();
    const single = suggestions.length === 1 ? suggestions[0] : null;
    const pick = exact ?? single;
    if (!pick?.id) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.focusColorInTable(pick);
  }

  protected selectJumpColor(color: ProductColorVariantRow): void {
    this.focusColorInTable(color);
  }

  protected openCreateColorModal(): void {
    this.newColorDescription.set('');
    this.newColorHash.set('#000000');
    this.createModalOpen.set(true);
  }

  protected closeCreateColorModal(): void {
    if (!this.creatingColor()) {
      this.createModalOpen.set(false);
    }
  }

  protected saveNewColor(): void {
    const description = this.newColorDescription().trim();
    const hash = this.newColorHash().trim();

    if (!description) {
      this.toastService.show('error', 'Ingresa un nombre para el color.');
      return;
    }

    this.creatingColor.set(true);
    this.colorsService
      .createCatalogColor({ description, hash: hash || '#000000' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.creatingColor.set(false);
          this.createModalOpen.set(false);
          this.toastService.show('success', 'Color creado correctamente.');
          this.loadSizes(this.sizeSearch());
          this.reloadCurrentColors();
        },
        error: () => {
          this.creatingColor.set(false);
          this.toastService.show('error', 'No se pudo crear el color.');
        },
      });
  }

  protected saveAllSelectedColors(): void {
    const targets = this.selectedColors().filter((color) => !!color.productSizeId);

    if (!targets.length) {
      this.toastService.show(
        'error',
        targets.length === 0 && this.selectedColors().length > 0
          ? 'No hay vínculo producto–talla; guarde primero la talla en inventario.'
          : 'No hay variantes seleccionadas para guardar.',
      );
      return;
    }

    this.saving.set(true);
    const requests = targets.map((color) => {
      const stockPayload = Math.max(0, Math.trunc(Number(color.stock)));
      const psId = color.productSizeId as number;

      if (color.isExists) {
        return this.colorsService
          .update(psId, color.id, { stock: stockPayload })
          .pipe(catchError(() => of(null)));
      }

      return this.colorsService
        .add(psId, color.id, { stock: stockPayload })
        .pipe(catchError(() => of(null)));
    });

    concat(...requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        complete: () => {
          this.saving.set(false);
          this.toastService.show('success', 'Cambios de color guardados.');
          this.markColorsSavedLocally(targets);
        },
        error: () => {
          this.saving.set(false);
          this.toastService.show('error', 'No se pudieron guardar todos los colores.');
        },
      });
  }

  protected deleteAllSelectedColors(): void {
    const removable = this.removableSelectedColors();
    if (!removable.length) {
      this.toastService.show(
        'error',
        'Selecciona variantes guardadas para remover. Las pendientes sin guardar se descartan al desmarcar.',
      );
      return;
    }

    this.openConfirm({
      title: 'Quitar variantes seleccionadas',
      message: `Se eliminarán ${removable.length} variante(s) de color de esta talla. ¿Continuar?`,
      confirmLabel: 'Sí, quitar seleccionadas',
      action: () => this.executeBulkRemove(removable),
    });
  }

  protected saveColorVariant(color: ProductColorVariantRow): void {
    const psId = color.productSizeId;
    if (!psId) {
      this.toastService.show(
        'error',
        'No hay vínculo producto–talla; guarde primero la talla en inventario.',
      );
      return;
    }

    const stockPayload = Math.max(0, Math.trunc(Number(color.stock)));
    this.saving.set(true);

    const request$ = color.isExists
      ? this.colorsService.update(psId, color.id, { stock: stockPayload })
      : this.colorsService.add(psId, color.id, { stock: stockPayload });

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.show('success', 'Stock de color actualizado.');
        this.markColorsSavedLocally([color]);
      },
      error: () => {
        this.saving.set(false);
        this.toastService.show('error', 'Error al guardar la variante.');
      },
    });
  }

  protected removeColorVariant(color: ProductColorVariantRow): void {
    this.openConfirm({
      title: 'Quitar variante de color',
      message: `¿Eliminar "${color.description}" de esta talla?`,
      confirmLabel: 'Sí, eliminar',
      action: () => this.detachVariantWithApi(color),
    });
  }

  protected onConfirmDialog(): void {
    const state = this.confirmState();
    if (!state) {
      return;
    }

    this.confirmLoading.set(true);
    state.action();
  }

  protected onCancelDialog(): void {
    this.confirmOpen.set(false);
    this.confirmState.set(null);
  }

  protected isRowHighlighted(color: ProductColorVariantRow): boolean {
    return this.highlightedColorId() === color.id;
  }

  protected colorSwatchStyle(color: ProductColorVariantRow): string {
    const hex = color.hash ?? color.value ?? '#e5e7eb';
    return hex;
  }

  protected canSaveAll(): boolean {
    return (
      !!this.selectedSize() &&
      this.selectedColorIds().size > 0 &&
      this.isStockBalanced() &&
      !this.catalogColorsPending() &&
      !this.saving()
    );
  }

  protected canRemoveAll(): boolean {
    return (
      !!this.selectedSize() &&
      this.removableSelectedColors().length > 0 &&
      !this.catalogColorsPending() &&
      !this.saving()
    );
  }

  protected isColorLinked(color: ProductColorVariantRow): boolean {
    if (color.isExists) {
      return true;
    }
    if (this.isColorSelected(color)) {
      return true;
    }
    return (Number(color.stock) || 0) > 0;
  }

  private clearColorSelection(): void {
    this.selectedColorIds.set(new Set());
    this.initialColorSnapshots.clear();
  }

  private syncColorSnapshots(rows: ProductColorVariantRow[]): void {
    this.initialColorSnapshots.clear();
    this.selectedColorIds.set(new Set());
    for (const color of rows) {
      this.initialColorSnapshots.set(color.id, this.captureColorSnapshot(color));
    }
    this.bumpColorRevisionEpoch();
  }

  private markColorRemovedLocally(color: ProductColorVariantRow): void {
    this.markColorsRemovedLocally([color]);
  }

  private captureColorSnapshot(color: ProductColorVariantRow): ColorFieldSnapshot {
    return {
      stock: Math.max(0, Math.trunc(Number(color.stock) || 0)),
      isExists: !!color.isExists,
    };
  }

  private isColorAtInitialValues(color: ProductColorVariantRow): boolean {
    const snapshot = this.initialColorSnapshots.get(color.id);
    if (!snapshot) {
      return true;
    }
    const stock = Math.max(0, Math.trunc(Number(color.stock) || 0));
    return stock === snapshot.stock && !!color.isExists === snapshot.isExists;
  }

  private markColorSelected(colorId: number): void {
    this.selectedColorIds.update((ids) => {
      const next = new Set(ids);
      next.add(colorId);
      return next;
    });
  }

  private unmarkColorSelected(colorId: number): void {
    this.selectedColorIds.update((ids) => {
      if (!ids.has(colorId)) {
        return ids;
      }
      const next = new Set(ids);
      next.delete(colorId);
      return next;
    });
  }

  private openConfirm(state: Omit<ConfirmState, 'action'> & { action: () => void }): void {
    this.confirmState.set(state);
    this.confirmOpen.set(true);
  }

  private finishConfirm(): void {
    this.confirmLoading.set(false);
    this.confirmOpen.set(false);
    this.confirmState.set(null);
  }

  private loadSizes(sizeFilter?: string): void {
    const productId = this.productId();
    if (!productId) {
      return;
    }

    this.loadingSizes.set(true);
    this.colorsService
      .getSizes(productId, sizeFilter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sizesList) => {
          this.sizes.set(sizesList);
          this.pinSelectedSizeToOptions();
          this.bumpPanelStockSourceEpoch();
          this.loadingSizes.set(false);
        },
        error: () => {
          this.loadingSizes.set(false);
          this.toastService.show('error', 'No se pudieron cargar las tallas.');
        },
      });
  }

  private loadColors(sizeId: number): void {
    const productId = this.productId();
    if (!productId) {
      return;
    }

    const sid = Number(sizeId);
    this.catalogColorsPending.set(true);
    this.colors.set([]);

    this.colorsService
      .getColors(productId, sid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          if (
            sid !== this.catalogSelectedSizeId ||
            Number(this.selectedSize()?.id) !== sid
          ) {
            return;
          }

          this.colors.set(rows);
          this.syncColorSnapshots(rows);
          this.catalogColorsPending.set(false);
          this.syncSizesProductSizeMeta(sid);
        },
        error: () => {
          if (sid === this.catalogSelectedSizeId) {
            this.catalogColorsPending.set(false);
            this.toastService.show('error', 'No se pudieron cargar los colores.');
          }
        },
      });
  }

  private markColorsSavedLocally(colors: ProductColorVariantRow[]): void {
    if (!colors.length) {
      return;
    }

    const savedIds = new Set(colors.map((color) => color.id));
    this.colors.update((rows) =>
      rows.map((row) => {
        if (!savedIds.has(row.id)) {
          return row;
        }
        const saved = colors.find((color) => color.id === row.id) ?? row;
        const stock = Math.max(0, Math.trunc(Number(saved.stock) || 0));
        return {
          ...row,
          stock,
          isExists: true,
          variantAttached: true,
        };
      }),
    );

    for (const color of colors) {
      const row = this.colors().find((item) => item.id === color.id);
      if (row) {
        this.initialColorSnapshots.set(color.id, this.captureColorSnapshot(row));
      }
      this.unmarkColorSelected(color.id);
    }

    this.bumpColorRevisionEpoch();
    this.refreshMasterStockFromServer();
  }

  private markColorsRemovedLocally(colors: ProductColorVariantRow[]): void {
    if (!colors.length) {
      return;
    }

    const removedIds = new Set(colors.map((color) => color.id));
    this.colors.update((rows) =>
      rows.map((row) => {
        if (!removedIds.has(row.id)) {
          return row;
        }
        return {
          ...row,
          stock: 0,
          isExists: false,
          variantAttached: false,
        };
      }),
    );

    for (const color of colors) {
      const row = this.colors().find((item) => item.id === color.id);
      if (row) {
        this.initialColorSnapshots.set(color.id, this.captureColorSnapshot(row));
      }
      this.unmarkColorSelected(color.id);
    }

    this.bumpColorRevisionEpoch();
    this.refreshMasterStockFromServer();
  }

  private patchColorRow(
    colorId: number,
    patch: Partial<ProductColorVariantRow>,
  ): void {
    this.colors.update((rows) =>
      rows.map((row) => (row.id === colorId ? { ...row, ...patch } : row)),
    );
  }

  private bumpColorRevisionEpoch(): void {
    this.colorRevisionEpoch.update((value) => value + 1);
  }

  private refreshMasterStockFromServer(): void {
    const sizeId = this.selectedSize()?.id;
    if (sizeId != null) {
      this.syncSizesProductSizeMeta(Number(sizeId));
    }
  }

  private reloadCurrentColors(): void {
    const size = this.selectedSize();
    if (size?.id != null) {
      this.loadColors(Number(size.id));
    }
  }

  private restoreSelectedSize(productId: number): void {
    const raw = localStorage.getItem(SELECTED_SIZE_KEY);
    if (!raw) {
      return;
    }

    let parsed: StoredSizeSelection;
    try {
      parsed = JSON.parse(raw) as StoredSizeSelection;
    } catch {
      localStorage.removeItem(SELECTED_SIZE_KEY);
      return;
    }

    if (parsed && Number(parsed.productId) === productId && parsed.id) {
      const selected: ProductColorSizeOption = {
        id: Number(parsed.id),
        productSizeId:
          parsed.productSizeId != null ? Number(parsed.productSizeId) : undefined,
        description: parsed.description ?? '',
        stock: Number(parsed.stock) || 0,
      };
      this.selectedSize.set(selected);
      this.catalogSelectedSizeId = selected.id;
      this.bumpPanelStockSourceEpoch();
      this.loadColors(selected.id);
    } else {
      localStorage.removeItem(SELECTED_SIZE_KEY);
    }
  }

  private pinSelectedSizeToOptions(): void {
    const current = this.selectedSize();
    if (!current?.id) {
      return;
    }

    const row = this.sizes().find((size) => Number(size.id) === Number(current.id));
    if (!row) {
      return;
    }

    row.productSizeId = row.productSizeId ?? current.productSizeId;
    this.selectedSize.set(row);
    this.persistSelectedSizeSnapshot();
    this.bumpPanelStockSourceEpoch();
  }

  private syncSizesProductSizeMeta(sizeId: number): void {
    const productId = this.productId();
    if (!productId) {
      return;
    }

    const sid = Number(sizeId);
    if (
      this.catalogSelectedSizeId !== sid ||
      !this.selectedSize() ||
      Number(this.selectedSize()?.id) !== sid
    ) {
      return;
    }

    this.colorsService
      .getSizes(productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sizesList) => {
          if (
            sid !== this.catalogSelectedSizeId ||
            Number(this.selectedSize()?.id) !== sid
          ) {
            return;
          }

          this.sizes.set(sizesList);
          const row = sizesList.find((size) => Number(size.id) === sid);
          if (!row) {
            this.pinSelectedSizeToOptions();
            return;
          }

          const apiMaster =
            row.stock != null && !Number.isNaN(Number(row.stock))
              ? Math.max(0, Math.trunc(Number(row.stock)))
              : null;

          if (apiMaster !== null) {
            row.stock = apiMaster;
          }

          row.productSizeId = row.productSizeId ?? this.selectedSize()?.productSizeId;
          this.selectedSize.set(row);
          this.persistSelectedSizeSnapshot();
          this.bumpPanelStockSourceEpoch();
        },
      });
  }

  private persistSelectedSizeSnapshot(): void {
    const size = this.selectedSize();
    const productId = this.productId();
    if (!size || !productId) {
      return;
    }

    const payload: StoredSizeSelection = {
      ...size,
      productId,
    };
    localStorage.setItem(SELECTED_SIZE_KEY, JSON.stringify(payload));
  }

  private clearSizeSelection(): void {
    this.catalogSelectedSizeId = null;
    this.catalogColorsPending.set(false);
    this.selectedSize.set(null);
    this.colors.set([]);
    this.clearColorSelection();
    localStorage.removeItem(SELECTED_SIZE_KEY);
    this.bumpPanelStockSourceEpoch();
  }

  private detachVariantWithApi(color: ProductColorVariantRow): void {
    const psId = color.productSizeId;
    if (!psId) {
      this.finishConfirm();
      this.toastService.show('error', 'Falta el identificador de talla-producto.');
      return;
    }

    this.colorsService
      .remove(psId, color.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.finishConfirm();
          this.toastService.show('success', 'Variante de color eliminada.');
          this.markColorRemovedLocally(color);
        },
        error: () => {
          this.finishConfirm();
          this.toastService.show('error', 'No se pudo eliminar la variante.');
        },
      });
  }

  private executeBulkRemove(colors: ProductColorVariantRow[]): void {
    const toRemove = colors.filter((color) => color.productSizeId != null);
    const requests = toRemove.map((color) =>
      this.colorsService
        .remove(color.productSizeId as number, color.id)
        .pipe(catchError(() => of(null))),
    );

    concat(...requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        complete: () => {
          this.finishConfirm();
          this.toastService.show('success', 'Colores removidos.');
          this.markColorsRemovedLocally(toRemove);
        },
        error: () => {
          this.finishConfirm();
          this.toastService.show('error', 'No se pudieron remover todos los colores.');
        },
      });
  }

  private focusColorInTable(color: ProductColorVariantRow): void {
    if (this.filterStatus() !== 'all') {
      this.filterStatus.set('all');
    }
    this.scrollToColorRow(color);
    this.resetColorJumpSearch();
  }

  private scrollToColorRow(color: ProductColorVariantRow): void {
    this.highlightedColorId.set(color.id);
    setTimeout(() => {
      document.getElementById(`color-row-${color.id}`)?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }, 60);
    setTimeout(() => {
      if (this.highlightedColorId() === color.id) {
        this.highlightedColorId.set(null);
      }
    }, 2500);
  }

  private resetColorJumpSearch(): void {
    this.colorJumpSearch.set('');
    this.colorJumpOpen.set(false);
    queueMicrotask(() => this.colorJumpInputRef()?.nativeElement.focus());
  }

  private bumpPanelStockSourceEpoch(): void {
    this.panelStockSourceEpoch.update((value) => value + 1);
  }
}
